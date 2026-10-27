// The Cyclops: a copepod, a tiny crustacean with one red eye (like the
// Cyclops of Greek myth) that hunts protists in ponds and puddles. It's much
// bigger than Amy, swims in hops (a quick kick, then a glide), and goes after
// her offspring unless she comes too close. Catching Amy is game over; any
// offspring it bumps into, it eats.
import { CYCLOPS } from './config.js';

const SVG = 'http://www.w3.org/2000/svg';

// The drawing is 100 x 140, head up, with its middle at (50, 70).
const VIEW_WIDTH = 100;
const MIDDLE = 70;
// Its outline as circles [forward, radius] along its middle, in drawing
// units: its head and its body. Its thin tail and antennae don't count, so
// brushing past them is safe.
const OUTLINE = [
  [70 - 46, 26],
  [70 - 78, 15],
];
// The head is what eats.
const HEAD = 0;

// How far one drawing unit is, as a fraction of the puddle radius.
const UNIT = (CYCLOPS.SIZE / 100) * 2 / VIEW_WIDTH;

// A cartoon Cyclops, orange like many real ones, with long feelers
// (antennae), little swimming legs, a forked tail and one big red eye.
// Drawn head up; the game turns it to face the way it's swimming.
export function cyclopsDrawing() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_WIDTH} 140`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <!-- antennae, sweeping back -->
    <g class="antennae" fill="none" stroke="#9a3412" stroke-width="3" stroke-linecap="round">
      <path d="M40 26 Q16 14 3 52" />
      <path d="M60 26 Q84 14 97 52" />
      <path d="M22 22l-2 -5M13 30l-4 -3M7 41l-5 -1M78 22l2 -5M87 30l4 -3M93 41l5 -1" stroke-width="1.6" />
    </g>
    <!-- swimming legs -->
    <path d="M28 64l-9 4M27 72l-9 5M30 80l-8 6M72 64l9 4M73 72l9 5M70 80l8 6" stroke="#9a3412" stroke-width="2.6" stroke-linecap="round" />
    <!-- forked tail (the furca), with bristles -->
    <path d="M46 116 L39 133 M54 116 L61 133" stroke="#c2410c" stroke-width="4" stroke-linecap="round" />
    <path d="M39 133l-4 5M39 133l1 6M61 133l4 5M61 133l-1 6" stroke="#9a3412" stroke-width="1.6" stroke-linecap="round" />
    <!-- abdomen, in segments -->
    <path d="M43 86 L45 118 Q50 121 55 118 L57 86 Z" fill="#fed7aa" stroke="#c2410c" stroke-width="2.5" stroke-linejoin="round" />
    <path d="M44 96h12M44.6 106h10.8" stroke="#c2410c" stroke-width="1.5" />
    <!-- head and body: a teardrop -->
    <path d="M50 14 C72 14 80 38 76 60 C73 78 63 90 50 92 C37 90 27 78 24 60 C20 38 28 14 50 14 Z" fill="#fdba74" stroke="#c2410c" stroke-width="3" stroke-linejoin="round" />
    <path d="M28 66 Q50 72 72 66M33 79 Q50 84 67 79" fill="none" stroke="#ea580c" stroke-width="1.6" opacity="0.7" />
    <ellipse cx="40" cy="26" rx="7" ry="4" fill="#ffedd5" opacity="0.8" />
    <!-- one big red eye, and a cross little face -->
    <g class="cyclops-face">
      <circle cx="50" cy="40" r="10" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" />
      <circle cx="50" cy="41" r="4.5" fill="#450a0a" />
      <circle cx="53" cy="37.5" r="2.4" fill="white" />
      <path d="M38 27 L50 31 L62 27" fill="none" stroke="#7f1d1d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M44 58 Q50 54 56 58" fill="none" stroke="#7f1d1d" stroke-width="2.6" stroke-linecap="round" />
    </g>`;
  return svg;
}

