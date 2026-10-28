// The pal picker: a card for each pal, with her picture, name and species.
// All the pals are shuffled into a new random order every visit, so no pal
// is always first or always on a later page, then split into pages of eight
// (PAGE_SIZE in pals.js), shown one at a time with Back and More pals
// buttons to move between them.
import { SPECIES } from './config.js';
import { speciesName } from './italics.js';
import { pageReady, watchLoading } from './loading.js';
import { inRandomOrder, PALS, palTile, pickerPages } from './pals.js';

// "Filling the puddle…" while the next screen loads.
watchLoading();

// Every page is made up front and the ones not showing are hidden, so a
// page you come back to looks the same as when you left it.
const pages = pickerPages(inRandomOrder(PALS)).map((pals, i) => {
  const grid = document.createElement('div');
  grid.className = 'picker-grid';
  grid.dataset.page = String(i + 1);
  grid.append(...pals.map(card));
  return grid;
});
document.querySelector('.picker-pages').append(...pages);

const back = document.querySelector('.pager-back');
const more = document.querySelector('.pager-more');
let current = 0;

function showPage(index) {
  current = index;
  pages.forEach((grid, i) => {
    grid.hidden = i !== index;
  });
  back.hidden = index === 0;
  more.hidden = index === pages.length - 1;
  // With only one page there's nothing to page through.
  document.querySelector('.picker-pager').hidden = pages.length < 2;
}

back.addEventListener('click', () => {
  showPage(current - 1);
  // The Back button is gone on the first page, so keep the keyboard nearby.
  if (back.hidden) more.focus();
});
more.addEventListener('click', () => {
  showPage(current + 1);
  if (more.hidden) back.focus();
});
showPage(0);

// Her card: the whole card is the link that picks her and opens the puddle.
function card(pal) {
  const box = document.createElement('a');
  box.className = 'pal-card';
  box.href = `./puddle.html?pal=${pal.id}`;
  box.dataset.pal = pal.id;

  const name = document.createElement('h2');
  name.textContent = pal.name;

  const species = document.createElement('p');
  species.className = 'species';
  species.append(...speciesName(SPECIES[pal.id].scientific));

  box.append(palTile(pal), name, species);
  return box;
}

// All filled in: take the loading card away.
pageReady();
