// Shared pal drawings for the home page, the picker, Who’s That Pal? and
// the puddle.
// Listed in home-page order; the picker shuffles them.
//
// Each pal has:
//   id      key matching SPECIES in config.js
//   name    display name
//   looks   screen-reader description after her name
//   motion  idle animation in styles.css: bob, squish, wobble or slither
//   frames  per-page SVG viewBoxes: roomy on home, tile-filling in picker,
//           snug in the puddle
//   art     200 x 200 drawing; wrap the face in <g class="face">
//
// To add a pal: append here, to SPECIES (with her `tile` color) and to
// QUIZ_FACTS.

import { SPECIES } from './config.js';

const SVG = 'http://www.w3.org/2000/svg';

// Pam's slipper-shaped outline, facing right: wider and blunt at the front,
// narrower at the back, with her oral groove dipping in on her underside.
// `angle` goes round her from the front (0), down her underside, to the
// back (π) and over her top.
const PAM = { x: 102, y: 100, half: 74 };
function pamPoint(angle) {
  const front = Math.cos(angle);
  const height = 26 + 4 * front;
  const groove = 7 * Math.exp(-(((angle - 1.1) / 0.35) ** 2));
  return [PAM.x + PAM.half * front, PAM.y + height * Math.sin(angle) - groove];
}
const pamOutline = () => {
  const points = Array.from({ length: 90 }, (_, i) => pamPoint((2 * Math.PI * i) / 90));
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;
};

// Her cilia: short hairs all round her edge, with a tuft of longer ones at
// the back (caudatum means "tailed"). Each sweeps back and forth a moment
// after the one before, so a wave runs round her, as on a real paramecium.
// SVG <animate>, so they beat on the home page and in the puddle, but not
// on the picker or with reduced motion (drawing() below).
const CILIA = 36;
const BEAT = 0.8; // seconds
function cilium(i) {
  const angle = (2 * Math.PI * i) / CILIA;
  const [x, y] = pamPoint(angle);
  const [ax, ay] = pamPoint(angle - 0.01);
  const [bx, by] = pamPoint(angle + 0.01);
  const along = Math.hypot(bx - ax, by - ay);
  const [tx, ty] = [(bx - ax) / along, (by - ay) / along];
  const [nx, ny] = [ty, -tx]; // pointing out from her
  const length = Math.abs(angle - Math.PI) < 0.3 ? 15 : 7;
  const d = (swing) => `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + nx * length + tx * swing).toFixed(1)} ${(y + ny * length + ty * swing).toFixed(1)}`;
  return `<path d="${d(4)}"><animate attributeName="d" dur="${BEAT}s" begin="-${((i / CILIA) * BEAT).toFixed(3)}s" ` +
    `repeatCount="indefinite" values="${d(4)};${d(-4)};${d(4)}" /></path>`;
}
const PAM_CILIA = Array.from({ length: CILIA }, (_, i) => cilium(i)).join('');

// A star-shaped contractile vacuole: a bubble with canals running out of it.
const starVacuole = (cx, cy) =>
  `<circle cx="${cx}" cy="${cy}" r="4" fill="#fdf2f8" stroke="#db2777" stroke-width="1.4" />` +
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI * i) / 3;
    return `<path d="M${(cx + 5 * Math.cos(a)).toFixed(1)} ${(cy + 5 * Math.sin(a)).toFixed(1)} L${(cx + 10 * Math.cos(a)).toFixed(1)} ${(cy + 10 * Math.sin(a)).toFixed(1)}" />`;
  }).join('');

export const PALS = [
  // Amy: Amoeba proteus, a lilac blob with pseudopods, a nucleus, a
  // contractile vacuole and a green bit of algae in a food vacuole
  {
    id: 'amy',
    name: 'Amy',
    looks: 'a lilac Amoeba proteus blob reaching out with rounded pseudopods',
    motion: 'squish',
    frames: { home: '0 0 200 200', picker: '14 14 172 172', puddle: '14 14 172 172' },
    // Drawn a little bigger on the home page.
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
  // Pam: Paramecium caudatum, a pink slipper fringed with beating cilia,
  // with her oral groove, a big and a small nucleus, and two star-shaped
  // contractile vacuoles
  {
    id: 'pam',
    name: 'Pam',
    looks: 'a pink slipper-shaped Paramecium caudatum fringed with beating cilia',
    motion: 'bob',
    // She's long and low, so her home and puddle frames are wide and short.
    frames: { home: '6 46 194 108', picker: '6 6 188 188', puddle: '8 52 190 96' },
    homeWidth: 170,
    art: `
      <!-- cilia, and the longer tuft at her back -->
      <g class="cilia" stroke="#db2777" stroke-width="1.6" stroke-linecap="round" opacity="0.75">${PAM_CILIA}</g>
      <!-- her body: a slipper -->
      <path d="${pamOutline()}" fill="#fce7f3" stroke="#db2777" stroke-width="3.5" stroke-linejoin="round" />
      <circle cx="58" cy="86" r="3" fill="#fdf2f8" />
      <!-- the oral groove, sweeping food in to her mouth -->
      <path d="M130 120 Q117 118 106 110" fill="none" stroke="#be185d" stroke-width="2" stroke-linecap="round" />
      <circle cx="105" cy="109" r="2.5" fill="#be185d" />
      <!-- food vacuoles -->
      <circle cx="70" cy="111" r="3.5" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
      <circle cx="117" cy="104" r="2.5" fill="#fef3c7" stroke="#d97706" stroke-width="1" />
      <!-- the big macronucleus and the small micronucleus -->
      <ellipse cx="88" cy="99" rx="15" ry="10" fill="#f9a8d4" stroke="#be185d" stroke-width="1.5" />
      <circle cx="105" cy="94" r="3.5" fill="#ec4899" />
      <!-- two star-shaped contractile vacuoles, pumping out extra water -->
      <g stroke="#db2777" stroke-width="1.2" stroke-linecap="round">${starVacuole(52, 100)}${starVacuole(126, 88)}</g>
      <g class="face">
        <circle cx="147" cy="96" r="5" fill="#500724" />
        <circle cx="162" cy="96" r="5" fill="#500724" />
        <circle cx="148.6" cy="94.4" r="1.7" fill="white" />
        <circle cx="163.6" cy="94.4" r="1.7" fill="white" />
        <ellipse cx="140" cy="106" rx="5" ry="3" fill="#f9a8d4" opacity="0.95" />
        <ellipse cx="168" cy="106" rx="5" ry="3" fill="#f9a8d4" opacity="0.95" />
        <path d="M150 105 Q154.5 109 159 105" stroke="#500724" stroke-width="2.5" fill="none" stroke-linecap="round" />
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

// Her drawing as an <svg>, framed for `page` ('home', 'picker' or 'puddle').
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

// For the puddle, hidden until the game picks her (puddle.js).
export function puddlePal(pal) {
  const svg = drawing(pal, 'puddle');
  svg.setAttribute('class', `puddle-pal ${pal.motion}`);
  svg.dataset.pal = pal.id;
  svg.dataset.name = pal.name;
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${pal.name}, ${pal.looks}`);
  svg.setAttribute('hidden', '');
  return svg;
}
