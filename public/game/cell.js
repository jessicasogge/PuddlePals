import { GAME } from './config.js';
import { idlePose, newMover } from './mover.js';
import { coaster } from './physics.js';

// A single cell, like Amy. Each division she splits in two and the two cells
// go their separate ways.
export function cellGroup({ mover, svg, species, isPlayer }) {
  // How wide the drawing is, as a percent of the puddle (see `size` in config.js).
  const WIDTH = species.size;

  const group = {
    mover,
    svg,
    isPlayer,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    facing: 1,
    cellCount: () => 1,
    // The drawing's size before any idle animation stretches or turns it.
    halfWidth: () => mover.offsetWidth / 2,
    reach: () => group.halfWidth(),
    update() {
      const width = `${WIDTH}%`;
      if (mover.style.width !== width) mover.style.width = width;
    },
    place() {
      mover.style.transform = `translate(${group.x}px, ${group.y}px) scaleX(${group.facing})`;
    },
    // Her outline as circles in the puddle, traced from her drawing (see
    // `body` in config.js). Used to tell whether she touches a bacterium or
    // a predator. The player's follows her idle animation, so touches match
    // the screen.
    body() {
      const w = group.halfWidth() * 2;
      const pose = isPlayer ? idlePose(svg) : (x, y, r) => [x, y, r];
      return species.body.map(([fx, fy, fr]) => {
        const [x, y, r] = pose(fx * w, fy * w, fr * w);
        return [group.x + x * group.facing, group.y + y, r];
      });
    },
    // Split in two. The new cell slides off the way the parent faces (a
    // little up or down at random); an offspring that divides slides back
    // the other way and settles again. The player stays where she is.
    divide(puddleRadius) {
      const copy = svg.cloneNode(true);
      // Offspring sit still, so their cilia don't beat either (and a puddle
      // full of them stays smooth).
      for (const wiggle of copy.querySelectorAll('animate')) wiggle.remove();
      const child = cellGroup({ mover: newMover(copy), svg: copy, species, isPlayer: false });
      child.x = group.x;
      child.y = group.y;
      child.facing = group.facing;
      const burst = GAME.BURST_SPEED * puddleRadius;
      child.vx = group.facing * burst;
      child.vy = (Math.random() - 0.5) * 0.4 * burst;
      if (!isPlayer) {
        group.vx = -child.vx;
        group.vy = -child.vy;
        group.age = 0;
      }
      return child;
    },
    coast: null,
  };
  group.coast = coaster(group);
  return group;
}
