// The bacteria Amy eats: tiny rods and round cells scattered through the
// water, gobbled up when any amoeba touches one, and replaced somewhere else
// a few seconds later (more drift in). `count` is how many are in the
// puddle at a time; `random` returns 0 to 1, for the tests.
export const RESPAWN_MS = 3000;
// Keep bacteria from clumping, as a fraction of the puddle radius.
export const MIN_GAP = 0.12;
// A few cheerful colors, so they read as food and not as more amoebas.
export const COLORS = ['#f97316', '#ec4899', '#eab308', '#22c55e', '#ef4444'];

export function scatterBacteria({ count = 10, random = Math.random } = {}) {
  const water = document.querySelector('.water');

  // Positions are stored relative to the puddle center, as fractions of the
  // puddle radius (-1 to 1), so they stay put when the window is resized.
  const bacteria = [];
  let stopped = false;

  function randomSpot(avoidX, avoidY) {
    for (let tries = 0; tries < 50; tries++) {
      // Uniform over the puddle, kept away from the edge.
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 0.82;
      const fx = Math.cos(angle) * distance;
      const fy = Math.sin(angle) * distance;
      const clearOfPal = Math.hypot(fx - avoidX, fy - avoidY) > 0.3;
      const clearOfOthers = bacteria.every((b) => Math.hypot(fx - b.fx, fy - b.fy) > MIN_GAP);
      if (clearOfPal && clearOfOthers) return { fx, fy };
    }
    return null; // the puddle is crowded; skip this one
  }

  function add(avoidX, avoidY) {
    if (stopped) return;
    const spot = randomSpot(avoidX, avoidY);
    if (!spot) return;
    const el = document.createElement('span');
    // About half are rods (bacilli), the rest round (cocci).
    const rod = random() < 0.5;
    el.className = `bacterium ${rod ? 'rod' : 'coccus'}`;
    el.style.setProperty('--color', COLORS[Math.floor(random() * COLORS.length)]);
    el.style.setProperty('--turn', `${Math.floor(random() * 180)}deg`);
    el.style.left = `${50 + spot.fx * 50}%`;
    el.style.top = `${50 + spot.fy * 50}%`;
    el.setAttribute('aria-hidden', 'true');
    water.appendChild(el);
    bacteria.push({ el, ...spot, r: rod ? 0.02 : 0.015 });
  }

  // Amy starts in the middle, so the first batch avoids the center.
  for (let i = 0; i < count; i++) add(0, 0);

  return {
    // Eat every bacterium touching a circle of radius `reach` at the given
    // spot (all values are fractions of the puddle radius). Returns how many
    // were eaten.
    eatNear(bx, by, reach) {
      let eaten = 0;
      for (let i = bacteria.length - 1; i >= 0; i--) {
        const bacterium = bacteria[i];
        if (Math.hypot(bacterium.fx - bx, bacterium.fy - by) > reach + bacterium.r) continue;
        bacteria.splice(i, 1);
        bacterium.el.classList.add('eaten');
        bacterium.el.addEventListener('transitionend', () => bacterium.el.remove(), { once: true });
        setTimeout(() => add(bx, by), RESPAWN_MS);
        eaten++;
      }
      return eaten;
    },
    // Where every bacterium is, as { fx, fy } in fractions of the puddle radius.
    positions() {
      return bacteria.map(({ fx, fy }) => ({ fx, fy }));
    },
    // No more new bacteria once the game is over.
    stop() {
      stopped = true;
    },
  };
}
