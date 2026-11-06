# PuddlePals

A cute microbiology game for the browser, about **protists**: the tiny living things in ponds and puddles. The sister game to [PetriPals](https://github.com/jessicasogge/petripals), built on the same engine.

## What's here so far

1. **A home page.** Tap the pal there and she divides in two, the way an amoeba does (binary fission).
2. **A pal picker.** Pick a pal to play in the puddle.
3. **The puddle.** Move your pal around a puddle eating bacteria (see below).
4. **Who’s That Pal?**, a quiz on the pals' fun facts. You get one fact with "this pal" in place of her name: tap the pal it's about. There's no score, so it's just for learning.

## The puddle

Use the arrow keys, or on a touch screen, touch the puddle and slide your finger. Like Phage Attack in PetriPals, your pal has to eat a set number of bacteria herself to finish each level. Every time a cell eats a bacterium, it divides in two. The offspring left behind eat and divide too, but what they eat doesn't count.

Watch out for your pal's **predator**. It's bigger than her and swims smoothly after its prey. It goes after her offspring, and stops to digest each one it eats, so the offspring she leaves behind buy her time. If she comes too close, it comes after her. If it catches her, it's game over.

| Pal | Predator |
|---|---|
| Amy | A **predatory roundworm**: a slender, pale worm, tapered at both ends. Nematodes are listed among *Amoeba proteus*'s predators; it's not meant as any one named species, and the way it patrols is the game's own. |
| Pam | A **Cyclops**: a copepod, a tiny one-eyed crustacean that hunts protists. |
| Grace | A **predatory rotifer** like *Asplanchna*: a see-through sac with a crown of beating cilia. In a lab study (Maly 1975), *Asplanchna* ate *Euglena* but couldn't survive on it alone. A real one is roughly ten times Grace's length or more; the game draws it about 3.5 times her length, so she can still play. |

There are five levels. Each one takes 5 more bacteria than the last (20, 25, 30, 35, then 40), with one predator on level 1, two on level 2, and so on up to five on level 5. The numbers are in `public/game/config.js` (`LEVELS`, `PREDATORS`, `PREDATOR` and `GAME`).

## The pals

| Pal | Species | Shape |
|---|---|---|
| **Amy** | *Amoeba proteus* | Lilac blob reaching out with rounded pseudopods |
| **Pam** | *Paramecium caudatum* | Pink slipper fringed with beating cilia |
| **Grace** | *Euglena gracilis* | Green spindle with a red eyespot and one long whipping flagellum |

To add a pal: add her drawing to `public/game/pals.js`, her species to `public/game/config.js`, and her quiz facts to `public/game/quiz-facts.js`.

## Running it

The game is just the files in `public/`, so any static server works. To run it locally:

```sh
npm install
npm run dev     # http://localhost:3000
npm test        # the tests
```

Pushing to `main` runs the tests and publishes `public/` to GitHub Pages (`.github/workflows/pages.yml`).
