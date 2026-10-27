// @vitest-environment jsdom
// The pals' drawings (pals.js), and the pages that draw them: the home page
// and the picker. The pages are loaded into jsdom, a simulated browser page.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SPECIES } from '../public/game/config.js';
import { plainText } from '../public/game/italics.js';
import { HOME_PALS, homePal, inRandomOrder, PAGE_SIZE, palById, PALS, palTile, pickerPages } from '../public/game/pals.js';

// (jsdom changes import.meta.url to a web address, so find files from the project folder.)
const file = (name) => readFileSync(resolve(process.cwd(), 'public', name), 'utf8');
const css = file('styles.css');
const IDS = PALS.map((pal) => pal.id);

// Open `page` and run `script` on it.
async function open(page, script) {
  const html = file(page);
  document.body.outerHTML = html.slice(html.indexOf('<body'), html.indexOf('</body>'));
  vi.resetModules();
  await import(`../public/${script}`);
}

afterEach(() => {
  vi.doUnmock('../public/game/pals.js');
  delete window.matchMedia;
});

describe('the pals', () => {
  it('are the same pals as in config.js, each once', () => {
    expect([...IDS].sort()).toEqual(Object.keys(SPECIES).sort());
    expect(new Set(IDS).size).toBe(IDS.length);
  });

  it('starts with Amy, Amoeba proteus', () => {
    expect(palById('amy').name).toBe('Amy');
    expect(SPECIES.amy.scientific).toBe('Amoeba proteus');
    expect(palById('toString')).toBeUndefined();
  });

  it('splits into pages of eight for the picker, with the rest on the last page', () => {
    expect(PAGE_SIZE).toBe(8);
    expect(pickerPages().flat()).toEqual(PALS);
    expect(pickerPages(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    expect(pickerPages(['a', 'b'], 2)).toEqual([['a', 'b']]);
  });

  it('can be shuffled, without losing anyone', () => {
    const letters = ['a', 'b', 'c', 'd'];
    expect(inRandomOrder(letters, () => 0)).toEqual(['b', 'c', 'd', 'a']);
    expect([...inRandomOrder(letters)].sort()).toEqual(letters);
    expect(letters).toEqual(['a', 'b', 'c', 'd']); // a copy, not the same list
  });

  it.each(PALS)('$id has a name and a description', (pal) => {
    expect(pal.name).toMatch(/^[A-Z][a-z]+$/);
    // Her species is in the description, so a screen reader says what she is.
    expect(pal.looks).toContain(plainText(SPECIES[pal.id].scientific).split(' ')[0]);
  });

  it.each(PALS)("$id's idle animation is in styles.css, and she has a tile color", (pal) => {
    expect(css).toMatch(new RegExp(`\\n\\.${pal.motion} \\{[^}]*animation:`));
    expect(SPECIES[pal.id].tile).toMatch(/^rgba\(\d+, \d+, \d+, (0|1|0?\.\d+)\)$/);
  });

  it.each(PALS)('$id is framed for every page, with a face', (pal) => {
    expect(Object.keys(pal.frames).sort()).toEqual(['home', 'picker']);
    expect(homePal(pal).querySelector('g.face')).not.toBeNull();
  });
});

describe('her drawings', () => {
  const wiggly = { ...PALS[0], art: '<path d="M0 0"><animate attributeName="d" /></path>' };

  it('are named for screen readers on the home page, and hidden on her tile', () => {
    const svg = homePal(PALS[0]);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe(`${PALS[0].name}, ${PALS[0].looks}`);
    expect(svg.getAttribute('class')).toBe(`pal ${PALS[0].motion}`);
    const tile = palTile(PALS[0]);
    expect(tile.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(tile.style.getPropertyValue('--tile')).toBe(SPECIES[PALS[0].id].tile);
  });

  it('can be drawn a different width on the home page', () => {
    expect(homePal({ ...PALS[0], homeWidth: 100 }).style.width).toBe('100px');
    expect(homePal({ ...PALS[0], homeWidth: undefined }).style.width).toBe('');
  });

  it('wiggle on the home page, but not on the picker or with reduced motion', () => {
    expect(homePal(wiggly).querySelector('animate')).not.toBeNull();
    expect(palTile(wiggly).querySelector('animate')).toBeNull();
    window.matchMedia = (query) => ({ matches: query === '(prefers-reduced-motion: reduce)' });
    expect(homePal(wiggly).querySelector('animate')).toBeNull();
  });
});

describe('the home page', () => {
  it('shows every home pal in a row, and links to the quiz', async () => {
    await open('index.html', 'script.js');
    const row = [...document.querySelectorAll('.friends svg.pal')];
    expect(row.map((svg) => svg.getAttribute('aria-label'))).toEqual(HOME_PALS.map((pal) => `${pal.name}, ${pal.looks}`));
    expect(document.querySelector('.logo').textContent).toBe('PuddlePals');
    expect(document.querySelector('.guess-link').getAttribute('href')).toBe('./whos-that-pal.html');
  });

  it('links to both sister games, PetriPals and FunGals', async () => {
    await open('index.html', 'script.js');
    const links = [...document.querySelectorAll('.sister-game a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['PetriPals', 'https://jessicasogge.github.io/petripals/'],
      ['FunGals', 'https://jessicasogge.github.io/fungals/'],
    ]);
  });

  it("keeps room for the pals before they're drawn, so the page doesn't jump", () => {
    const tallest = Math.max(...HOME_PALS.map((pal) => pal.homeWidth ?? 120));
    expect(css).toMatch(new RegExp(`\\n\\.friends \\{[^}]*min-height: ${tallest}px;`));
  });

  it('has a different background from PetriPals, but the same green words', () => {
    const body = css.match(/\nbody \{[^}]*\}/)[0];
    expect(body).toContain('color: #134e4a;');
    expect(body).not.toContain('#ccfbf1');
  });
});

describe('the pal picker', () => {
  it('shows a card for each pal, with her name and species', async () => {
    await open('pal-picker.html', 'game/pal-picker.js');
    const cards = [...document.querySelectorAll('.pal-card')];
    expect(cards.map((card) => card.dataset.pal).sort()).toEqual([...IDS].sort());
    const amy = document.querySelector('.pal-card[data-pal="amy"]');
    expect(amy.querySelector('h2').textContent).toBe('Amy');
    expect(amy.querySelector('.species i').textContent).toBe('Amoeba proteus');
    expect(document.querySelector('.loading-overlay').hidden).toBe(true);
  });

  it("doesn't open anything yet: the cards aren't links", async () => {
    await open('pal-picker.html', 'game/pal-picker.js');
    for (const card of document.querySelectorAll('.pal-card')) {
      expect(card.tagName).toBe('DIV');
      expect(card.closest('a')).toBeNull();
      expect(card.querySelector('a, button')).toBeNull();
    }
  });

  it('hides the pager while every pal fits on one page', async () => {
    await open('pal-picker.html', 'game/pal-picker.js');
    expect(document.querySelector('.picker-pager').hidden).toBe(true);
  });

  it('pages through the pals once there are more than fit on one page', async () => {
    const many = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({ ...PALS[0], id: 'amy', name: `Amy${i}` }));
    vi.doMock('../public/game/pals.js', async (original) => ({ ...(await original()), PALS: many }));
    await open('pal-picker.html', 'game/pal-picker.js');
    const pages = [...document.querySelectorAll('.picker-grid')];
    const back = document.querySelector('.pager-back');
    const more = document.querySelector('.pager-more');
    expect(pages.map((page) => page.hidden)).toEqual([false, true]);
    expect(document.querySelector('.picker-pager').hidden).toBe(false);
    expect([back.hidden, more.hidden]).toEqual([true, false]);

    more.click();
    expect(pages.map((page) => page.hidden)).toEqual([true, false]);
    expect([back.hidden, more.hidden]).toEqual([false, true]);
    expect(document.activeElement).toBe(back);

    back.click();
    expect(pages.map((page) => page.hidden)).toEqual([false, true]);
    expect(document.activeElement).toBe(more);
  });
});
