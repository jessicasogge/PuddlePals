// The puddle game loop: steer Amy with the arrow keys or by touch, eat
// bacteria to divide and grow a colony, keep away from the Cyclops, and the
// level-complete, win or game-over pop-up.
import { cellGroup } from './cell.js';
import { makeColony, moveGroups } from './colony.js';
import { CYCLOPS, GAME, LEVELS } from './config.js';
import { cyclopsAround, preyFor } from './cyclops.js';
import { showFact } from './facts.js';
import { arrowKeys } from './keyboard.js';
import { goTo } from './loading.js';
import { steer, touchSteering } from './touch.js';

// Whether any of circles `a` touches any of circles `b` (all [x, y, r]).
export const touching = (a, b) => a.some(([ax, ay, ar]) => b.some(([bx, by, br]) => Math.hypot(ax - bx, ay - by) < ar + br));

// `you` is { svg, species }: your pal's drawing on the page and her settings
// from config.js. `level` is which level this is (1 to LEVELS.length), and
// `target` how many bacteria she has to eat herself to beat it (her
// offspring eat and divide too, but don't count). `random` returns 0 to 1, for
// the tests. Returns the Cyclopes, for the tests.
export function playPuddle({
  you, food, level = 1, target = LEVELS[level - 1].target, random = Math.random,
}) {
  const water = document.querySelector('.water');
  const counter = document.querySelector('.cell-count');
  const puddleRadius = () => water.clientWidth / 2;
  const pal = you.svg.dataset.pal;
  const name = you.svg.dataset.name;

  // The player's pal leads the colony.
  const playerMover = document.querySelector('.pal-mover');
  playerMover.classList.add('player');
  const leader = cellGroup({ mover: playerMover, svg: you.svg, species: you.species, isPlayer: true });
  // Only what your pal eats herself counts toward winning. There's no cap
  // on the colony's size, since it's the bacteria that count.
  let eaten = 0;
  const colony = makeColony({
    leader, food, puddleRadius, color: you.species.color,
    onLeaderEat: (ate) => {
      eaten += ate;
      updateCounter();
    },
  });
  const hunters = cyclopsAround(water, LEVELS[level - 1].cyclops, random);

  let finished = false;
  let lastTime = null;
  let elapsed = 0; // ms since the start
  let lost = 0; // offspring the Cyclopes have eaten
  const keys = arrowKeys();
  // Drag with a finger anywhere on the puddle, muddy bank included (or hold
  // a mouse button where to go).
  const touch = touchSteering(water, water.closest('.puddle') ?? water);

  // The pop-up's buttons: the main one goes to the next level, back to
  // level 1, or tries this level again; after a game over, "Start over" goes
  // back to level 1. "Pick a pal" goes back to the picker.
  let nextLevel = level;
  function goToLevel(n) {
    const url = new URL(window.location.href);
    url.searchParams.set('level', n);
    goTo(url.toString());
  }
  document.querySelector('.play-again').addEventListener('click', () => goToLevel(nextLevel));
  document.querySelector('.start-over').addEventListener('click', () => goToLevel(1));
  document.querySelector('.back-to-picker').addEventListener('click', () => goTo('./pal-picker.html'));

  function updateCounter() {
    counter.textContent = `Level ${level} · ${Math.min(eaten, target)} / ${target} bacteria`;
  }

  function step(time) {
    const seconds = lastTime === null ? 0 : Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    const radius = puddleRadius();

    if (!finished) {
      steer(leader, keys.direction(), touch.target(), GAME.SPEED * radius * seconds, GAME.ARRIVE * radius,
        touch.drag(), GAME.DRAG_SPEED * radius * seconds);
    }

    colony.tick(seconds);
    moveGroups(colony.groups, { water, radius, seconds });

    if (!finished) {
      elapsed += seconds * 1000;
      if (elapsed >= CYCLOPS.START_MS) hunt(seconds, radius);
    }

    if (!finished) {
      colony.eat(seconds, radius);
      if (eaten >= target) win();
      else colony.divideLeader();
    }

    requestAnimationFrame(step);
  }

  // Every Cyclops swims after its prey and eats any offspring its head
  // touches, then stops to digest. Touching Amy herself is game over.
  function hunt(seconds, radius) {
    const amy = { fx: leader.x / radius, fy: leader.y / radius };
    const px = (circle) => circle.map((value) => value * radius);
    for (const cyclops of hunters) {
      const offspring = colony.groups
        .filter((group) => group !== leader)
        .map((group) => ({ fx: group.x / radius, fy: group.y / radius }));
      cyclops.step(seconds, preyFor(cyclops.fx, cyclops.fy, offspring, amy));
      // A full one is busy digesting, and doesn't eat again until it's done.
      if (cyclops.full <= 0) {
        const gobbled = colony.popTouching([px(cyclops.head())]);
        if (gobbled > 0) cyclops.eat();
        lost += gobbled;
      }
      if (touching(leader.body(), cyclops.body().map(px))) {
        lose();
        return;
      }
    }
  }

  function stop() {
    finished = true;
    keys.stop();
    touch.stop();
    food.stop();
  }

  function win() {
    stop();
    // The pop-up waits only until the newest cell has finished sliding into place.
    setTimeout(() => {
      showFact(pal);
      if (level < LEVELS.length) {
        nextLevel = level + 1;
        showBanner(`Level ${level} complete!`, `${name} ate ${target} bacteria!`, `Play level ${nextLevel}`);
      } else {
        nextLevel = 1;
        showBanner('You won!', `You beat all ${LEVELS.length} levels! ${name} ate ${target} bacteria with the Cyclopes all around.`, 'Play again');
      }
    }, Math.max(0, GAME.DIVIDE_MS - colony.sinceAnyDivision));
  }

  function lose() {
    stop();
    playerMover.classList.add('killed');
    setTimeout(() => {
      showFact(pal);
      const offspring = lost === 0 ? '' : ` It ate ${lost} of her offspring first.`;
      showBanner('Game over',
        `A Cyclops caught ${name}! These tiny one-eyed crustaceans hunt protists in ponds and puddles.${offspring}`,
        `Try level ${level} again`, { startOver: level > 1 }); // on level 1 "Start over" would just try again
    }, 500);
  }

  function showBanner(title, message, button, { startOver = false } = {}) {
    const banner = document.querySelector('.win-banner');
    banner.querySelector('h2').textContent = title;
    banner.querySelector('.win-message').textContent = message;
    banner.querySelector('.play-again').textContent = button;
    banner.querySelector('.start-over').hidden = !startOver;
    banner.removeAttribute('hidden');
    banner.querySelector('.play-again').focus();
  }

  // Keep the how-to-play target in step with the real one.
  for (const el of document.querySelectorAll('.target-food')) el.textContent = target;
  updateCounter();
  requestAnimationFrame(step);
  return { hunters, colony };
}
