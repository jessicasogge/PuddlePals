// Each pal's species details
//
// `scientific` is her species name
// `color` is for her name when it's filled in on Who’s That Pal?
// `tile` is the background of her tile on the picker and the quiz
// `kind` is what sort of protist she is
// `size` is how wide she's drawn in the puddle, as a percent of the puddle
// `body` traces her drawing's outline as circles [x, y, radius], in
// fractions of the drawing's width from its center. It's what counts as
// touching a bacterium or a predator.
export const SPECIES = {
  amy: {
    scientific: 'Amoeba proteus',
    color: '#6d28d9',
    tile: 'rgba(196, 181, 253, 0.45)',
    kind: 'amoeba',
    size: 11,
    body: [
      [0, 0.047, 0.279], // the middle of her
      // her pseudopods
      [0.058, -0.337, 0.07],
      [0.395, -0.047, 0.076],
      [0.291, 0.349, 0.07],
      [-0.326, 0.302, 0.07],
      [-0.314, -0.151, 0.07],
    ],
  },
};

// Each level needs a bigger colony, and some add another Cyclops.
export const LEVELS = [
  { target: 4, cyclops: 1 },
  { target: 8, cyclops: 1 },
  { target: 12, cyclops: 2 },
  { target: 16, cyclops: 2 },
  { target: 24, cyclops: 3 },
];

// The Cyclops (game/cyclops.js): a copepod, a tiny one-eyed crustacean that
// hunts protists. Much bigger than Amy, slower on average, and it swims in
// hops: a quick kick, then a glide.
export const CYCLOPS = {
  SIZE: 15, // how wide it's drawn, as a percent of the puddle (Amy is 11)
  SPEED: 0.28, // average speed, as a fraction of the puddle radius per second
  HOP_MS: 900, // one kick and glide
  KICK: 0.3, // the share of each hop spent kicking
  KICK_SPEED: 1.8, // how fast it kicks, as a multiple of its average speed
  TURN: 2.4, // how fast it can turn, in radians per second
  WANDER: 0.6, // how much it weaves off course, in radians
  // It goes after Amy only when she comes this close (a fraction of the
  // puddle radius); otherwise after her offspring, or it drifts around.
  NOTICE: 0.5,
  START_MS: 1500, // it waits this long before it starts, so you get a head start
  FULL_MS: 2500, // after eating an amoeba it stops this long to digest
  EDGE: 0.8, // how far from the middle it can go, as a fraction of the radius
};

export const GAME = {
  BACTERIA: 12, // bacteria in the puddle at a time
  FOOD_PER_DIVISION: 1, // bacteria an amoeba eats before dividing
  SPEED: 0.7, // Amy's speed, as a fraction of the puddle radius per second
  // Steering with a mouse, how close to the pointer counts as there (so she
  // settles instead of jittering on the spot), as a fraction of the radius.
  ARRIVE: 0.01,
  // Dragging her with a finger, she moves as far as the finger does, up to
  // DRAG_SPEED (a fraction of the puddle radius per second).
  DRAG_SPEED: 2,
  // How hard a new cell pushes away when it splits off. It slides about
  // BURST_SPEED / SETTLE_RATE of the puddle radius before it stops.
  BURST_SPEED: 0.1,
  SETTLE_RATE: 4, // how quickly a new cell slows to a stop (higher = sooner)
  SETTLE_MS: 1500, // after this long, offspring stay put for good
  // How close two new cells can settle before they nudge each other apart:
  // their centers stay at least SPACING times their combined reach apart.
  SPACING: 0.5,
  DIVIDE_MS: 600,
};
