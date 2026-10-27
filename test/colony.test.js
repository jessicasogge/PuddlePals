// @vitest-environment jsdom
// A colony (colony.js): Amy and the offspring she grows, eating bacteria,
// dividing, being eaten by the Cyclops, and moving in the puddle.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cellGroup } from '../public/game/cell.js';
import { makeColony, moveGroups, showPop } from '../public/game/colony.js';
import { GAME, SPECIES } from '../public/game/config.js';
import { palById, puddlePal } from '../public/game/pals.js';
import { fakeLayout, RADIUS } from './helpers/layout.js';

let restore;
beforeEach(() => {
  restore = fakeLayout();
});
afterEach(() => {
  restore();
  vi.useRealTimers();
});

const water = () => document.querySelector('.water');

function leader() {
  const mover = document.createElement('div');
  mover.className = 'pal-mover player';
  const svg = puddlePal(palById('amy'));
  mover.append(svg);
  water().append(mover);
  const cell = cellGroup({ mover, svg, species: SPECIES.amy, isPlayer: true });
  cell.update(0);
  return cell;
}

// Food that's eaten wherever `full` says (a set of groups' x positions),
// one bacterium per touch.
function food(meals = () => 0) {
  return { eatNear: vi.fn(meals), stop: vi.fn() };
}

function colony({ target = 100, meals, ...options } = {}) {
  return makeColony({ leader: leader(), food: food(meals), puddleRadius: () => RADIUS, target, color: '#6d28d9', ...options });
}

describe('Amy dividing', () => {
  it("doesn't divide until she's eaten, and the game says when", () => {
    const c = colony();
    c.divideLeader();
    expect(c.cellCount()).toBe(1);
  });

  it('divides once she has eaten, and adds the new cell sized and placed right away', () => {
    const onDivide = vi.fn();
    let fed = false;
    const c = colony({ meals: () => (fed ? 0 : ((fed = true), 1)), onDivide });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    expect(c.cellCount()).toBe(2);
    expect(onDivide).toHaveBeenCalledTimes(1);
    const child = c.groups[1];
    expect(child.mover.style.width).toBe(`${SPECIES.amy.size}%`);
    expect(child.mover.style.transform).toMatch(/^translate/);
    expect(c.sinceAnyDivision).toBe(0);
  });

  it('waits between divisions, however much she eats', () => {
    const c = colony({ meals: () => 1 });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    c.groups[1].body = () => []; // keep her offspring out of it
    c.eat(0.016, RADIUS);
    c.divideLeader();
    expect(c.cellCount()).toBe(2);
    c.tick(GAME.DIVIDE_MS / 1000 + 0.01);
    c.divideLeader();
    expect(c.cellCount()).toBe(3);
  });
});

describe('telling the game what Amy ate', () => {
  it("passes on just the bacteria she eats herself, not her offspring's", () => {
    const onLeaderEat = vi.fn();
    const c = colony({ meals: () => 1, onLeaderEat });
    c.eat(0.016, RADIUS);
    const herBody = SPECIES.amy.body.length;
    expect(onLeaderEat).toHaveBeenCalledTimes(herBody);
    c.divideLeader();
    c.leader.body = () => [];
    c.eat(0.016, RADIUS); // only her offspring eats now
    expect(onLeaderEat).toHaveBeenCalledTimes(herBody);
  });

  it("doesn't need to be told", () => {
    const c = colony({ meals: () => 1 });
    expect(() => c.eat(0.016, RADIUS)).not.toThrow();
  });

  it('has no cap on the colony unless given one', () => {
    const c = makeColony({ leader: leader(), food: food(() => 1), puddleRadius: () => RADIUS });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    c.leader.body = () => [];
    for (let i = 0; i < 5; i++) c.eat(1, RADIUS);
    expect(c.cellCount()).toBeGreaterThan(5);
  });
});

describe('offspring', () => {
  it('divide on their own when they eat, and wait between divisions too', () => {
    const c = colony({ meals: () => 1 });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    const child = c.groups[1];
    // Only this offspring eats from now on.
    c.leader.body = () => [];
    c.eat(0.016, RADIUS);
    expect(c.cellCount()).toBe(3);
    c.groups[2].body = () => [];
    c.eat(0.016, RADIUS);
    expect(c.cellCount()).toBe(3); // too soon
    c.eat(GAME.DIVIDE_MS / 1000, RADIUS);
    expect(c.cellCount()).toBe(4);
    expect(child.sinceDivision).toBe(0);
  });

  it('stop dividing once the colony is big enough', () => {
    const c = colony({ target: 2, meals: () => 1 });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    c.leader.body = () => [];
    c.eat(1, RADIUS);
    c.eat(1, RADIUS);
    expect(c.cellCount()).toBe(2);
  });
});

