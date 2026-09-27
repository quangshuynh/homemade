# Homemade

Homemade is a cozy baking game that runs in your browser. You name your own little kitchen, try out ingredients, discover recipes and fill a recipe book.

It is **not** an idle or clicker game. Nothing ticks up while you're away, and there's no counter to grind. It's a slow, hands-on game about making things.

## Status

**Interval 2: First baking loop.** There's one small, complete loop:

1. **Bake:** take up to five ingredients off the shelf and put them in the bowl, mix, and bake.
2. **Discover:** an exact set of ingredients makes one of 7 hand-written recipes. The first time you bake one, it's stamped *New recipe!* and saved.
3. **Experiment:** anything else comes out as a *Kitchen Experiment*. You still get to eat it, but it doesn't go in the book.
4. **Recipe Book:** recipes you've found are written out. Ones you haven't are blank cards that give nothing away.
5. **Pantry:** the 8 ingredients on your shelves. Everyone starts with all of them, and there's no shop or currency.

Also in place from Interval 1: naming your kitchen on first launch, the Home Kitchen, and Settings (sound preference, motion preference, and Start over with confirmation).

Saves live in the browser's IndexedDB. No account is needed and nothing is sent anywhere. Saves from Interval 1 are upgraded automatically, and the original is kept in an archive.

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
  domain/       Game rules and catalogs: ingredients, recipes, baking, saves
  persistence/  Save schema, validation, migrations, and the IndexedDB repository
  screens/      One file per screen (onboarding, kitchen, bake, recipe book, pantry, settings)
  styles/       Design tokens and base styles
  assets/       Static art (the butcher-block counter)
  test/         Test setup and fixtures
```

A few design decisions worth knowing:

- **The UI never touches IndexedDB.** Screens call `updateSave(change)` from `GameProvider`. The provider updates the screen right away and writes through a `SaveRepository` interface in the background. Autosave, cloud sync or a different storage backend can plug in behind that interface later.
- **Game rules live in `domain/`.** Ingredients and recipes are static catalogs with stable ids, and saves store only ids. Matching, discovery and bowl rules are pure functions (`domain/baking.ts`), and screens call them rather than deciding anything themselves.
- **Individual batches aren't saved yet.** Only first-time discoveries are. Nothing reads past bakes yet, and keeping every one would grow saves for no benefit. A `CookieCreation` type is ready for when a collection feature needs it.
- **Everything read from storage is checked.** `persistence/schema.ts` validates stored data and runs any migrations before the game sees it. Each save has a `version`. A save that can't be read is **never deleted automatically**: the player sees what went wrong and can download a copy, try again, or set it aside. Setting it aside moves it to an archive store rather than deleting it. Before a migrated save is written back, the original is archived too.
- **IDs are stable and typed.** Players, recipes, ingredients and creations use prefixed, branded string IDs (`player_…`, `recipe_…`). Nothing is keyed by display name.
- **Navigation is hash-based** (`#/bake`, `#/settings`): real links, working back button, no server config.

## Accessibility

Semantic landmarks and headings, real links and buttons, a skip link, visible focus rings, and focus that moves to each new screen's heading after navigation. Text meets WCAG AA contrast. Everything works with a keyboard alone. Motion respects `prefers-reduced-motion` unless the player overrides it in Settings, and nothing relies on animation to convey meaning.

## Where it's heading

Likely next: more ingredients and recipes, collecting what you bake, and decorating your kitchen. None of that exists yet. Cloud saves, accounts and multiplayer aren't planned for the near term.

## Design direction

Homemade should feel warm, tactile, handmade and a little imperfect, like a real kitchen counter with a recipe box on it, not a web app. `PRODUCT.md` and `DESIGN.md` record the product and visual direction; the design was checked with [Impeccable](https://impeccable.style).
