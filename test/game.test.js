// @vitest-environment jsdom
// game.js runs a level in the puddle: steer, grow the colony, keep away from
// her predator, and show the level-complete, win or game-over pop-up. These
// tests load the real puddle page into jsdom and stand in for the colony,
// the predators and steering, so each test can say exactly what happens
// ("Amy ate 20 bacteria", "a roundworm touched Amy") and then check what the
// player sees.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME, LEVELS, PREDATOR, SPECIES } from '../public/game/config.js';

const fake = vi.hoisted(() => ({ colony: null, hunters: [] }));

vi.mock('../public/game/colony.js', () => ({
  makeColony: vi.fn((options) => {
    fake.options = options;
    return fake.colony;
  }),
  moveGroups: vi.fn(),
}));
vi.mock('../public/game/cell.js', () => ({ cellGroup: vi.fn(() => fake.leader) }));
vi.mock('../public/game/predator.js', async (importActual) => ({
  ...(await importActual()),
  predatorsAround: vi.fn(() => fake.hunters),
}));
vi.mock('../public/game/celebrate.js', () => ({ celebrate: vi.fn() }));
vi.mock('../public/game/keyboard.js', () => ({
  arrowKeys: vi.fn(() => ({ direction: () => [0, 0], stop: vi.fn() })),
}));
vi.mock('../public/game/touch.js', () => ({
  steer: vi.fn(),
  touchSteering: vi.fn(() => ({ target: () => null, drag: () => [0, 0], stop: vi.fn() })),
}));

const { playPuddle, touching } = await import('../public/game/game.js');
const { predatorsAround } = await import('../public/game/predator.js');
const { steer } = await import('../public/game/touch.js');
const { celebrate } = await import('../public/game/celebrate.js');

const page = readFileSync(resolve(process.cwd(), 'public/puddle.html'), 'utf8');
const body = page.slice(page.indexOf('<body'), page.indexOf('</body>'));

let frames;
let now;
let location;
let food;

// A stand-in colony whose cell count each test sets.
function makeFakeColony() {
  let cells = 1;
  return {
    groups: [],
    sinceAnyDivision: Infinity,
    cellCount: () => cells,
    setCells(n) { cells = n; },
    tick: vi.fn(),
    eat: vi.fn(),
    divideLeader: vi.fn(),
    popTouching: vi.fn(() => 0),
  };
}

// A stand-in predator, far from your pal unless a test moves it.
function makeHunter() {
  return {
    fx: 0.8, fy: 0, full: 0,
    body: () => [[0.8, 0, 0.1]],
    head: () => [0.8, 0, 0.1],
    step: vi.fn(),
    eat: vi.fn(function eat() { this.full = 1000; }),
  };
}

function start({ level = 1, target, pal = 'amy' } = {}) {
  const svg = document.createElement('div');
  svg.dataset.pal = pal;
  svg.dataset.name = pal[0].toUpperCase() + pal.slice(1);
  playPuddle({ you: { svg, species: SPECIES[pal] }, food, level, target, random: () => 0 });
  return document.querySelector('.win-banner');
}

// Run the next animation frame, `ms` after the last one.
function frame(ms = 16) {
  now += ms;
  const waiting = frames;
  frames = [];
  for (const run of waiting) run(now);
}

// Run frames until `ms` have passed.
function run(ms) {
  for (let t = 0; t < ms; t += 50) frame(50);
}

