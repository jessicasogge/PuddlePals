// @vitest-environment jsdom
// The Cyclops (cyclops.js): drawn, placed, swimming after its prey, staying
// in the water, and stopping to digest.
import { beforeEach, describe, expect, it } from 'vitest';
import { CYCLOPS, SPECIES } from '../public/game/config.js';
import { cyclopsAround, cyclopsDrawing, makeCyclops, preyFor } from '../public/game/cyclops.js';

let water;
beforeEach(() => {
  document.body.innerHTML = '<div class="water"></div>';
  water = document.querySelector('.water');
});

const still = () => 0.5; // no weaving: (0.5 - 0.5) * 6 = 0

describe('its drawing', () => {
  it('has one red eye, feelers that sway, and is hidden from screen readers', () => {
    const svg = cyclopsDrawing();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('.cyclops-face circle[fill="#dc2626"]')).toHaveLength(1);
    expect(svg.querySelector('.antennae')).not.toBeNull();
  });
});

describe('a Cyclops', () => {
  it('is placed where it is in the water, turned to face the way it swims', () => {
    const cyclops = makeCyclops(water, { fx: 0.5, fy: -0.5, heading: 0, random: still });
    expect(cyclops.el.parentElement).toBe(water);
    expect(cyclops.el.style.left).toBe('75%');
    expect(cyclops.el.style.top).toBe('25%');
    // Drawn head up, so facing right (0) is a quarter turn.
    expect(cyclops.el.style.getPropertyValue('--turn')).toBe('90deg');
    expect(cyclops.el.style.width).toBe(`${CYCLOPS.SIZE}%`);
  });

  it('has its head in front and its body behind, and its head is the biggest part', () => {
    const cyclops = makeCyclops(water, { fx: 0, fy: 0, heading: 0, random: still });
    const [head, body] = cyclops.body();
    expect(head[0]).toBeGreaterThan(0);
    expect(body[0]).toBeLessThan(head[0]);
    expect(head[2]).toBeGreaterThan(body[2]);
    expect(cyclops.head()).toEqual(head);
  });

  it('is bigger than Amy, head to tail', () => {
    // Both are drawn SIZE wide; the Cyclops is 1.4 times as long again.
    expect(CYCLOPS.SIZE).toBeGreaterThan(SPECIES.amy.size);
  });

  it('speeds up and eases off smoothly through each stroke, averaging its usual speed', () => {
    const cyclops = makeCyclops(water, { fx: 0, fy: 0, heading: 0, random: () => 0 });
    const paces = [];
    for (let i = 0; i < 100; i++) {
      cyclops.stroke = i / 100;
      paces.push(cyclops.pace());
    }
    expect(Math.max(...paces)).toBeCloseTo(1 + CYCLOPS.SURGE);
    expect(Math.min(...paces)).toBeCloseTo(1 - CYCLOPS.SURGE);
    expect(Math.min(...paces)).toBeGreaterThan(0); // never stops dead
    expect(paces.reduce((a, b) => a + b) / paces.length).toBeCloseTo(1);
    // No sudden jumps: from one moment of a stroke to the next, the speed
    // barely changes.
    for (let i = 1; i < paces.length; i++) expect(Math.abs(paces[i] - paces[i - 1])).toBeLessThan(0.02);
  });

  it('swims toward its prey', () => {
    const cyclops = makeCyclops(water, { fx: -0.5, fy: 0, heading: 0, random: still });
    cyclops.step(0.05, { fx: 0.5, fy: 0 });
    expect(cyclops.fx).toBeGreaterThan(-0.5);
    expect(cyclops.fy).toBeCloseTo(0);
  });

  it("can't turn on the spot: it turns the short way, only so fast", () => {
    const cyclops = makeCyclops(water, { fx: 0, fy: 0, heading: 0, random: still });
    cyclops.step(0.1, { fx: 0, fy: -0.5 }); // a quarter turn to the left
    expect(cyclops.heading).toBeCloseTo(-CYCLOPS.TURN * 0.1);
  });

  it('weaves a little, but never far off course', () => {
    const cyclops = makeCyclops(water, { fx: 0, fy: 0, heading: 0, random: () => 1 });
    for (let i = 0; i < 100; i++) cyclops.step(0.05, { fx: 0.5, fy: 0 });
    expect(cyclops.wander).toBe(CYCLOPS.WANDER);
  });

  it('drifts on its way with nothing to chase, and heads back in from the edge', () => {
    const cyclops = makeCyclops(water, { fx: 0, fy: 0, heading: 0, random: still });
    cyclops.step(0.1, null);
    expect(cyclops.heading).toBe(0);
    expect(cyclops.fx).toBeGreaterThan(0);
    const edge = makeCyclops(water, { fx: CYCLOPS.EDGE, fy: 0, heading: 0, random: still });
    edge.step(0.1, null);
    expect(Math.abs(edge.heading)).toBeCloseTo(CYCLOPS.TURN * 0.1, 5); // turning back toward the middle
  });

  it('stays in the water', () => {
    const cyclops = makeCyclops(water, { fx: CYCLOPS.EDGE, fy: 0, heading: 0, random: still });
    cyclops.step(0.05, { fx: 2, fy: 0 });
    expect(Math.hypot(cyclops.fx, cyclops.fy)).toBeCloseTo(CYCLOPS.EDGE);
  });

  it('stops to digest after eating, then swims on', () => {
    const cyclops = makeCyclops(water, { fx: 0, fy: 0, heading: 0, random: still });
    cyclops.eat();
    expect(cyclops.full).toBe(CYCLOPS.FULL_MS);
    expect(cyclops.el.classList).toContain('full');
    cyclops.step(1, { fx: 0.5, fy: 0 });
    expect(cyclops.fx).toBe(0);
    cyclops.step(CYCLOPS.FULL_MS / 1000, { fx: 0.5, fy: 0 });
    expect(cyclops.el.classList).not.toContain('full');
    cyclops.step(0.05, { fx: 0.5, fy: 0 });
    expect(cyclops.fx).toBeGreaterThan(0);
  });
});

