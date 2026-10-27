// @vitest-environment jsdom
// game.js runs a level in the puddle: steer, grow the colony, keep away from
// the Cyclops, and show the level-complete, win or game-over pop-up. These
// tests load the real puddle page into jsdom and stand in for the colony,
// the Cyclopes and steering, so each test can say exactly what happens ("the
// colony reached 4 cells", "a Cyclops touched Amy") and then check what the
// player sees.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CYCLOPS, GAME, LEVELS, SPECIES } from '../public/game/config.js';

const fake = vi.hoisted(() => ({ colony: null, hunters: [] }));

vi.mock('../public/game/colony.js', () => ({
  makeColony: vi.fn((options) => {
    fake.options = options;
    return fake.colony;
  }),
  moveGroups: vi.fn(),
}));
vi.mock('../public/game/cell.js', () => ({ cellGroup: vi.fn(() => fake.leader) }));
vi.mock('../public/game/cyclops.js', async (importActual) => ({
  ...(await importActual()),
  cyclopsAround: vi.fn(() => fake.hunters),
}));
vi.mock('../public/game/keyboard.js', () => ({
  arrowKeys: vi.fn(() => ({ direction: () => [0, 0], stop: vi.fn() })),
}));
vi.mock('../public/game/touch.js', () => ({
  steer: vi.fn(),
  touchSteering: vi.fn(() => ({ target: () => null, drag: () => [0, 0], stop: vi.fn() })),
}));

const { playPuddle, touching } = await import('../public/game/game.js');
const { cyclopsAround } = await import('../public/game/cyclops.js');
const { steer } = await import('../public/game/touch.js');

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

// A stand-in Cyclops, far from Amy unless a test moves it.
function makeHunter() {
  return {
    fx: 0.8, fy: 0, full: 0,
    body: () => [[0.8, 0, 0.1]],
    head: () => [0.8, 0, 0.1],
    step: vi.fn(),
    eat: vi.fn(function eat() { this.full = 1000; }),
  };
}

