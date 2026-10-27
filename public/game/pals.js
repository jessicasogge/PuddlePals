// Shared pal drawings for the home page, the picker and Who’s That Pal?.
// Listed in home-page order; the picker shuffles them.
//
// Each pal has:
//   id      key matching SPECIES in config.js
//   name    display name
//   looks   screen-reader description after her name
//   motion  idle animation in styles.css: bob, squish, wobble or slither
//   frames  per-page SVG viewBoxes: roomy on home, tile-filling in picker
//   art     200 x 200 drawing; wrap the face in <g class="face">
//
// To add a pal: append here, to SPECIES (with her `tile` color) and to
// QUIZ_FACTS.

import { SPECIES } from './config.js';

const SVG = 'http://www.w3.org/2000/svg';

export const PALS = [
  // Amy: Amoeba proteus, a lilac blob with pseudopods, a nucleus, a
  // contractile vacuole and a green bit of algae in a food vacuole
  {
    id: 'amy',
    name: 'Amy',
    looks: 'a lilac Amoeba proteus blob reaching out with rounded pseudopods',
    motion: 'squish',
    frames: { home: '0 0 200 200', picker: '14 14 172 172' },
    // She has the home page's row to herself, so she's drawn a little bigger.
    homeWidth: 160,
    art: `
      <!-- her body: a blob with five rounded pseudopods ("false feet") -->
      <path d="M96 52 C98 30 122 26 124 46 C126 62 136 70 152 72 C172 70 186 86 178 102 C172 116 156 116 152 128 C150 142 170 152 160 166 C150 178 132 170 126 158 C120 148 104 150 92 156 C74 166 50 168 40 156 C30 144 42 132 56 128 C66 124 64 112 54 104 C40 94 28 76 38 64 C48 52 66 60 74 70 C82 76 94 70 96 52 Z" fill="#ede9fe" stroke="#7c3aed" stroke-width="4" stroke-linejoin="round" />
      <!-- the grainy inner cytoplasm, inside a clear outer edge -->
      <path d="M100 66 C112 64 120 80 140 84 C158 88 164 100 150 112 C138 122 142 140 146 152 C140 158 128 148 116 142 C100 136 84 150 68 148 C56 146 58 134 70 128 C80 122 76 108 64 96 C54 86 60 74 74 80 C86 86 90 68 100 66 Z" fill="#ddd6fe" />
      <circle cx="108" cy="46" r="3.5" fill="#f5f3ff" />
      <!-- granules -->
      <circle cx="74" cy="132" r="2" fill="#a78bfa" />
      <circle cx="104" cy="134" r="2" fill="#a78bfa" />
      <circle cx="142" cy="108" r="2" fill="#a78bfa" />
      <circle cx="118" cy="80" r="2" fill="#a78bfa" />
      <circle cx="70" cy="90" r="2" fill="#a78bfa" />
      <!-- the nucleus -->
      <ellipse cx="132" cy="136" rx="11" ry="9" fill="#c4b5fd" stroke="#7c3aed" stroke-width="2" />
      <!-- a food vacuole with a bit of green alga inside -->
      <circle cx="152" cy="94" r="8" fill="#f5f3ff" stroke="#a78bfa" stroke-width="2" />
      <circle cx="152" cy="94" r="4" fill="#4ade80" />
      <!-- the contractile vacuole, which pumps out extra water -->
      <circle cx="58" cy="146" r="8" fill="#f5f3ff" stroke="#a78bfa" stroke-width="2" />
      <g class="face">
        <circle cx="88" cy="102" r="5.5" fill="#3b0764" />
        <circle cx="112" cy="102" r="5.5" fill="#3b0764" />
        <circle cx="89.8" cy="100.2" r="1.9" fill="white" />
        <circle cx="113.8" cy="100.2" r="1.9" fill="white" />
        <ellipse cx="76" cy="114" rx="6" ry="3.6" fill="#f9a8d4" opacity="0.9" />
        <ellipse cx="124" cy="114" rx="6" ry="3.6" fill="#f9a8d4" opacity="0.9" />
        <path d="M95 113 Q100 118 105 113" stroke="#3b0764" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>
    `,
  },
];

// The pals in the home page's row, in PALS order.
export const HOME_PALS = PALS;

// How many pals fit on one page of the picker: four across, two down.
export const PAGE_SIZE = 8;

// `pals` split into the picker's pages, in order, PAGE_SIZE to a page (the
// last page has whoever is left over).
export function pickerPages(pals = PALS, size = PAGE_SIZE) {
  const pages = [];
  for (let i = 0; i < pals.length; i += size) pages.push(pals.slice(i, i + size));
  return pages;
}

// A copy of `pals` in a random order (a Fisher-Yates shuffle, so every order
// is equally likely). The picker uses it so no pal is always first.
export function inRandomOrder(pals, random = Math.random) {
  const order = [...pals];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// The pal with this id, or undefined. Compares ids rather than looking one
// up by name, so an id like toString finds nothing.
export function palById(id) {
  return PALS.find((pal) => pal.id === id);
}

// Her drawing as an <svg>, framed for `page` ('home' or 'picker').
function drawing(pal, page) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', pal.frames[page]);
  svg.innerHTML = pal.art;
  // Any SVG <animate> plays on the home page, but stays still on the picker,
  // and for anyone who has asked for less motion (CSS can't pause <animate>).
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (page === 'picker' || reduced) {
    for (const wiggle of svg.querySelectorAll('animate')) wiggle.remove();
  }
  return svg;
}

// For the home page's row of pals.
export function homePal(pal) {
  const svg = drawing(pal, 'home');
  svg.setAttribute('class', `pal ${pal.motion}`);
  if (pal.homeWidth) svg.style.width = `${pal.homeWidth}px`;
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  return svg;
}

// Her picture on a colored tile, for the picker and the quiz. The name next
// to it says who she is, so the picture is hidden from screen readers.
export function palTile(pal) {
  const tile = document.createElement('div');
  tile.className = `pal-icon ${pal.id}`;
  tile.style.setProperty('--tile', SPECIES[pal.id].tile);
  const svg = drawing(pal, 'picker');
  svg.setAttribute('aria-hidden', 'true');
  tile.append(svg);
  return tile;
}
