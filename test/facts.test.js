// @vitest-environment jsdom
// "Did you know?" facts in the end-of-level pop-up (facts.js).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickFact, showFact } from '../public/game/facts.js';
import { QUIZ_FACTS } from '../public/game/quiz-facts.js';

const line = () => document.querySelector('.fun-fact');
const text = () => document.querySelector('.fun-fact-text').textContent;

beforeEach(() => {
  document.body.innerHTML = '<p class="fun-fact" hidden><strong>Did you know?</strong> <span class="fun-fact-text"></span></p>';
  sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('picking a fact', () => {
  it("never repeats the last one when there's another to choose", () => {
    for (let i = 0; i < 20; i++) expect(pickFact(['a', 'b'], 'a')).toBe('b');
  });

  it('repeats the only fact there is, and has none to give from none', () => {
    expect(pickFact(['a'], 'a')).toBe('a');
    expect(pickFact([], null)).toBeNull();
    expect(pickFact()).toBeNull();
  });

  it('picks at random', () => {
    expect(pickFact(['a', 'b', 'c'], null, () => 0)).toBe('a');
    expect(pickFact(['a', 'b', 'c'], null, () => 0.99)).toBe('c');
  });
});

describe('showing a fact', () => {
  it("shows one of her facts, with other living things' names in italics", () => {
    showFact('amy', ['Amy hunts *Paramecium*.']);
    expect(line().hidden).toBe(false);
    expect(text()).toBe('Amy hunts Paramecium.');
    expect(document.querySelector('.fun-fact-text i').textContent).toBe('Paramecium');
  });

  it('uses her quiz facts unless told otherwise', () => {
    showFact('amy');
    expect(QUIZ_FACTS.amy.map((fact) => fact.replaceAll('*', ''))).toContain(text());
  });

  it("doesn't show the same fact twice in a row, even on a new page", () => {
    showFact('amy', ['one', 'two']);
    const first = text();
    showFact('amy', ['one', 'two']);
    expect(text()).not.toBe(first);
  });

  it('hides the line for a pal with no facts', () => {
    showFact('nobody', []);
    expect(line().hidden).toBe(true);
  });

  it('still works without storage (private browsing)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('no'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('no'); });
    showFact('amy', ['one']);
    expect(text()).toBe('one');
  });

  it('does nothing on a page without the line', () => {
    document.body.innerHTML = '';
    expect(() => showFact('amy')).not.toThrow();
  });
});
