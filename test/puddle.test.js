// @vitest-environment jsdom
// puddle.js starts the game on the puddle page with the pal and level in its
// address. The game itself is a stand-in here (it's tested in game.test.js).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GAME, LEVELS } from '../public/game/config.js';

vi.mock('../public/game/game.js', () => ({ playPuddle: vi.fn() }));
const { playPuddle } = await import('../public/game/game.js');

const page = readFileSync(resolve(process.cwd(), 'public/puddle.html'), 'utf8');

async function open(search) {
  vi.stubGlobal('location', { search, href: `http://localhost/puddle.html${search}`, replace: vi.fn() });
  document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
  vi.resetModules();
  await import('../public/game/puddle.js');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('the puddle page', () => {
  it("shows the pal you picked, with her name in her color and her species, and starts level 1", async () => {
    await open('?pal=amy');
    const shown = [...document.querySelectorAll('.puddle-pal')].filter((svg) => !svg.hasAttribute('hidden'));
    expect(shown.map((svg) => svg.dataset.pal)).toEqual(['amy']);
    expect(document.title).toBe('PuddlePals | Amy | Level 1');
    expect(document.querySelector('.pal-name').textContent).toBe('Amy');
    expect(document.querySelector('.pal-name').style.color).toBe('rgb(109, 40, 217)');
    expect(document.querySelector('.species-name i').textContent).toBe('Amoeba proteus');
    expect(document.querySelector('.pal-named').textContent).toBe('Amy');
    expect(document.querySelectorAll('.bacterium')).toHaveLength(GAME.BACTERIA);
    expect(playPuddle).toHaveBeenCalledWith(expect.objectContaining({ level: 1 }));
    expect(playPuddle.mock.calls[0][0].you.svg.dataset.pal).toBe('amy');
    expect(document.querySelector('.loading-overlay').hidden).toBe(true);
  });

  it('starts the level in the address, kept between the first and the last', async () => {
    await open('?pal=amy&level=3');
    expect(playPuddle).toHaveBeenLastCalledWith(expect.objectContaining({ level: 3 }));
    await open('?pal=amy&level=99');
    expect(playPuddle).toHaveBeenLastCalledWith(expect.objectContaining({ level: LEVELS.length }));
    await open('?pal=amy&level=-2');
    expect(playPuddle).toHaveBeenLastCalledWith(expect.objectContaining({ level: 1 }));
    await open('?pal=amy&level=nope');
    expect(playPuddle).toHaveBeenLastCalledWith(expect.objectContaining({ level: 1 }));
  });

  it('sends you back to the picker without a pal it knows', async () => {
    for (const search of ['', '?pal=nobody', '?pal=amy"]']) {
      await open(search);
      expect(location.replace).toHaveBeenCalledWith('./pal-picker.html');
    }
    expect(playPuddle).not.toHaveBeenCalled();
  });

  it('is a puddle: a blue splash with a rim, and the round part the game happens in', () => {
    expect(page).toContain('class="puddle-art"');
    expect(page).toContain('class="rim"');
    expect(page).toContain('class="pond"');
    expect(page).toContain('<div class="water">');
    // The water's margins stay inside the puddle, so it's square and the
    // drawing lines up with it.
    const css = readFileSync(resolve(process.cwd(), 'public/styles.css'), 'utf8');
    expect(css.match(/\n\.puddle \{([^}]*)\}/)[1]).toContain('display: flow-root;');
    // No pulsing ripples, and no shine marks along its edges.
    expect(page).not.toContain('ripple');
    expect(page).not.toContain('stroke="white"');
  });
});