function start({ level = 1, target } = {}) {
  const svg = document.createElement('div');
  svg.dataset.pal = 'amy';
  svg.dataset.name = 'Amy';
  playPuddle({ you: { svg, species: SPECIES.amy }, food, level, target, random: () => 0 });
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
  it('counts the amoebas toward the target, and keeps the how-to-play in step', () => {
    start({ level: 2 });
    expect(document.querySelector('.cell-count').textContent).toBe(`Level 2 · 1 / ${LEVELS[1].target} amoebas`);
    expect(document.querySelector('.target-cells').textContent).toBe(String(LEVELS[1].target));
    fake.colony.setCells(3);
    fake.options.onDivide();
    expect(document.querySelector('.cell-count').textContent).toBe(`Level 2 · 3 / ${LEVELS[1].target} amoebas`);
    fake.colony.setCells(2);
    fake.options.onPop(1);
    expect(document.querySelector('.cell-count').textContent).toBe(`Level 2 · 2 / ${LEVELS[1].target} amoebas`);
  });

  it('has one Cyclops per level number', () => {
    expect(LEVELS.map((level) => level.cyclops)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  it("puts the level's Cyclopes in the puddle", () => {
    start({ level: 3 });
    expect(cyclopsAround).toHaveBeenCalledWith(document.querySelector('.water'), LEVELS[2].cyclops, expect.any(Function));
  });

  it('steers Amy, and divides her when she has eaten', () => {
    start();
    frame();
    expect(steer).toHaveBeenCalled();
    expect(fake.colony.eat).toHaveBeenCalled();
    expect(fake.colony.divideLeader).toHaveBeenCalled();
  });

  it('gives Amy a head start before the Cyclopes move', () => {
    start();
    run(CYCLOPS.START_MS - 100);
    expect(fake.hunters[0].step).not.toHaveBeenCalled();
    run(200);
    expect(fake.hunters[0].step).toHaveBeenCalled();
  });
});

describe('winning', () => {
  it('shows level complete once the newest cell has settled, with a fact, and goes on to the next level', () => {
    const banner = start({ level: 1 });
    fake.colony.sinceAnyDivision = 0;
    fake.colony.setCells(LEVELS[0].target);
    frame();
    expect(food.stop).toHaveBeenCalled();
    expect(banner.hidden).toBe(true);
    vi.advanceTimersByTime(GAME.DIVIDE_MS);
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Level 1 complete!');
    expect(banner.querySelector('.win-message').textContent).toBe(`You grew a colony of ${LEVELS[0].target} amoebas!`);
    expect(banner.querySelector('.fun-fact').hidden).toBe(false);
    expect(banner.querySelector('.start-over').hidden).toBe(true);
    banner.querySelector('.play-again').click();
    expect(location.href).toBe('http://localhost/puddle.html?pal=amy&level=2');
  });

  it('says you won after the last level, and starts again from level 1', () => {
    const last = LEVELS.length;
    const banner = start({ level: last });
    fake.colony.setCells(LEVELS[last - 1].target);
    frame();
    vi.advanceTimersByTime(GAME.DIVIDE_MS);
    expect(banner.querySelector('h2').textContent).toBe('You won!');
    expect(banner.querySelector('.play-again').textContent).toBe('Play again');
    banner.querySelector('.play-again').click();
    expect(location.href).toBe('http://localhost/puddle.html?pal=amy&level=1');
  });

  it('stops play, so nothing happens after winning', () => {
    start();
    fake.colony.setCells(LEVELS[0].target);
    frame();
    fake.colony.eat.mockClear();
    run(CYCLOPS.START_MS + 100);
    expect(fake.colony.eat).not.toHaveBeenCalled();
    expect(fake.hunters[0].step).not.toHaveBeenCalled();
  });
});

describe('the Cyclops', () => {
  it('eats offspring its head touches, then stops to digest and leaves the rest alone for now', () => {
    start();
    fake.colony.popTouching.mockReturnValue(1);
    run(CYCLOPS.START_MS + 50);
    expect(fake.colony.popTouching).toHaveBeenCalledTimes(1);
    expect(fake.colony.popTouching).toHaveBeenCalledWith([[160, 0, 20]]) // in px: the puddle is 400px across;
    expect(fake.hunters[0].eat).toHaveBeenCalledTimes(1);
    run(100);
    expect(fake.colony.popTouching).toHaveBeenCalledTimes(1);
  });

  it("goes after Amy's offspring when she's far away", () => {
    start();
    fake.colony.groups.push(fake.leader, { x: 200, y: 0 });
    run(CYCLOPS.START_MS + 50);
    expect(fake.hunters[0].step).toHaveBeenCalledWith(expect.any(Number), { fx: 1, fy: 0 });
  });

  it("is game over when it catches Amy, saying how many offspring it ate first", () => {
    const banner = start({ level: 2 });
    fake.colony.popTouching.mockReturnValueOnce(2);
    run(CYCLOPS.START_MS + 50);
    fake.hunters[0].body = () => [[0, 0, 0.1]];
    frame(50);
    expect(document.querySelector('.pal-mover').classList).toContain('killed');
    vi.advanceTimersByTime(500);
    expect(banner.hidden).toBe(false);
    expect(banner.querySelector('h2').textContent).toBe('Game over');
    expect(banner.querySelector('.win-message').textContent).toBe(
      'A Cyclops caught Amy! These tiny one-eyed crustaceans hunt protists in ponds and puddles. It ate 2 of her offspring first.');
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
    run(CYCLOPS.START_MS + 50);
    vi.advanceTimersByTime(500);
    expect(banner.querySelector('.win-message').textContent).toBe(
      'A Cyclops caught Amy! These tiny one-eyed crustaceans hunt protists in ponds and puddles.');
    expect(banner.querySelector('.start-over').hidden).toBe(true);
  });
});

describe('the pop-up', () => {
  it('can go back to pick a pal', () => {
    const banner = start();
    banner.querySelector('.back-to-picker').click();
    expect(location.href).toBe('./pal-picker.html');
  });
});
