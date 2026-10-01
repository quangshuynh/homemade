<p align="center">
  <img src="docs/images/homemade-logo.png" alt="Homemade icon" width="256">
</p>

# Homemade

[![CI](https://github.com/quangshuynh/homemade/actions/workflows/ci.yml/badge.svg)](https://github.com/quangshuynh/homemade/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-powered-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

Homemade is a cozy baking game that runs in your browser. You name your own little kitchen, try out ingredients, discover recipes and fill a recipe book, with Marmalade the kitchen cat for company.

It is **not** an idle or clicker game. Nothing ticks up while you're away, and nothing can be farmed. It's a slow, hands-on game about making things.

## Status

**Interval 5: Progression, rewards, tutorial and mascot.** Through Interval 4 the game was a complete baking loop (pick up to five of 12 ingredients, mix, bake, discover 12 hand-written recipes, remember your last 50 bakes, Bake again) that installs and plays offline, with save files and quiet sounds. Interval 5 gives discoveries some weight:

- **Rarity:** every recipe has one fixed rarity, from Common to Mythic, shown as an ink stamp. It never changes between bakes; nothing is rolled.
- **Crumbs and Baker XP:** a recipe's *first* discovery earns both, by rarity. Rebakes and experiments earn nothing. Crumbs are the only currency: never bought, never expiring, never needed to bake.
- **Baker Levels 1–10:** levels open up ingredients. They never make baking faster or luckier.
- **Pantry additions:** new kitchens start with five ingredients (flour, sugar, butter, egg, vanilla). The other seven show their level and Crumb cost in the Pantry and are added for good. Existing kitchens keep every ingredient they already had.
- **Marmalade:** an original ginger chef-cat who reacts to big moments (a first card, a new rarity, a new level, a new ingredient) and stays quiet otherwise.
- **Tutorial:** a short, playable, skippable walk through a first bake for new kitchens, replayable from Settings without earning anything twice.
- **Reveal and sound:** first discoveries are revealed in rarity-paced beats with a chime that grows with rarity; reduced motion shows it all at once.

Saves live in the browser's IndexedDB (save version 4; older saves upgrade on load, with the original archived). No account, no server, nothing sent anywhere.

## Tech stack

- [React](https://react.dev) 19 + TypeScript
- [Vite](https://vite.dev) for dev server and builds
- Plain CSS with design tokens (no CSS framework)
- IndexedDB, through a small hand-written wrapper
- [Vitest](https://vitest.dev), Testing Library and `fake-indexeddb` for tests
- [oxlint](https://oxc.rs) for linting
- Self-hosted fonts via Fontsource: Gluten (display), Atkinson Hyperlegible Next (text), Shantell Sans (handwriting)
- Sound effects synthesised from scratch by `scripts/make-sounds.mjs`: no recordings or third-party audio

Runtime dependencies are React, React DOM and the three font packages. The service worker, audio and save-file code are hand-written, with no PWA or audio libraries.

## Running it locally

You need Node.js 22 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm test`          | Run the test suite once                       |
| `npm run test:watch`| Run tests in watch mode                       |
| `npm run typecheck` | TypeScript, no emit                           |
| `npm run lint`      | oxlint (warnings fail)                        |
| `npm run build`     | Type-check and build to `dist/`               |
| `npm run preview`   | Serve the production build                    |

The service worker only registers in production builds. To try offline and install behaviour, use `npm run build && npm run preview`.

**Resetting your save while developing:** go to Settings, choose **Start over…**, then confirm. You can also delete the `homemade` database under your browser devtools' Application → IndexedDB.

## Project layout

```
src/
  app/            App shell, routing, and the GameProvider that holds the current save
  audio/          Sound effects by meaning (`playSound('mix')`) and the Web Audio player
  components/     Reusable UI: recipe-box tabs, paper cards, buttons, dialog, illustrations
  domain/         Game rules and catalogs: ingredients, recipes, baking, progression, saves, names
  persistence/    Save schema, validation, migrations, save files, the IndexedDB repository
  pwa/            Service worker registration, update notice state, install offer
  mascot/         What Marmalade says, and when
  screens/        One file per screen (onboarding, kitchen, bake, recipe book, memories, pantry, settings)
  tutorial/       The first-time tutorial: its step machine, provider and card
  styles/         Design tokens and base styles
  assets/         Static art and the synthesised sounds
service-worker/   The offline worker and the Vite plugin that builds it into dist/sw.js
public/           Manifest and app icons
scripts/          Generators for the app icons and sounds (outputs are committed)
```

A few design decisions worth knowing:

- **The UI never touches IndexedDB.** Screens call `updateSave(change)` from `GameProvider`. The provider updates the screen right away and writes through a `SaveRepository` interface in the background. Autosave, cloud sync or a different storage backend can plug in behind that interface later.
- **Game rules live in `domain/`.** Ingredients and recipes are static catalogs with stable ids, and saves store only ids. Matching, discovery and bowl rules are pure functions (`domain/baking.ts`), and screens call them rather than deciding anything themselves.
- **A bake is one save write.** `recordBake` returns the whole next save (the remembered batch, any discovery and its reward), so a bake can't be half-saved or paid twice. Adding an ingredient is one write too. History is capped by `MAX_BAKED_CREATIONS`.
- **Balance lives in one file.** Rarity rewards, level thresholds and ingredient costs are in `domain/progression.ts`, and a test checks that no order of choices can leave a player stuck.
- **Everything read from storage is checked.** `persistence/schema.ts` validates stored data and runs any migrations before the game sees it. Each save has a `version`. A save that can't be read is **never deleted automatically**: the player sees what went wrong and can download a copy, try again, or set it aside. Setting it aside moves it to an archive store rather than deleting it. Before a migrated save is written back, the original is archived too.
- **IDs are stable and typed.** Players, recipes, ingredients and creations use prefixed, branded string IDs (`player_…`, `recipe_…`). Nothing is keyed by display name.
- **Navigation is hash-based** (`#/bake`, `#/settings`): real links, working back button, no server config.
- **The service worker never touches the save.** It caches only this build's own files, answers only same-origin GET requests, and a new version waits for the player's *Refresh*. Updating or removing it can't affect IndexedDB.
- **Imports go through the same door as loads.** A save file is read with the same validation and migrations as stored data, and installing one archives the current save in the same transaction.

## Deploying

Homemade is a static site with no environment variables, secrets or backend. On Vercel (or any static host), the defaults are enough: build with `npm run build` and serve `dist/`. No `vercel.json` is needed: routing lives in the URL hash, so there are no rewrites, and the default `max-age=0, must-revalidate` headers are what `index.html` and `sw.js` want. Serve over HTTPS (required for the service worker; IndexedDB works either way).

## Accessibility

Semantic landmarks and headings, real links and buttons, a skip link, visible focus rings, and focus that moves to each new screen's heading after navigation. Text meets WCAG AA contrast. Everything works with a keyboard alone, touch targets are at least 44px, and focus is never hidden under the phone tab bar. Motion respects `prefers-reduced-motion` unless the player overrides it in Settings, and nothing relies on animation to convey meaning. Sound and motion are separate settings.

Rarity is always written, never colour alone; Marmalade's lines are plain text; the tutorial works with a keyboard alone and can be skipped at any point. Browser checks are recorded in [`docs/verification/`](docs/verification/) ([Interval 4](docs/verification/interval-4.md), [Interval 5](docs/verification/interval-5.md)).

## Where it's heading

Likely next: recipe families and more recipes to discover, then story chapters and decorating your kitchen. Cloud saves, accounts and multiplayer aren't planned for the near term.

## Design direction

Homemade should feel warm, tactile, handmade and a little imperfect, like a real kitchen counter with a recipe box on it, not a web app. `PRODUCT.md` and `DESIGN.md` record the product and visual direction; the design was checked with [Impeccable](https://impeccable.style).