describe('the Cyclopes on a level', () => {
  it('start spread evenly around the edge, facing in', () => {
    const hunters = cyclopsAround(water, 3, () => 0);
    expect(hunters).toHaveLength(3);
    expect(water.querySelectorAll('.cyclops')).toHaveLength(3);
    for (const [i, cyclops] of hunters.entries()) {
      const angle = (2 * Math.PI * i) / 3;
      expect(cyclops.fx).toBeCloseTo(CYCLOPS.EDGE * Math.cos(angle));
      expect(cyclops.fy).toBeCloseTo(CYCLOPS.EDGE * Math.sin(angle));
      expect(cyclops.heading).toBeCloseTo(angle + Math.PI);
    }
  });

  it('use their own random numbers unless given some', () => {
    expect(cyclopsAround(water, 1)).toHaveLength(1);
    expect(makeCyclops(water, { fx: 0, fy: 0, heading: 0 }).stroke).toBeLessThan(1);
  });
});

describe('what a Cyclops goes after', () => {
  const amy = { fx: 0, fy: 0 };

  it('goes after Amy when she comes close', () => {
    expect(preyFor(CYCLOPS.NOTICE - 0.01, 0, [{ fx: CYCLOPS.NOTICE, fy: 0 }], amy)).toBe(amy);
  });

  it('otherwise goes after the nearest of her offspring', () => {
    const near = { fx: 0.7, fy: 0 };
    const far = { fx: -0.7, fy: 0 };
    expect(preyFor(0.8, 0, [far, near], amy)).toBe(near);
  });

  it('drifts around when Amy is far off and there are no offspring', () => {
    expect(preyFor(0.8, 0, [], amy)).toBeNull();
  });
});
