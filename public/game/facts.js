// "Did you know?" facts on the end-of-level pop-up, win or lose: a random
// fact about your pal from her quiz facts (quiz-facts.js), never the same
// one twice in a row.
//
// A fact can put words in italics between asterisks, for scientific names
// of other living things: "Amy hunts other protists, like *Paramecium*".

import { withItalics } from './italics.js';
import { QUIZ_FACTS } from './quiz-facts.js';

// A random fact from `facts`, avoiding `last` if there's any other choice.
export function pickFact(facts = [], last = null, random = Math.random) {
  const choices = facts.length > 1 ? facts.filter((f) => f !== last) : facts;
  if (choices.length === 0) return null;
  return choices[Math.floor(random() * choices.length)];
}

// Show a random fact about `pal` (her id, e.g. "amy") in the pop-up, or hide
// the fact line if she has none. Remembers the fact for the rest of the
// visit, since every level loads a fresh page.
export function showFact(pal, facts = QUIZ_FACTS[pal]) {
  const line = document.querySelector('.fun-fact');
  if (!line) return;
  const key = `puddlepals-last-fact-${pal}`;
  let last = null;
  try {
    last = sessionStorage.getItem(key);
  } catch {
    // No storage (private browsing, etc.): repeats are possible, that's all.
  }
  const fact = pickFact(facts, last);
  if (!fact) {
    line.hidden = true;
    return;
  }
  line.querySelector('.fun-fact-text').replaceChildren(...withItalics(fact));
  line.hidden = false;
  try {
    sessionStorage.setItem(key, fact);
  } catch {
    // See above.
  }
}
