// @vitest-environment jsdom
// The bacteria Amy eats (bacteria.js), scattered through a simulated puddle.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLORS, MIN_GAP, RESPAWN_MS, scatterBacteria } from '../public/game/bacteria.js';

const water = () => document.querySelector('.water');
const shown = () => [...water().querySelectorAll('.bacterium:not(.eaten)')];

beforeEach(() => {
  document.body.innerHTML = '<div class="water"></div>';
});
afterEach(() => vi.useRealTimers());

describe('the bacteria', () => {
  it('scatters as many as asked, clear of Amy in the middle, away from the edge and each other', () => {
    const food = scatterBacteria({ count: 12 });
    const spots = food.positions();
    expect(spots).toHaveLength(12);
    expect(shown()).toHaveLength(12);
    for (const [i, { fx, fy }] of spots.entries()) {
      expect(Math.hypot(fx, fy)).toBeGreaterThan(0.3);
      expect(Math.hypot(fx, fy)).toBeLessThanOrEqual(0.82);
      for (const other of spots.slice(i + 1)) expect(Math.hypot(fx - other.fx, fy - other.fy)).toBeGreaterThan(MIN_GAP);
    }
  });

  it('places each one where it is in the water, as a rod or a round cell in one of the colors', () => {
    scatterBacteria({ count: 30 });
    const kinds = new Set(shown().map((el) => el.classList[1]));
    expect(kinds).toEqual(new Set(['rod', 'coccus']));
    for (const el of shown()) {
      expect(COLORS).toContain(el.style.getPropertyValue('--color'));
      expect(el.style.left).toMatch(/%$/);
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it("skips any that won't fit in a crowded puddle", () => {
    expect(scatterBacteria({ count: 500 }).positions().length).toBeLessThan(500);
  });

  it('is eaten when touched, and only the ones touched', () => {
    const food = scatterBacteria({ count: 10 });
    const [first] = food.positions();
    expect(food.eatNear(first.fx, first.fy, 0.01)).toBe(1);
    expect(food.positions()).toHaveLength(9);
    expect(water().querySelectorAll('.bacterium.eaten')).toHaveLength(1);
    expect(food.eatNear(5, 5, 0.01)).toBe(0);
  });

  it('is gone once it has shrunk away', () => {
    const food = scatterBacteria({ count: 3 });
    const [first] = food.positions();
    food.eatNear(first.fx, first.fy, 0.01);
    const eaten = water().querySelector('.bacterium.eaten');
    eaten.dispatchEvent(new Event('transitionend'));
    expect(eaten.isConnected).toBe(false);
  });

  it('is replaced a few seconds later, away from where it was eaten', () => {
    vi.useFakeTimers();
    const food = scatterBacteria({ count: 10 });
    const [first] = food.positions();
    food.eatNear(first.fx, first.fy, 0.01);
    vi.advanceTimersByTime(RESPAWN_MS);
    expect(food.positions()).toHaveLength(10);
    const added = food.positions().at(-1);
    expect(Math.hypot(added.fx - first.fx, added.fy - first.fy)).toBeGreaterThan(0.3);
  });

  it('stops coming back once the game is over', () => {
    vi.useFakeTimers();
    const food = scatterBacteria({ count: 10 });
    const [first] = food.positions();
    food.eatNear(first.fx, first.fy, 0.01);
    food.stop();
    vi.advanceTimersByTime(RESPAWN_MS);
    expect(food.positions()).toHaveLength(9);
  });

  it('uses its own random numbers when given some', () => {
    let n = 0;
    const random = () => [0.1, 0.9, 0.3, 0.2, 0.7][n++ % 5];
    const food = scatterBacteria({ count: 1, random });
    expect(food.positions()).toHaveLength(1);
  });
});