describe('being eaten', () => {
  function withOffspring() {
    const onPop = vi.fn();
    const c = colony({ meals: () => 1, onPop });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    const child = c.groups[1];
    child.x = 100;
    child.y = 0;
    return { c, child, onPop };
  }

  it('pops an offspring a Cyclops head touches, takes it out of the puddle, and says how many', () => {
    const { c, child, onPop } = withOffspring();
    expect(c.popTouching([[100, 0, 5]])).toBe(1);
    expect(c.cellCount()).toBe(1);
    expect(child.mover.isConnected).toBe(false);
    expect(onPop).toHaveBeenCalledWith(1);
    const ring = water().querySelector('.pop');
    expect(ring.style.borderColor).toBe('rgb(109, 40, 217)');
  });

  it("doesn't need to be told about it", () => {
    const c = colony({ meals: () => 1 });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    Object.assign(c.groups[1], { x: 100, y: 0 });
    expect(c.popTouching([[100, 0, 5]])).toBe(1);
  });

  it('leaves offspring that are out of reach alone, and never pops Amy herself', () => {
    const { c, onPop } = withOffspring();
    expect(c.popTouching([[-150, 150, 5], [0, 0, 50]])).toBe(0);
    expect(c.cellCount()).toBe(2);
    expect(onPop).not.toHaveBeenCalled();
  });
});

describe('the pop ring', () => {
  it('sits where the cell was, as wide as the cell, and is gone when its animation ends', () => {
    showPop(water(), [10, -20, 15], '#6d28d9');
    const ring = water().querySelector('.pop');
    expect(ring.style.left).toBe('calc(50% + 10px)');
    expect(ring.style.width).toBe('30px');
    ring.dispatchEvent(new Event('animationend'));
    expect(ring.isConnected).toBe(false);
  });

  it("is gone after a second even if the animation never runs", () => {
    vi.useFakeTimers();
    showPop(water(), [0, 0, 5], '#000');
    vi.advanceTimersByTime(1000);
    expect(water().querySelector('.pop')).toBeNull();
  });

  it('does nothing if the cell had already left the puddle', () => {
    expect(() => showPop(null, [0, 0, 5], '#000')).not.toThrow();
  });
});

describe('moving the groups', () => {
  function grown() {
    const c = colony({ meals: () => 1 });
    c.eat(0.016, RADIUS);
    c.divideLeader();
    return c;
  }

  it('keeps Amy in the water', () => {
    const c = grown();
    c.leader.x = 1000;
    moveGroups(c.groups, { water: water(), radius: RADIUS, seconds: 0.016 });
    expect(Math.hypot(c.leader.x, c.leader.y) + c.leader.reach()).toBeLessThanOrEqual(RADIUS + 0.001);
  });

  it('pulls an offspring that pokes past the edge back in, and stops it sliding on through', () => {
    const c = grown();
    const child = c.groups[1];
    child.x = RADIUS;
    child.y = 0;
    child.vx = 50;
    child.vy = 0;
    moveGroups(c.groups, { water: water(), radius: RADIUS, seconds: 0.016 });
    for (const [x, y, r] of child.body()) expect(Math.hypot(x, y) + r).toBeLessThanOrEqual(RADIUS + 0.5);
    expect(Math.abs(child.vx)).toBeLessThan(1); // no longer sliding outward
  });

  it('leaves an offspring alone when it is well inside', () => {
    const c = grown();
    const child = c.groups[1];
    Object.assign(child, { x: 0, y: 60, vx: 0, vy: 0, age: 10 });
    moveGroups(c.groups, { water: water(), radius: RADIUS, seconds: 0.016 });
    expect([child.x, child.y]).toEqual([0, 60]);
  });

  it('keeps everyone in the same place in the puddle when it changes size', () => {
    const c = grown();
    const child = c.groups[1];
    Object.assign(child, { x: 50, y: 20, vx: 4, vy: 0, age: 10 });
    moveGroups(c.groups, { water: water(), radius: RADIUS, seconds: 0 });
    moveGroups(c.groups, { water: water(), radius: RADIUS * 2, seconds: 0 });
    expect([child.x, child.y]).toEqual([100, 40]);
    expect(child.vx).toBe(8);
  });

  it("doesn't scale anything while the puddle has no size yet", () => {
    const c = grown();
    c.leader.x = 5;
    moveGroups(c.groups, { water: water(), radius: 0, seconds: 0 });
    expect(c.leader.puddleRadius).toBeUndefined();
  });
});
