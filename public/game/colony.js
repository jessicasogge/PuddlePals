// A colony: one pal (its "leader", the cell that's steered) and all the
// offspring it grows. It eats bacteria, divides, and counts its cells.
import { GAME } from './config.js';
import { keepInPuddle, pushApart, pushInsideRim } from './physics.js';

// `leader` is the steered group, `food` the bacteria (bacteria.js), `target`
// the size the colony stops dividing at (none unless given). `onDivide` is
// called after every division and `onPop` after a predator gobbles up
// offspring. `onLeaderEat` is told how many bacteria the leader herself just
// ate (only those count toward finishing a level). `color` tints the pop.
export function makeColony({
  leader, food, puddleRadius, target = Infinity, color = '#94a3b8',
  onDivide = () => {}, onPop = () => {}, onLeaderEat = () => {},
}) {
  const groups = [leader];
  let pending = 0; // bacteria the leader has eaten toward her next division
  let sinceDivision = Infinity; // ms since the leader last divided

  const colony = {
    leader,
    groups,
    sinceAnyDivision: Infinity, // ms since any of its cells last divided
    cellCount: () => groups.reduce((sum, g) => sum + g.cellCount(), 0),

    tick(seconds) {
      sinceDivision += seconds * 1000;
      colony.sinceAnyDivision += seconds * 1000;
    },

    // Binary fission: a cell divides in two and the daughter slides off on
    // her own.
    divide(group) {
      colony.sinceAnyDivision = 0;
      const offspring = group.divide(puddleRadius());
      // Size and position the new cell right away. Otherwise the browser
      // draws it once in the middle of the puddle before this frame's
      // positioning catches up, which shows up as a flash.
      offspring.update(0);
      offspring.place();
      groups.push(offspring);
      onDivide(offspring);
    },

    // Every cell eats any bacterium it touches. Offspring divide as soon as
    // they've eaten enough; the leader's division waits for divideLeader().
    eat(seconds, radius) {
      for (const [x, y, reach] of leader.body()) {
        const ate = food.eatNear(x / radius, y / radius, reach / radius);
        pending += ate;
        if (ate > 0) onLeaderEat(ate);
      }
      for (const group of [...groups]) {
        if (group === leader) continue;
        group.pending ??= 0;
        group.sinceDivision = (group.sinceDivision ?? Infinity) + seconds * 1000;
        for (const [x, y, reach] of group.body()) {
          group.pending += food.eatNear(x / radius, y / radius, reach / radius);
        }
        if (group.pending >= GAME.FOOD_PER_DIVISION && group.sinceDivision > GAME.DIVIDE_MS &&
            colony.cellCount() < target) {
          group.pending -= GAME.FOOD_PER_DIVISION;
          group.sinceDivision = 0;
          colony.divide(group);
        }
      }
    },

    // Any offspring touching one of `circles` ([x, y, r] in px from the
    // puddle center, like a predator's mouth) is eaten: it pops and is gone.
    // (The leader being caught is game over, which the game itself handles.)
    // Returns how many were eaten.
    popTouching(circles) {
      let popped = 0;
      for (const group of [...groups]) {
        if (group === leader) continue;
        const touching = group.body().some(([x, y, r]) =>
          circles.some(([cx, cy, cr]) => Math.hypot(x - cx, y - cy) < r + cr));
        if (!touching) continue;
        showPop(group.mover.parentElement, [group.x, group.y, group.reach()], color);
        groups.splice(groups.indexOf(group), 1);
        group.mover.remove();
        popped++;
      }
      if (popped > 0) onPop(popped);
      return popped;
    },

    // Divide the leader if she has eaten enough and isn't still mid-division.
    divideLeader() {
      if (pending < GAME.FOOD_PER_DIVISION || sinceDivision <= GAME.DIVIDE_MS) return;
      pending -= GAME.FOOD_PER_DIVISION;
      sinceDivision = 0;
      colony.divide(leader);
    },
  };
  return colony;
}

// Move an offspring group by [dx, dy] and stop it sliding back the way it
// was pushed from.
function nudge(group, [dx, dy]) {
  if (dx === 0 && dy === 0) return;
  group.x += dx;
  group.y += dy;
  const length = Math.hypot(dx, dy);
  const against = -(group.vx * dx + group.vy * dy) / length;
  if (against > 0) {
    group.vx += (against * dx) / length;
    group.vy += (against * dy) / length;
  }
}

// A little "pop" where a cell was eaten: a ring in the pal's color that
// bursts outward and fades (see .pop in styles.css). `circle` is [x, y, r]
// in px from the puddle center.
export function showPop(water, [x, y, r], color) {
  if (!water) return;
  const ring = document.createElement('div');
  ring.className = 'pop';
  ring.setAttribute('aria-hidden', 'true');
  ring.style.left = `calc(50% + ${x}px)`;
  ring.style.top = `calc(50% + ${y}px)`;
  ring.style.width = `${2 * r}px`;
  ring.style.borderColor = color;
  water.appendChild(ring);
  const remove = () => ring.remove();
  ring.addEventListener('animationend', remove);
  setTimeout(remove, 1000); // in case the animation never runs
}

// One frame of movement for every group in the puddle: offspring slide and
// settle, nobody lands on top of anybody, offspring stay inside the edge,
// and the leader stays in the water. The leader (isPlayer) moves over
// everything.
export function moveGroups(groups, { water, radius, seconds }) {
  // The puddle can change size mid-game (a phone turned sideways, a resized
  // window). Groups are placed in px from its center, so scale them along
  // with it; the bacteria and predators are kept as fractions of the radius,
  // so without this the cells would drift relative to them.
  if (radius > 0) {
    for (const group of groups) {
      const scale = group.puddleRadius ? radius / group.puddleRadius : 1;
      if (scale !== 1) {
        group.x *= scale;
        group.y *= scale;
        group.vx *= scale;
        group.vy *= scale;
      }
      group.puddleRadius = radius;
    }
  }
  for (const group of groups) {
    if (!group.isPlayer) group.coast(seconds);
    group.update(seconds);
  }
  // Measure every group once, after all the size changes, instead of
  // measuring between writes (which makes the browser re-lay-out each time).
  for (const group of groups) group.size = group.reach();
  pushApart(groups);
  for (const group of groups) {
    if (group.isPlayer) {
      [group.x, group.y] = keepInPuddle(water, group.x, group.y, group.size, group);
    } else {
      nudge(group, pushInsideRim(group.body(), radius));
    }
    group.place();
  }
}
