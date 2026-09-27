# Homemade

Homemade is a cozy baking game that runs in your browser. You name your own little kitchen, try out ingredients, discover recipes and fill a recipe book.

It is **not** an idle or clicker game. Nothing ticks up while you're away, and there's no counter to grind. It's a slow, hands-on game about making things.

## Status

**Interval 4: Mobile and portability.** The baking game is complete through Interval 3 (pick up to five of 12 ingredients, mix, bake, discover 12 hand-written recipes, remember your last 50 bakes, Bake again from the Recipe Book). Interval 4 made it a proper mobile, installable web game:

- **Phones first:** safe-area aware layout, a tab bar that never covers content or focus, and a Bake screen whose Mix button stays in reach.
- **Installable and offline:** a web app manifest, app icons and a small service worker. Once loaded, Homemade opens and plays without a connection. New versions wait for the player to choose *Refresh*.
- **Save files:** download your kitchen as a `.json` file and open it in another browser. Imports are validated, upgraded if older, summarised, and only replace your kitchen after you confirm; the old one is archived, never deleted.
- **Names:** change your name or your kitchen's name in Settings.
- **Sound:** five quiet, self-made kitchen sounds, governed by the sound setting.

Saves live in the browser's IndexedDB (save version 3). No account, no server, nothing sent anywhere.

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
  domain/         Game rules and catalogs: ingredients, recipes, baking, saves, names
  persistence/    Save schema, validation, migrations, save files, the IndexedDB repository
  pwa/            Service worker registration, update notice state, install offer
  screens/        One file per screen (onboarding, kitchen, bake, recipe book, memories, pantry, settings)
  styles/         Design tokens and base styles
  assets/         Static art and the synthesised sounds
service-worker/   The offline worker and the Vite plugin that builds it into dist/sw.js
public/           Manifest and app icons
scripts/          Generators for the app icons and sounds (outputs are committed)
```

A few design decisions worth knowing:

- **The UI never touches IndexedDB.** Screens call `updateSave(change)` from `GameProvider`. The provider updates the screen right away and writes through a `SaveRepository` interface in the background. Autosave, cloud sync or a different storage backend can plug in behind that interface later.
- **Game rules live in `domain/`.** Ingredients and recipes are static catalogs with stable ids, and saves store only ids. Matching, discovery and bowl rules are pure functions (`domain/baking.ts`), and screens call them rather than deciding anything themselves.
- **A bake is one save write.** `recordBake` returns the whole next save (the remembered batch plus any discovery), so a bake can't be half-saved. History is capped by `MAX_BAKED_CREATIONS`.
- **Everything read from storage is checked.** `persistence/schema.ts` validates stored data and runs any migrations before the game sees it. Each save has a `version`. A save that can't be read is **never deleted automatically**: the player sees what went wrong and can download a copy, try again, or set it aside. Setting it aside moves it to an archive store rather than deleting it. Before a migrated save is written back, the original is archived too.
- **IDs are stable and typed.** Players, recipes, ingredients and creations use prefixed, branded string IDs (`player_…`, `recipe_…`). Nothing is keyed by display name.
- **Navigation is hash-based** (`#/bake`, `#/settings`): real links, working back button, no server config.
- **The service worker never touches the save.** It caches only this build's own files, answers only same-origin GET requests, and a new version waits for the player's *Refresh*. Updating or removing it can't affect IndexedDB.
- **Imports go through the same door as loads.** A save file is read with the same validation and migrations as stored data, and installing one archives the current save in the same transaction.

## Deploying

Homemade is a static site with no environment variables, secrets or backend. On Vercel (or any static host), the defaults are enough: build with `npm run build` and serve `dist/`. No `vercel.json` is needed: routing lives in the URL hash, so there are no rewrites, and the default `max-age=0, must-revalidate` headers are what `index.html` and `sw.js` want. Serve over HTTPS (required for the service worker; IndexedDB works either way).

## Accessibility

Semantic landmarks and headings, real links and buttons, a skip link, visible focus rings, and focus that moves to each new screen's heading after navigation. Text meets WCAG AA contrast. Everything works with a keyboard alone, touch targets are at least 44px, and focus is never hidden under the phone tab bar. Motion respects `prefers-reduced-motion` unless the player overrides it in Settings, and nothing relies on animation to convey meaning. Sound and motion are separate settings.

The Interval 4 browser checks (viewports, offline, install, keyboard) are recorded in [`docs/verification/interval-4.md`](docs/verification/interval-4.md).

## Where it's heading

Likely next: decorating your kitchen. Cloud saves, accounts and multiplayer aren't planned for the near term.

## Design direction

Homemade should feel warm, tactile, handmade and a little imperfect, like a real kitchen counter with a recipe box on it, not a web app. `PRODUCT.md` and `DESIGN.md` record the product and visual direction; the design was checked with [Impeccable](https://impeccable.style).