beforeEach(() => {
  document.body.outerHTML = body;
  Object.defineProperty(document.querySelector('.water'), 'clientWidth', { value: 400 });
  frames = [];
  now = 0;
  // Fake timers first: they'd replace the stand-in requestAnimationFrame.
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (fn) => frames.push(fn));
  location = { href: 'http://localhost/puddle.html?pal=amy&level=1' };
  vi.stubGlobal('location', location);
  fake.colony = makeFakeColony();
  fake.leader = { x: 0, y: 0, body: () => [[0, 0, 20]] };
  fake.hunters = [makeHunter()];
  food = { stop: vi.fn() };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('touching', () => {
  it('is any circle of one touching any circle of the other', () => {
    expect(touching([[0, 0, 1]], [[1.5, 0, 1]])).toBe(true);
    expect(touching([[0, 0, 1]], [[2.5, 0, 1], [0, 3, 1]])).toBe(false);
  });
});

describe('a level', () => {
  it('counts the bacteria Amy eats herself toward the target, and keeps the how-to-play in step', () => {
    start({ level: 2 });
    const target = LEVELS[1].target;
    expect(document.querySelector('.cell-count').textContent).toBe(`Level 2 · 0 / ${target} bacteria`);
    expect(document.querySelector('.target-food').textContent).toBe(String(target));
    fake.options.onLeaderEat(1);
    fake.options.onLeaderEat(2);
    expect(document.querySelector('.cell-count').textContent).toBe(`Level 2 · 3 / ${target} bacteria`);
  });

  it("doesn't cap the colony, or count what her offspring eat", () => {
    start();
    expect(fake.options.target).toBeUndefined();
    expect(Object.keys(fake.options)).not.toContain('onDivide');
  });

  it('goes up 5 bacteria a level, like Phage Attack', () => {
    expect(LEVELS.map((level) => level.target)).toEqual([20, 25, 30, 35, 40]);
  });

  it('has one predator per level number', () => {
    expect(LEVELS.map((level) => level.predators)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it("puts the level's predators in the puddle: roundworms for Amy, Cyclopes for Pam", () => {
    start({ level: 3 });
    expect(predatorsAround).toHaveBeenLastCalledWith(document.querySelector('.water'), 'roundworm', LEVELS[2].predators, expect.any(Function));
    start({ level: 2, pal: 'pam' });
    expect(predatorsAround).toHaveBeenLastCalledWith(document.querySelector('.water'), 'cyclops', LEVELS[1].predators, expect.any(Function));
  });

  it('steers Amy, and divides her when she has eaten', () => {
    start();
    frame();
    expect(steer).toHaveBeenCalled();
    expect(fake.colony.eat).toHaveBeenCalled();
    expect(fake.colony.divideLeader).toHaveBeenCalled();
  });

  it('gives Amy a head start before the predators move', () => {
    start();
    run(PREDATOR.START_MS - 100);
    expect(fake.hunters[0].step).not.toHaveBeenCalled();
    run(200);
    expect(fake.hunters[0].step).toHaveBeenCalled();
  });
});

describe('winning', () => {
  it('shows level complete once the newest cell has settled, with a fact, and goes on to the next level', () => {
    const banner = start({ level: 1 });
    fake.colony.sinceAnyDivision = 0;
    fake.options.onLeaderEat(LEVELS[0].target);
    frame();
    expect(food.stop).toHaveBeenCalled();
    // A little burst of confetti from her right away.
    expect(celebrate).toHaveBeenCalledWith(document.querySelector('.pal-mover'), { big: false });
    expect(banner.hidden).toBe(true);
    vi.advanceTimersByTime(GAME.DIVIDE_MS);
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Level 1 complete!');
    expect(banner.querySelector('.win-message').textContent).toBe(`Amy ate ${LEVELS[0].target} bacteria!`);
    expect(banner.querySelector('.fun-fact').hidden).toBe(false);
    expect(banner.querySelector('.start-over').hidden).toBe(true);
    banner.querySelector('.play-again').click();
    expect(location.href).toBe('http://localhost/puddle.html?pal=amy&level=2');
  });

  it('says you won after the last level, and starts again from level 1', () => {
    const last = LEVELS.length;
    const banner = start({ level: last });
    fake.options.onLeaderEat(LEVELS[last - 1].target);
    frame();
    vi.advanceTimersByTime(GAME.DIVIDE_MS);
    expect(banner.querySelector('h2').textContent).toBe('You won!');
    expect(celebrate).toHaveBeenCalledWith(document.querySelector('.pal-mover'), { big: true });
    expect(banner.querySelector('.win-message').textContent).toBe(
      `You beat all ${last} levels! Amy ate ${LEVELS[last - 1].target} bacteria with the roundworms all around.`);
    expect(banner.querySelector('.play-again').textContent).toBe('Play again');
    banner.querySelector('.play-again').click();
    expect(location.href).toBe('http://localhost/puddle.html?pal=amy&level=1');
  });

  it('stops play, so nothing happens after winning', () => {
    start();
    fake.options.onLeaderEat(LEVELS[0].target);
    frame();
    fake.colony.eat.mockClear();
    run(PREDATOR.START_MS + 100);
    expect(fake.colony.eat).not.toHaveBeenCalled();
    expect(fake.hunters[0].step).not.toHaveBeenCalled();
  });
});

describe('the predator', () => {
  it('eats offspring its head touches, then stops to digest and leaves the rest alone for now', () => {
    start();
    fake.colony.popTouching.mockReturnValue(1);
    run(PREDATOR.START_MS + 50);
    expect(fake.colony.popTouching).toHaveBeenCalledTimes(1);
    expect(fake.colony.popTouching).toHaveBeenCalledWith([[160, 0, 20]]) // in px: the puddle is 400px across;
    expect(fake.hunters[0].eat).toHaveBeenCalledTimes(1);
    run(100);
    expect(fake.colony.popTouching).toHaveBeenCalledTimes(1);
  });

  it("goes after Amy's offspring when she's far away", () => {
    start();
    fake.colony.groups.push(fake.leader, { x: 200, y: 0 });
    run(PREDATOR.START_MS + 50);
    expect(fake.hunters[0].step).toHaveBeenCalledWith(expect.any(Number), { fx: 1, fy: 0 });
  });

  it("is game over when it catches Amy, saying how many offspring it ate first", () => {
    const banner = start({ level: 2 });
    fake.colony.popTouching.mockReturnValueOnce(2);
    run(PREDATOR.START_MS + 50);
    fake.hunters[0].body = () => [[0, 0, 0.1]];
    frame(50);
    expect(document.querySelector('.pal-mover').classList).toContain('killed');
    vi.advanceTimersByTime(500);
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Game over');
    expect(banner.querySelector('.win-message').textContent).toBe(
      'A predatory roundworm caught Amy! Some small roundworms eat amoebae like Amy. It ate 2 of her offspring first.');
    expect(banner.querySelector('.play-again').textContent).toBe('Try level 2 again');
    expect(banner.querySelector('.start-over').hidden).toBe(false);
    banner.querySelector('.play-again').click();
    expect(location.href).toBe('http://localhost/puddle.html?pal=amy&level=2');
    banner.querySelector('.start-over').click();
    expect(location.href).toBe('http://localhost/puddle.html?pal=amy&level=1');
  });

  it("doesn't offer to start over on level 1, where that would just try again", () => {
    const banner = start({ level: 1 });
    fake.hunters[0].body = () => [[0, 0, 0.1]];
    run(PREDATOR.START_MS + 50);
    vi.advanceTimersByTime(500);
    expect(banner.querySelector('.win-message').textContent).toBe(
      'A predatory roundworm caught Amy! Some small roundworms eat amoebae like Amy.');
    expect(banner.querySelector('.start-over').hidden).toBe(true);
  });

  it('says it was a predatory rotifer when one catches Grace', () => {
    const banner = start({ pal: 'grace' });
    fake.hunters[0].body = () => [[0, 0, 0.1]];
    run(PREDATOR.START_MS + 50);
    vi.advanceTimersByTime(500);
    expect(banner.querySelector('.win-message').textContent).toBe(
      "A predatory rotifer caught Grace! Rotifers like Asplanchna eat Euglena, though they can't live on Euglena alone.");
  });

  it("says it was a Cyclops when one catches Pam", () => {
    const banner = start({ pal: 'pam' });
    fake.hunters[0].body = () => [[0, 0, 0.1]];
    run(PREDATOR.START_MS + 50);
    vi.advanceTimersByTime(500);
    expect(banner.querySelector('.win-message').textContent).toBe(
      'A Cyclops caught Pam! These tiny one-eyed crustaceans hunt protists in ponds and puddles.');
  });
});

describe('the pop-up', () => {
  it('can go back to pick a pal', () => {
    const banner = start();
    banner.querySelector('.back-to-picker').click();
    expect(location.href).toBe('./pal-picker.html');
  });
});
