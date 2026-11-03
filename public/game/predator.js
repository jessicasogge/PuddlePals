// The predators that hunt your pal in the puddle. Each pal has her own (her
// `predator` in config.js):
//   cyclops    Pam's: a copepod, a tiny crustacean with one red eye (like the
//              Cyclops of Greek myth) that hunts protists
//   roundworm  Amy's: a predatory roundworm (a nematode), not any one named
//              species. Nematodes are listed among Amoeba proteus's
//              predators; how it patrols here is the game's own.
// Both swim smoothly in gentle strokes and go after her offspring unless
// she comes too close. Catching your pal is game over; any offspring its
// head touches, it eats, then it stops to digest.
import { PREDATOR, PREDATORS } from './config.js';

const SVG = 'http://www.w3.org/2000/svg';

// A cartoon Cyclops, orange like many real ones, with long feelers
// (antennae), little swimming legs, a forked tail and one big red eye.
// Drawn head up in a 100 x 140 box.
const CYCLOPS_ART = `
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

// The roundworm: slender and pale, tapered at both ends, drawn head up in a
// 40 x 160 box. Its whole body bends in an S, and the bends travel from its
// head to its tail, the way a nematode moves. `t` goes from its head (0) to
// its tail (1); the bends are a little smaller at its head.
const WORM = { x: 20, top: 10, length: 140, steps: 16, swim: '1.2s' };
const wormSway = (t) => 3 + 3 * t;
const wormX = (t, phase) => WORM.x + wormSway(t) * Math.sin(2 * Math.PI * t - phase);
const wormY = (t) => WORM.top + WORM.length * t;
const wormWidth = (t) => Math.max(0.8, 6 * Math.sqrt(Math.sin(Math.PI * t)));
const points = (from, to, n = 40) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
const xy = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
function wormBody(phase) {
  const down = points(0, 1).map((t) => xy(wormX(t, phase) + wormWidth(t), wormY(t)));
  const up = points(1, 0).map((t) => xy(wormX(t, phase) - wormWidth(t), wormY(t)));
  return `M${[...down, ...up].join(' L')} Z`;
}
const wormGut = (phase) => `M${points(0.08, 0.92).map((t) => xy(wormX(t, phase), wormY(t))).join(' L')}`;
// One swim cycle, as SVG <animate> values (stripped for reduced motion).
const wormPhases = Array.from({ length: WORM.steps + 1 }, (_, i) => (2 * Math.PI * i) / WORM.steps);
const wormWave = (shape) =>
  `<animate attributeName="d" dur="${WORM.swim}" repeatCount="indefinite" values="${wormPhases.map(shape).join(';')}" />`;
// Its face rides along with its head as it sways.
const wormNod = `<animateTransform attributeName="transform" type="translate" dur="${WORM.swim}" repeatCount="indefinite" ` +
  `values="${wormPhases.map((phase) => `${(wormX(0, phase) - WORM.x).toFixed(2)} 0`).join(';')}" />`;
const ROUNDWORM_ART = `
    <path class="worm-body" d="${wormBody(0)}" fill="#f1e7d6" stroke="#9a7b52" stroke-width="1.4" stroke-linejoin="round">${wormWave(wormBody)}</path>
    <path class="worm-gut" d="${wormGut(0)}" fill="none" stroke="#c9a97a" stroke-width="1.6" stroke-linecap="round">${wormWave(wormGut)}</path>
    <!-- a cross little face at its head end -->
    <g class="predator-face">${wormNod}
      <circle cx="17.6" cy="17" r="1.5" fill="#5b4630" />
      <circle cx="22.4" cy="17" r="1.5" fill="#5b4630" />
      <path d="M16 13.5 L18.8 14.8 M24 13.5 L21.2 14.8" stroke="#5b4630" stroke-width="1" stroke-linecap="round" />
      <path d="M18.2 22 Q20 20.8 21.8 22" fill="none" stroke="#5b4630" stroke-width="1" stroke-linecap="round" />
    </g>`;

// Each kind: its drawing and the box it's drawn in (head up, its middle at
// half the height), its outline as circles [forward, radius] along its
// middle in drawing units (the first is its head, which eats), what the
// pop-up says when it catches your pal, and what to call a few of them.
export const KINDS = {
  cyclops: {
    art: CYCLOPS_ART,
    box: [100, 140],
    // Its head and body. Its thin tail and antennae don't count, so brushing
    // past them is safe.
    outline: [[70 - 46, 26], [70 - 78, 15]],
    caught: (name) => `A Cyclops caught ${name}! These tiny one-eyed crustaceans hunt protists in ponds and puddles.`,
    plural: 'Cyclopes',
  },
  roundworm: {
    art: ROUNDWORM_ART,
    box: [40, 160],
    // All along it: it catches on contact anywhere. Its circles sit on its
    // middle line, a little wider than it, to cover its bends.
    outline: points(0.08, 0.92, 6).map((t) => [80 - wormY(t), wormWidth(t) + wormSway(t) / 2]),
    caught: (name) => `A predatory roundworm caught ${name}! Some small roundworms eat amoebae like ${name}.`,
    plural: 'roundworms',
  },
};

// Its drawing, head up; the game turns it to face the way it's swimming.
// Its own moving parts stay still for anyone who has asked for less motion.
export function predatorDrawing(kind) {
  const [width, height] = KINDS[kind].box;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = KINDS[kind].art;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    for (const wiggle of svg.querySelectorAll('animate, animateTransform')) wiggle.remove();
  }
  return svg;
}

// One predator of `kind` in the puddle. Positions are fractions of the
// puddle radius from the center, like the bacteria, so they stay put on a
// resize. `heading` is the way it faces, in radians. `random` returns 0 to
// 1, for the tests.
export function makePredator(water, { kind, fx, fy, heading, random = Math.random }) {
  const { outline, box } = KINDS[kind];
  const { size, surge, turn: turnRate } = PREDATORS[kind];
  // How far one drawing unit is, as a fraction of the puddle radius.
  const unit = ((size / 100) * 2) / box[0];
  const el = document.createElement('div');
  el.className = `predator ${kind}`;
  el.style.width = `${size}%`;
  const svg = predatorDrawing(kind);
  el.appendChild(svg);
  water.appendChild(el);
  const predator = {
    kind,
    el,
    fx,
    fy,
    heading,
    wander: 0,
    stroke: random(), // how far through its current stroke, 0 to 1, so they don't all swim in step
    full: 0, // ms left digesting its last meal, sitting still

    // Its outline as circles [fx, fy, r], in fractions of the puddle radius.
    body() {
      const [ux, uy] = [Math.cos(predator.heading), Math.sin(predator.heading)];
      return outline.map(([forward, r]) => [predator.fx + ux * forward * unit, predator.fy + uy * forward * unit, r * unit]);
    },
    // Its head, the part that eats, as [fx, fy, r].
    head: () => predator.body()[0],

    // How fast it's going right now, as a share of its average speed: it
    // speeds up and eases off smoothly through each stroke (the roundworm
    // not at all), never stopping.
    pace: () => 1 + surge * Math.sin(2 * Math.PI * predator.stroke),

    // It just ate: stop to digest for a while, its moving parts still too.
    eat() {
      predator.full = PREDATOR.FULL_MS;
      el.classList.add('full');
      svg.pauseAnimations?.();
    },

    // One frame: turn toward `target` ({ fx, fy }, or null to drift),
    // weaving a little, then swim on, staying in the water. While it's full,
    // it sits still.
    step(seconds, target) {
      if (predator.full > 0) {
        predator.full -= seconds * 1000;
        if (predator.full <= 0) {
          el.classList.remove('full');
          svg.unpauseAnimations?.();
        }
        return;
      }
      predator.stroke = (predator.stroke + (seconds * 1000) / PREDATOR.STROKE_MS) % 1;
      predator.wander += (random() - 0.5) * 6 * seconds;
      predator.wander = Math.max(-PREDATOR.WANDER, Math.min(PREDATOR.WANDER, predator.wander));
      // With nothing to chase, it patrols: on the way it's facing, or back
      // toward the middle once it reaches the edge.
      const atEdge = Math.hypot(predator.fx, predator.fy) >= PREDATOR.EDGE - 0.01;
      const aim = target ?? (atEdge ? { fx: 0, fy: 0 } : null);
      const wanted = aim
        ? Math.atan2(aim.fy - predator.fy, aim.fx - predator.fx) + predator.wander
        : predator.heading + predator.wander * seconds * 2;
      // Turn the short way round, no faster than it can.
      const turn = Math.atan2(Math.sin(wanted - predator.heading), Math.cos(wanted - predator.heading));
      const most = turnRate * seconds;
      predator.heading += Math.max(-most, Math.min(most, turn));
      const distance = PREDATOR.SPEED * predator.pace() * seconds;
      predator.fx += Math.cos(predator.heading) * distance;
      predator.fy += Math.sin(predator.heading) * distance;
      const out = Math.hypot(predator.fx, predator.fy);
      if (out > PREDATOR.EDGE) {
        predator.fx *= PREDATOR.EDGE / out;
        predator.fy *= PREDATOR.EDGE / out;
      }
      predator.place();
    },

    place() {
      el.style.left = `${50 + predator.fx * 50}%`;
      el.style.top = `${50 + predator.fy * 50}%`;
      // Drawn head up: turn it so its head leads.
      el.style.setProperty('--turn', `${(predator.heading * 180) / Math.PI + 90}deg`);
    },
  };
  predator.place();
  return predator;
}

// `count` predators of `kind`, spread evenly around the edge of the puddle,
// facing in.
export function predatorsAround(water, kind, count, random = Math.random) {
  const first = random() * 2 * Math.PI;
  return Array.from({ length: count }, (_, i) => {
    const angle = first + (2 * Math.PI * i) / count;
    return makePredator(water, {
      kind, fx: PREDATOR.EDGE * Math.cos(angle), fy: PREDATOR.EDGE * Math.sin(angle), heading: angle + Math.PI, random,
    });
  });
}

// What a predator at (fx, fy) goes after: your pal (`pal`, { fx, fy }) if
// she's within PREDATOR.NOTICE; otherwise the nearest of `cells` (her
// offspring, { fx, fy }), or null to patrol if there are none.
export function preyFor(fx, fy, cells, pal) {
  if (Math.hypot(pal.fx - fx, pal.fy - fy) < PREDATOR.NOTICE) return pal;
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
