<p align="center">
  <img src="docs/images/homemade-logo.png" alt="Homemade icon" width="256">
</p>

# Homemade

[![CI](https://github.com/quangshuynh/homemade/actions/workflows/ci.yml/badge.svg)](https://github.com/quangshuynh/homemade/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-powered-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

Homemade is a cozy baking game that runs in your browser. You name your own little kitchen, and over time you'll discover recipes, try out ingredients, fill a recipe book and make the place your own.

It is **not** an idle or clicker game. Nothing ticks up while you're away, and there's no counter to grind. It's a slow, hands-on game about making things.

## Status

**Interval 1: Foundation.** There is no baking yet. This first interval puts in the base everything else will sit on:

- **First launch:** you give your name (or a nickname) and a name for your kitchen. Both are saved in this browser.
- **Home Kitchen:** your kitchen's name, a greeting, and a counter with the mixing bowl (Bake), the recipe box (Recipe Book) and the pantry jar (Pantry).
- **Bake, Recipe Book and Pantry** exist as places you can visit, but each one says plainly that it is empty or not built yet. None of them contain made-up content.
- **Settings:** a sound preference (stored for later, since there's no audio yet), a motion preference (match your device, keep things still, or let things move), and **Start over**, which asks you to confirm before it clears the save.
- **Returning players** skip setup and go straight back to their kitchen.

Saves live in the browser's IndexedDB. No account is needed and nothing is sent anywhere.

## Tech stack

- [React](https://react.dev) 19 + TypeScript
- [Vite](https://vite.dev) for dev server and builds
- Plain CSS with design tokens (no CSS framework)
- IndexedDB, through a small hand-written wrapper
- [Vitest](https://vitest.dev), Testing Library and `fake-indexeddb` for tests
- [oxlint](https://oxc.rs) for linting
- Self-hosted fonts via Fontsource: Gluten (display), Atkinson Hyperlegible Next (text), Shantell Sans (handwriting)

Runtime dependencies are React, React DOM and the three font packages.

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

**Resetting your save while developing:** go to Settings, choose **Start over…**, then confirm. You can also delete the `homemade` database under your browser devtools' Application → IndexedDB.

## Project layout

```
src/
  app/          App shell, routing, and the GameProvider that holds the current save
  components/   Reusable UI: recipe-box tabs, paper cards, buttons, dialog, illustrations
  domain/       Game types and pure logic (IDs, save creation, settings updates)
  persistence/  Save schema, validation and migrations, and the IndexedDB repository
  screens/      One file per screen (onboarding, kitchen, bake, recipe book, pantry, settings)
  styles/       Design tokens and base styles
  assets/       Static art (the butcher-block counter)
  test/         Test setup and fixtures
```

A few design decisions worth knowing:

- **The UI never touches IndexedDB.** Screens call `updateSave(change)` from `GameProvider`. The provider updates the screen right away and writes through a `SaveRepository` interface in the background. Autosave, cloud sync or a different storage backend can plug in behind that interface later.
- **Everything read from storage is checked.** `persistence/schema.ts` validates stored data and runs any migrations before the game sees it. Each save has a `version`. A save that can't be read is **never deleted automatically**: the player sees what went wrong and can download a copy, try again, or set it aside. Setting it aside moves it to an archive store rather than deleting it. Before a migrated save is written back, the original is archived too.
- **IDs are stable and typed.** Players, recipes, ingredients and creations use prefixed, branded string IDs (`player_…`, `recipe_…`). Nothing is keyed by display name.
- **Navigation is hash-based** (`#/bake`, `#/settings`): real links, working back button, no server config.

## Accessibility

Semantic landmarks and headings, real links and buttons, a skip link, visible focus rings, and focus that moves to each new screen's heading after navigation. Text meets WCAG AA contrast. Everything works with a keyboard alone. Motion respects `prefers-reduced-motion` unless the player overrides it in Settings, and nothing relies on animation to convey meaning.

## Where it's heading

Later intervals are expected to add, roughly in this order:

- Mixing ingredients and baking, with recipes discovered by experimenting
- A recipe book that fills in as you discover things
- A pantry of ingredients
- Collecting what you bake
- Decorating your kitchen or bakery

None of these exist yet. Cloud saves, accounts and multiplayer are not planned for the near term.

## Design direction

Homemade should feel warm, tactile, handmade and a little imperfect, like a real kitchen counter with a recipe box on it, not a web app. `PRODUCT.md` and `DESIGN.md` record the product and visual direction; the design was checked with [Impeccable](https://impeccable.style).
