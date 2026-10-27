// Entry point for the puddle page: find the pal and level picked in the URL
// and start the game with them:
//   puddle.html?pal=amy           level 1
//   puddle.html?pal=amy&level=2   level 2
import { scatterBacteria } from './bacteria.js';
import { GAME, LEVELS, SPECIES } from './config.js';
import { playPuddle } from './game.js';
import { speciesName } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { PALS, puddlePal } from './pals.js';
import { watchInputMode } from './touch.js';

// Show touch or arrow-key directions, whichever fits the device.
watchInputMode();
// "Filling the puddle…" while the next screen loads.
watchLoading();

// Every pal's drawing, hidden: yours is shown below.
document.querySelector('.pal-mover').append(...PALS.map(puddlePal));

const params = new URLSearchParams(window.location.search);
const choice = params.get('pal');
// Compare names rather than building a CSS selector from the address, so a
// mangled link (e.g. ?pal=amy"]) can't crash the page.
const pal = [...document.querySelectorAll('.puddle-pal')].find((el) => el.dataset.pal === choice);
// Level 1 unless the URL says otherwise.
const level = Math.min(Math.max(parseInt(params.get('level'), 10) || 1, 1), LEVELS.length);

if (!pal) {
  // No pal (or an unknown one) in the URL: send them back to choose.
  window.location.replace('./pal-picker.html');
} else {
  pal.removeAttribute('hidden');
  document.title = `PuddlePals | ${pal.dataset.name} | Level ${level}`;
  const species = SPECIES[pal.dataset.pal];
  // Her name and species above the puddle.
  const title = document.querySelector('.pal-name');
  title.textContent = pal.dataset.name;
  title.style.color = species.color;
  document.querySelector('.species-name').replaceChildren(...speciesName(species.scientific));
  for (const el of document.querySelectorAll('.pal-named')) el.textContent = pal.dataset.name;
  playPuddle({ you: { svg: pal, species }, food: scatterBacteria({ count: GAME.BACTERIA }), level });
  // The puddle is set up: take the loading card away.
  pageReady();
}
