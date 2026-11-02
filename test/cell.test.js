// @vitest-environment jsdom
// A single cell, like Amy (cell.js): sized, placed, traced for touches, and
// splitting in two.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cellGroup } from '../public/game/cell.js';
import { GAME, SPECIES } from '../public/game/config.js';
import { palById, puddlePal } from '../public/game/pals.js';
import { fakeLayout, PUDDLE_WIDTH, RADIUS } from './helpers/layout.js';

let restore;
beforeEach(() => {
  restore = fakeLayout();
});
afterEach(() => {
  restore();
  vi.restoreAllMocks();
});

// Amy in the puddle, as the player (or not).
function amy(isPlayer = true) {
  const mover = document.createElement('div');
  mover.className = 'pal-mover';
  const svg = puddlePal(palById('amy'));
  mover.append(svg);
  document.querySelector('.water').append(mover);
  const cell = cellGroup({ mover, svg, species: SPECIES.amy, isPlayer });
  cell.update(0);
  return cell;
}

describe('a cell', () => {
  it('is one cell, drawn her size, reaching half her width', () => {
    const cell = amy();
    expect(cell.cellCount()).toBe(1);
    expect(cell.mover.style.width).toBe(`${SPECIES.amy.size}%`);
    expect(cell.reach()).toBeCloseTo((SPECIES.amy.size / 100) * PUDDLE_WIDTH / 2);
  });

  it('is drawn where she is, flipped to face the way she is going', () => {
    const cell = amy();
    cell.x = 12;
    cell.y = -5;
    cell.facing = -1;
    cell.place();
    expect(cell.mover.style.transform).toBe('translate(12px, -5px) scaleX(-1)');
  });

  it('traces her outline as circles where she is, mirrored when she faces left', () => {
    const cell = amy(false);
    cell.x = 100;
    const width = (SPECIES.amy.size / 100) * PUDDLE_WIDTH;
    const right = cell.body();
    expect(right).toHaveLength(SPECIES.amy.body.length);
    const [fx, fy, fr] = SPECIES.amy.body[2];
    expect(right[2][0]).toBeCloseTo(100 + fx * width);
    expect(right[2][1]).toBeCloseTo(fy * width);
    expect(right[2][2]).toBeCloseTo(fr * width);
    cell.facing = -1;
    expect(cell.body()[2][0]).toBeCloseTo(100 - fx * width);
  });

  it("traces the player through her idle animation (none here, so the same circles)", () => {
    // How the animation moves the circles is tested in mover.test.js.
    const player = amy(true);
    const offspring = amy(false);
    expect(player.body()).toEqual(offspring.body());
  });
});

describe('dividing', () => {
  it('makes a new offspring in the same spot, faceless and hidden from screen readers, sliding off the way she faces', () => {
    const cell = amy();
    cell.x = 30;
    cell.y = 20;
    cell.facing = -1;
    const child = cell.divide(RADIUS);
    expect([child.x, child.y, child.facing]).toEqual([30, 20, -1]);
    expect(child.isPlayer).toBe(false);
    expect(child.mover.classList).toContain('offspring');
    expect(child.svg.getAttribute('aria-hidden')).toBe('true');
    expect(child.vx).toBeCloseTo(-GAME.BURST_SPEED * RADIUS);
    expect(Math.abs(child.vy)).toBeLessThanOrEqual(0.2 * GAME.BURST_SPEED * RADIUS);
    expect(document.querySelectorAll('.water .pal-mover')).toHaveLength(2);
  });

  it("keeps her offspring still: Pam's beating cilia stop in her copies", () => {
    const mover = document.createElement('div');
    const svg = puddlePal(palById('pam'));
    mover.append(svg);
    document.querySelector('.water').append(mover);
    const pam = cellGroup({ mover, svg, species: SPECIES.pam, isPlayer: true });
    expect(svg.querySelectorAll('animate').length).toBeGreaterThan(0);
    const child = pam.divide(RADIUS);
    expect(child.svg.querySelectorAll('animate')).toHaveLength(0);
    expect(svg.querySelectorAll('animate').length).toBeGreaterThan(0); // hers keep going
  });

  it('leaves the player where she is', () => {
    const cell = amy();
    cell.divide(RADIUS);
    expect([cell.vx, cell.vy]).toEqual([0, 0]);
  });

  it('pushes an offspring that divides back the other way, and lets it settle again', () => {
    const parent = amy(false);
    parent.age = 5;
    const child = parent.divide(RADIUS);
    expect(parent.vx).toBeCloseTo(-child.vx);
    expect(parent.vy).toBeCloseTo(-child.vy);
    expect(parent.age).toBe(0);
    parent.coast(0.1);
    expect(parent.x).not.toBe(0);
  });
});