// One Cyclops in the puddle. Positions are fractions of the puddle radius
// from the center, like the bacteria, so they stay put on a resize.
// `heading` is the way it faces, in radians. `random` returns 0 to 1, for
// the tests.
export function makeCyclops(water, { fx, fy, heading, random = Math.random }) {
  const el = document.createElement('div');
  el.className = 'cyclops';
  el.appendChild(cyclopsDrawing());
  water.appendChild(el);
  const cyclops = {
    el,
    fx,
    fy,
    heading,
    wander: 0,
    hop: random(), // how far through its current hop, 0 to 1, so they don't all kick together
    full: 0, // ms left digesting its last meal, sitting still

    // Its outline as circles [fx, fy, r], in fractions of the puddle radius.
    body() {
      const [ux, uy] = [Math.cos(cyclops.heading), Math.sin(cyclops.heading)];
      return OUTLINE.map(([forward, r]) => [cyclops.fx + ux * forward * UNIT, cyclops.fy + uy * forward * UNIT, r * UNIT]);
    },
    // Its head, the part that eats, as [fx, fy, r].
    head: () => cyclops.body()[HEAD],

    // How fast it's going right now, as a share of its average speed: quick
    // while it kicks, slow while it glides.
    pace() {
      const glide = (1 - CYCLOPS.KICK * CYCLOPS.KICK_SPEED) / (1 - CYCLOPS.KICK);
      return cyclops.hop < CYCLOPS.KICK ? CYCLOPS.KICK_SPEED : glide;
    },

    // It just ate: stop to digest for a while.
    eat() {
      cyclops.full = CYCLOPS.FULL_MS;
      el.classList.add('full');
    },

    // One frame: turn toward `target` ({ fx, fy }, or null to drift),
    // weaving a little, then swim on, staying in the water. While it's full,
    // it sits still.
    step(seconds, target) {
      if (cyclops.full > 0) {
        cyclops.full -= seconds * 1000;
        if (cyclops.full <= 0) el.classList.remove('full');
        return;
      }
      cyclops.hop = (cyclops.hop + (seconds * 1000) / CYCLOPS.HOP_MS) % 1;
      cyclops.wander += (random() - 0.5) * 6 * seconds;
      cyclops.wander = Math.max(-CYCLOPS.WANDER, Math.min(CYCLOPS.WANDER, cyclops.wander));
      // With nothing to chase, it drifts: on the way it's facing, or back
      // toward the middle once it reaches the edge.
      const atEdge = Math.hypot(cyclops.fx, cyclops.fy) >= CYCLOPS.EDGE - 0.01;
      const aim = target ?? (atEdge ? { fx: 0, fy: 0 } : null);
      const wanted = aim
        ? Math.atan2(aim.fy - cyclops.fy, aim.fx - cyclops.fx) + cyclops.wander
        : cyclops.heading + cyclops.wander * seconds * 2;
      // Turn the short way round, no faster than it can.
      const turn = Math.atan2(Math.sin(wanted - cyclops.heading), Math.cos(wanted - cyclops.heading));
      const most = CYCLOPS.TURN * seconds;
      cyclops.heading += Math.max(-most, Math.min(most, turn));
      const distance = CYCLOPS.SPEED * cyclops.pace() * seconds;
      cyclops.fx += Math.cos(cyclops.heading) * distance;
      cyclops.fy += Math.sin(cyclops.heading) * distance;
      const out = Math.hypot(cyclops.fx, cyclops.fy);
      if (out > CYCLOPS.EDGE) {
        cyclops.fx *= CYCLOPS.EDGE / out;
        cyclops.fy *= CYCLOPS.EDGE / out;
      }
      cyclops.place();
    },

    place() {
      el.style.left = `${50 + cyclops.fx * 50}%`;
      el.style.top = `${50 + cyclops.fy * 50}%`;
      // Drawn head up: turn it so its head leads.
      el.style.setProperty('--turn', `${(cyclops.heading * 180) / Math.PI + 90}deg`);
    },
  };
  cyclops.place();
  return cyclops;
}

// `count` Cyclopes, spread evenly around the edge of the puddle, facing in.
export function cyclopsAround(water, count, random = Math.random) {
  const first = random() * 2 * Math.PI;
  return Array.from({ length: count }, (_, i) => {
    const angle = first + (2 * Math.PI * i) / count;
    return makeCyclops(water, {
      fx: CYCLOPS.EDGE * Math.cos(angle), fy: CYCLOPS.EDGE * Math.sin(angle), heading: angle + Math.PI, random,
    });
  });
}

// What a Cyclops at (fx, fy) goes after: Amy (`pal`, { fx, fy }) if she's
// within CYCLOPS.NOTICE; otherwise the nearest of `cells` (her offspring,
// { fx, fy }), or null to just drift around if there are none.
export function preyFor(fx, fy, cells, pal) {
  if (Math.hypot(pal.fx - fx, pal.fy - fy) < CYCLOPS.NOTICE) return pal;
  let best = null;
  let bestDistance = Infinity;
  for (const cell of cells) {
    const distance = Math.hypot(cell.fx - fx, cell.fy - fy);
    if (distance < bestDistance) {
      best = cell;
      bestDistance = distance;
    }
  }
  return best;
}
