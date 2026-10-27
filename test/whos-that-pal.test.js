// @vitest-environment jsdom
// Who’s That Pal? shows a fact with "this pal" in place of her name, and a button for
// every pal. No score, just tries until you find her.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SPECIES } from '../public/game/config.js';
import { factDeck, quizPals, ROUND_SIZE } from '../public/game/guess.js';
import { PALS } from '../public/game/pals.js';
import { QUIZ_FACTS } from '../public/game/quiz-facts.js';

const page = readFileSync(resolve(process.cwd(), 'public/whos-that-pal.html'), 'utf8');

// The same pals and deck the page picks, with Math.random pinned to 0 below.
// The page deals from the end.
const round = quizPals(PALS, ROUND_SIZE, () => 0);
const deck = factDeck(round, QUIZ_FACTS, () => 0);
const dealt = (n) => deck[deck.length - 1 - n];

async function open() {
  document.body.outerHTML = page.slice(page.indexOf('<body'), page.indexOf('</body>'));
  vi.resetModules();
  await import('../public/game/whos-that-pal.js');
}

// The page with a made-up second pal, Twin, so there's someone to guess
// wrong. (Amy is the only real pal so far.)
const twin = { ...PALS[0], id: 'twin', name: 'Twin' };
const TWIN_FACTS = ['Twin is made up for these tests.'];
async function openWithTwin() {
  vi.doMock('../public/game/config.js', () => ({ SPECIES: { ...SPECIES, twin: SPECIES[PALS[0].id] } }));
  vi.doMock('../public/game/pals.js', async (original) => ({ ...(await original()), PALS: [...PALS, twin] }));
  vi.doMock('../public/game/quiz-facts.js', () => ({ QUIZ_FACTS: { ...QUIZ_FACTS, twin: TWIN_FACTS } }));
  await open();
  const pals = [...PALS, twin];
  return factDeck(quizPals(pals, ROUND_SIZE, () => 0), { ...QUIZ_FACTS, twin: TWIN_FACTS }, () => 0).at(-1).pal;
}

const button = (id) => document.querySelector(`.guess-btn[data-pal="${id}"]`);
const status = () => document.querySelector('.guess-status').textContent;
const fact = () => document.querySelector('.guess-fact');
const next = () => document.querySelector('.next-fact');

beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0));
afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('../public/game/config.js');
  vi.doUnmock('../public/game/pals.js');
  vi.doUnmock('../public/game/quiz-facts.js');
});

describe('Who’s That Pal?', () => {
  it('offers every pal, up to a round of 12, in their usual order', async () => {
    await open();
    const offered = [...document.querySelectorAll('.guess-btn')].map((b) => b.dataset.pal);
    expect(offered).toEqual(PALS.slice(0, ROUND_SIZE).map((pal) => pal.id));
    expect(offered).toEqual(round.map((pal) => pal.id));
    expect(document.querySelector('.loading-overlay').hidden).toBe(true);
  });

  it("only asks about this round's pals' facts", async () => {
    await open();
    expect(new Set(deck.map(({ pal }) => pal))).toEqual(new Set(round));
    expect(deck).toHaveLength(round.reduce((sum, pal) => sum + QUIZ_FACTS[pal.id].length, 0));
  });

  it("shows each pal's species, shortened, under her name", async () => {
    await open();
    expect(button('amy').querySelector('.guess-species').textContent).toBe('A. proteus');
    expect(button('amy').querySelector('.guess-species i').textContent).toBe('A. proteus');
    for (const pal of round) expect(button(pal.id).querySelector('.guess-species').textContent).toMatch(/^[A-Z]\.\s\S+$/);
  });

  it('shows a fact with "this pal" in place of her name', async () => {
    await open();
    const { pal } = dealt(0);
    expect(fact().textContent).toMatch(/\b[Tt]his pal\b/);
    expect(fact().textContent).not.toContain(pal.name);
    expect(status()).toBe('Who is this fact about? Tap her!');
    expect(next().hidden).toBe(true);
  });

  it("counts how many facts you've seen, out of all of them", async () => {
    await open();
    const counter = () => document.querySelector('.guess-counter').textContent;
    expect(counter()).toBe(`Fact 1 of ${deck.length}`);
    button(dealt(0).pal.id).click();
    expect(counter()).toBe(`Fact 1 of ${deck.length}`); // no change for finding her
    next().click();
    expect(counter()).toBe(`Fact 2 of ${deck.length}`);
  });

  it('greys out a wrong guess so you can try again', async () => {
    const answer = await openWithTwin();
    const other = answer.id === 'twin' ? PALS[0] : twin;
    button(other.id).click();
    expect(status()).toBe(`Not ${other.name}. Try again!`);
    expect(button(other.id).disabled).toBe(true);
    expect(next().hidden).toBe(true);
    // Then finding her works as usual, and the next fact brings everyone back.
    button(answer.id).click();
    expect(next().hidden).toBe(false);
    next().click();
    expect(button(other.id).disabled).toBe(false);
  });

  it('fills in her name and species when you find her', async () => {
    await open();
    const { pal, fact: text } = dealt(0);
    button(pal.id).click();
    expect(fact().textContent).toContain(pal.name);
    expect(fact().textContent).not.toMatch(/\b[Tt]his pal\b/);
    expect(text).toContain(pal.name);
    expect(button(pal.id).classList).toContain('right');
    expect(status()).toBe(`Yes! It's ${pal.name}, ${SPECIES[pal.id].scientific.replaceAll('*', '')}.`);
    expect(document.querySelector('.guess-status i')).not.toBeNull();
    for (const other of round) expect(button(other.id).disabled).toBe(other.id !== pal.id);
    expect(next().hidden).toBe(false);
    expect(document.activeElement).toBe(next());
  });

  it("doesn't keep score", async () => {
    await open();
    expect(document.body.textContent).not.toMatch(/score|points|correct/i);
  });

  it('moves on to the next fact, with every pal back', async () => {
    await open();
    button(dealt(0).pal.id).click();
    next().click();
    const { pal } = dealt(1);
    expect(fact().textContent).not.toContain(pal.name);
    expect(status()).toBe('Who is this fact about? Tap her!');
    expect(next().hidden).toBe(true);
    for (const other of round) {
      expect(button(other.id).disabled).toBe(false);
      expect(button(other.id).classList).not.toContain('right');
    }
  });

  it('starts a new round once every fact about these has been shown', async () => {
    await open();
    for (let i = 0; i < deck.length; i++) {
      button(dealt(i).pal.id).click();
      next().click();
    }
    // Back to the top of a fresh deck, counting from 1 again.
    expect(document.querySelector('.guess-counter').textContent).toBe(`Fact 1 of ${deck.length}`);
    const { pal } = dealt(0);
    expect(fact().textContent).toMatch(/\b[Tt]his pal\b/);
    button(pal.id).click();
    expect(next().hidden).toBe(false);
  });
});
