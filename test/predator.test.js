// @vitest-environment jsdom
// The predators (predator.js): Amy's roundworm and Pam's Cyclops, drawn,
// placed, swimming after their prey, staying in the water, and stopping to
// digest.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PREDATOR, PREDATORS, SPECIES } from '../public/game/config.js';
import { KINDS, makePredator, predatorDrawing, predatorsAround, preyFor } from '../public/game/predator.js';

let water;
beforeEach(() => {
  document.body.innerHTML = '<div class="water"></div>';
  water = document.querySelector('.water');
});

const still = () => 0.5; // no weaving: (0.5 - 0.5) * 6 = 0

describe('the Cyclops drawing', () => {
  it('has one red eye, feelers that sway, and is hidden from screen readers', () => {
    const svg = predatorDrawing('cyclops');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('.cyclops-face circle[fill="#dc2626"]')).toHaveLength(1);
    expect(svg.querySelector('.antennae')).not.toBeNull();
  });
});

describe('a Cyclops', () => {
  it('is placed where it is in the water, turned to face the way it swims', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0.5, fy: -0.5, heading: 0, random: still });
    expect(cyclops.el.parentElement).toBe(water);
    expect(cyclops.el.style.left).toBe('75%');
    expect(cyclops.el.style.top).toBe('25%');
    // Drawn head up, so facing right (0) is a quarter turn.
    expect(cyclops.el.style.getPropertyValue('--turn')).toBe('90deg');
    expect(cyclops.el.style.width).toBe(`${PREDATORS.cyclops.size}%`);
    expect(cyclops.el.classList).toEqual(expect.objectContaining({ value: 'predator cyclops' }));
  });

  it('has its head in front and its body behind, and its head is the biggest part', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0, random: still });
    const [head, body] = cyclops.body();
    expect(head[0]).toBeGreaterThan(0);
    expect(body[0]).toBeLessThan(head[0]);
    expect(head[2]).toBeGreaterThan(body[2]);
    expect(cyclops.head()).toEqual(head);
  });

  it('is bigger than Pam, whose predator it is', () => {
    expect(SPECIES.pam.predator).toBe('cyclops');
    // 1.4 times as long as it is wide; Pam is drawn `size` wide.
    expect(PREDATORS.cyclops.size * 1.4).toBeGreaterThan(SPECIES.pam.size);
  });

  it('speeds up and eases off smoothly through each stroke, averaging its usual speed', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0, random: () => 0 });
    const paces = [];
    for (let i = 0; i < 100; i++) {
      cyclops.stroke = i / 100;
      paces.push(cyclops.pace());
    }
    expect(Math.max(...paces)).toBeCloseTo(1 + PREDATORS.cyclops.surge);
    expect(Math.min(...paces)).toBeCloseTo(1 - PREDATORS.cyclops.surge);
    expect(Math.min(...paces)).toBeGreaterThan(0); // never stops dead
    expect(paces.reduce((a, b) => a + b) / paces.length).toBeCloseTo(1);
    // No sudden jumps: from one moment of a stroke to the next, the speed
    // barely changes.
    for (let i = 1; i < paces.length; i++) expect(Math.abs(paces[i] - paces[i - 1])).toBeLessThan(0.02);
  });

  it('swims toward its prey', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: -0.5, fy: 0, heading: 0, random: still });
    cyclops.step(0.05, { fx: 0.5, fy: 0 });
    expect(cyclops.fx).toBeGreaterThan(-0.5);
    expect(cyclops.fy).toBeCloseTo(0);
  });

  it("can't turn on the spot: it turns the short way, only so fast", () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0, random: still });
    cyclops.step(0.1, { fx: 0, fy: -0.5 }); // a quarter turn to the left
    expect(cyclops.heading).toBeCloseTo(-PREDATORS.cyclops.turn * 0.1);
  });

  it('weaves a little, but never far off course', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0, random: () => 1 });
    for (let i = 0; i < 100; i++) cyclops.step(0.05, { fx: 0.5, fy: 0 });
    expect(cyclops.wander).toBe(PREDATOR.WANDER);
  });

  it('drifts on its way with nothing to chase, and heads back in from the edge', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0, random: still });
    cyclops.step(0.1, null);
    expect(cyclops.heading).toBe(0);
    expect(cyclops.fx).toBeGreaterThan(0);
    const edge = makePredator(water, { kind: 'cyclops', fx: PREDATOR.EDGE, fy: 0, heading: 0, random: still });
    edge.step(0.1, null);
    expect(Math.abs(edge.heading)).toBeCloseTo(PREDATORS.cyclops.turn * 0.1, 5); // turning back toward the middle
  });

  it('stays in the water', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: PREDATOR.EDGE, fy: 0, heading: 0, random: still });
    cyclops.step(0.05, { fx: 2, fy: 0 });
    expect(Math.hypot(cyclops.fx, cyclops.fy)).toBeCloseTo(PREDATOR.EDGE);
  });

  it('stops to digest after eating, then swims on', () => {
    const cyclops = makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0, random: still });
    cyclops.eat();
    expect(cyclops.full).toBe(PREDATOR.FULL_MS);
    expect(cyclops.el.classList).toContain('full');
    cyclops.step(1, { fx: 0.5, fy: 0 });
    expect(cyclops.fx).toBe(0);
    cyclops.step(PREDATOR.FULL_MS / 1000, { fx: 0.5, fy: 0 });
    expect(cyclops.el.classList).not.toContain('full');
    cyclops.step(0.05, { fx: 0.5, fy: 0 });
    expect(cyclops.fx).toBeGreaterThan(0);
  });
});

