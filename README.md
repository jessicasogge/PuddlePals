# PuddlePals

A cute microbiology game for the browser, about **protists**: the tiny living things in ponds and puddles. The sister game to [PetriPals](https://github.com/jessicasogge/petripals), built on the same engine.

## What's here so far

1. **A home page.** Tap the pal there and she divides in two, the way an amoeba does (binary fission).
2. **A pal picker**, with one pal so far. Picking her doesn't open anything yet.
3. **Who’s That Pal?**, a quiz on the pals' fun facts. You get one fact with "this pal" in place of her name: tap the pal it's about. There's no score, so it's just for learning.

## The pals

| Pal | Species | Shape |
|---|---|---|
| **Amy** | *Amoeba proteus* | Lilac blob reaching out with rounded pseudopods |

To add a pal: add her drawing to `public/game/pals.js`, her species to `public/game/config.js`, and her quiz facts to `public/game/quiz-facts.js`.

## Running it

The game is just the files in `public/`, so any static server works. To run it locally:

```sh
npm install
npm run dev     # http://localhost:3000
npm test        # the tests
```

Pushing to `main` runs the tests and publishes `public/` to GitHub Pages (`.github/workflows/pages.yml`).
