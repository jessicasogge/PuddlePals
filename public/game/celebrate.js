// The win burst: when Amy (or Pam) finishes a level, little blobs in the
// puddle's colors burst out from her and drift down, like the spore burst
// in PetriPals. Uses canvas-confetti (vendor/confetti.js, v1.9.4, ISC
// license), copied in because the game is plain files with no build step.
import { COLORS } from './bacteria.js';
import confetti from './vendor/confetti.js';

// The bacteria's colors, puddle blue, and Amy's lilac and Pam's pink.
export const PUDDLE_COLORS = [...COLORS, '#5fc0ec', '#c4b5fd', '#f9a8d4'];

// A slightly lumpy blob shape. Made the first time it's needed; plain
// circles if the browser can't draw custom shapes.
let blob;
function lumpy() {
  if (blob === undefined) {
    try {
      blob = confetti.shapeFromPath({ path: 'M6 0C9 0 12 2 12 6C12 9 10 12 6 12C2 12 0 10 0 6C0 3 3 0 6 0Z' });
    } catch {
      blob = 'circle';
    }
  }
  return blob;
}

// Where to burst from, as fractions of the window (0 to 1, what
// canvas-confetti wants), given the box of the element to burst from.
// The middle of the window if there's no box.
export function burstOrigin(rect, width, height) {
  if (!rect || !width || !height) return { x: 0.5, y: 0.5 };
  const clamp = (n) => Math.min(1, Math.max(0, n));
  return {
    x: clamp((rect.left + rect.width / 2) / width),
    y: clamp((rect.top + rect.height / 2) / height),
  };
}

// Burst out of `el` (the player's pal). Beating a level gets a quick little
// puff; `big` is for beating the last level: a full burst in three waves
// that floats down slowly.
export function celebrate(el, { big = false } = {}) {
  try {
    const base = {
      origin: burstOrigin(el?.getBoundingClientRect(), window.innerWidth, window.innerHeight),
      colors: PUDDLE_COLORS,
      shapes: [lumpy(), 'circle'],
      spread: 360, // every direction
      disableForReducedMotion: true,
    };
    if (!big) {
      // Under a second: fewer blobs, not flung as far, and they fade fast.
      confetti({ ...base, particleCount: 30, startVelocity: 15, scalar: 0.9,
        gravity: 0.6, decay: 0.9, ticks: 90 });
      return;
    }
    const floaty = { ...base, gravity: 0.35, decay: 0.92, ticks: 250 };
    // One big burst, then a slower wave of fine blobs, then one more pop.
    confetti({ ...floaty, particleCount: 240, startVelocity: 30, scalar: 1.1 });
    setTimeout(() => {
      confetti({ ...floaty, particleCount: 120, startVelocity: 15, scalar: 0.6, drift: 0.4 });
    }, 180);
    setTimeout(() => confetti({ ...floaty, particleCount: 150, startVelocity: 40, scalar: 0.9 }), 450);
  } catch {
    // A celebration is never worth breaking the game over.
  }
}