describe('the predators on a level', () => {
  it('start spread evenly around the edge, facing in', () => {
    const hunters = predatorsAround(water, 'cyclops', 3, () => 0);
    expect(hunters).toHaveLength(3);
    expect(water.querySelectorAll('.predator.cyclops')).toHaveLength(3);
    for (const [i, cyclops] of hunters.entries()) {
      const angle = (2 * Math.PI * i) / 3;
      expect(cyclops.fx).toBeCloseTo(PREDATOR.EDGE * Math.cos(angle));
      expect(cyclops.fy).toBeCloseTo(PREDATOR.EDGE * Math.sin(angle));
      expect(cyclops.heading).toBeCloseTo(angle + Math.PI);
    }
  });

  it('use their own random numbers unless given some', () => {
    expect(predatorsAround(water, 'roundworm', 1)).toHaveLength(1);
    expect(makePredator(water, { kind: 'cyclops', fx: 0, fy: 0, heading: 0 }).stroke).toBeLessThan(1);
  });
});

describe('what a predator goes after', () => {
  const amy = { fx: 0, fy: 0 };

  it('goes after Amy when she comes close', () => {
    expect(preyFor(PREDATOR.NOTICE - 0.01, 0, [{ fx: PREDATOR.NOTICE, fy: 0 }], amy)).toBe(amy);
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

describe("the roundworm, Amy's predator", () => {
  afterEach(() => {
    delete window.matchMedia;
  });

  it("is Amy's, called a predatory roundworm, not any one species", () => {
    expect(SPECIES.amy.predator).toBe('roundworm');
    expect(PREDATORS.roundworm.name).toBe('predatory roundworm');
    expect(KINDS.roundworm.caught('Amy')).toBe('A predatory roundworm caught Amy! Some small roundworms eat amoebae like Amy.');
  });

  it('is a slender worm, tapered at both ends, with a wave running down it', () => {
    const svg = predatorDrawing('roundworm');
    expect(svg.getAttribute('viewBox')).toBe('0 0 40 160');
    expect(svg.querySelector('.worm-body')).not.toBeNull();
    // Its body and gut both wave.
    expect(svg.querySelectorAll('animate')).toHaveLength(2);
    // Narrow at its ends, widest in its middle.
    const widths = KINDS.roundworm.outline.map(([, r]) => r);
    expect(Math.max(...widths)).toBe(widths[Math.floor(widths.length / 2)]);
    expect(widths[0]).toBeLessThan(Math.max(...widths));
    expect(widths.at(-1)).toBeLessThan(Math.max(...widths));
  });

  it('keeps still for anyone who has asked for less motion', () => {
    window.matchMedia = (query) => ({ matches: query === '(prefers-reduced-motion: reduce)' });
    expect(predatorDrawing('roundworm').querySelectorAll('animate, animateTransform')).toHaveLength(0);
  });

  it('bends in an S all along its body, its face riding along with its head', () => {
    const svg = predatorDrawing('roundworm');
    expect(svg.querySelector('.predator-face animateTransform')).not.toBeNull();
    // Its middle line, at the start of a swim: one full S from head to tail,
    // so it's bent one way near its head and the other way near its tail.
    const gut = svg.querySelector('.worm-gut').getAttribute('d').slice(1).split(' L').map((p) => p.split(' ').map(Number));
    const xs = gut.map(([x]) => x - 20);
    expect(Math.min(...xs)).toBeLessThan(-2);
    expect(Math.max(...xs)).toBeGreaterThan(2);
  });

  it('glides at a steady pace and turns gently, unlike the Cyclops', () => {
    const worm = makePredator(water, { kind: 'roundworm', fx: 0, fy: 0, heading: 0, random: still });
    for (const stroke of [0, 0.25, 0.5, 0.75]) {
      worm.stroke = stroke;
      expect(worm.pace()).toBe(1);
    }
    expect(PREDATORS.roundworm.turn).toBeLessThan(PREDATORS.cyclops.turn);
    worm.step(0.1, { fx: 0, fy: -0.5 });
    expect(worm.heading).toBeCloseTo(-PREDATORS.roundworm.turn * 0.1);
  });

  it('is about twice as long as Amy is wide, as a real one would be', () => {
    const length = PREDATORS.roundworm.size * 4;
    expect(length / SPECIES.amy.size).toBeGreaterThanOrEqual(2);
    expect(length / SPECIES.amy.size).toBeLessThanOrEqual(4);
  });

  it('is longer than Amy is wide, head to tail', () => {
    expect(PREDATORS.roundworm.size * 4).toBeGreaterThan(SPECIES.amy.size);
  });

  it('catches on contact all along it, head first', () => {
    const worm = makePredator(water, { kind: 'roundworm', fx: 0, fy: 0, heading: 0, random: still });
    const body = worm.body();
    expect(body.length).toBeGreaterThan(3);
    expect(worm.head()).toEqual(body[0]);
    // Head first, then on down its length.
    for (let i = 1; i < body.length; i++) expect(body[i][0]).toBeLessThan(body[i - 1][0]);
    // From head to tail, about as long as it's drawn.
    const drawnLength = (PREDATORS.roundworm.size / 100) * 2 * 4; // 4 times as long as wide, as a fraction of the radius
    expect(body[0][0] - body.at(-1)[0]).toBeGreaterThan(drawnLength * 0.7);
  });

  it('stops waving while it digests, and starts again after', () => {
    const worm = makePredator(water, { kind: 'roundworm', fx: 0, fy: 0, heading: 0, random: still });
    const svg = worm.el.querySelector('svg');
    let paused = false;
    svg.pauseAnimations = () => { paused = true; };
    svg.unpauseAnimations = () => { paused = false; };
    worm.eat();
    expect(paused).toBe(true);
    worm.step(PREDATOR.FULL_MS / 1000, null);
    expect(paused).toBe(false);
  });
});
