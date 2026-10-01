# Interval 5 verification

Real-browser checks run in the Claude desktop app's built-in Chromium browser on 2026-10-01: flows against the dev server (`npm run dev`), offline and the service worker against the **production build** (`npm run build && npm run preview`). Saves were real IndexedDB, either created through onboarding or seeded straight into the database (an Interval 4, save version 3 kitchen).

## New player

Onboarding → tutorial (all nine cards) → first discovery → level-up → adding an ingredient, at desktop size and again at 320 × 700.

- A new kitchen opens on Marmalade's first card, focused. The kitchen behind it shows Baker Level 1, 0 / 40 XP, 0 Crumbs.
- On Bake, the flour, sugar and butter jars are ringed; Mix waits for exactly those three. Mix, Bake it and the reveal follow. Marmalade reads out "Shortbread! A Common card… That's 15 Crumbs and 20 XP." and the result shows the Common stamp and "+15 Crumbs · +20 XP".
- The Recipe Book and Pantry cards follow; the Pantry card names the first addition (chocolate chips, Level 2, 20 Crumbs). *Off you go* ends it and the save reads `tutorial: { completed: true, skipped: false }`, `progression: { crumbs: 15, xp: 20 }`, five ingredients, version 4.
- After a reload the tutorial doesn't come back. A Sugar Cookie then crosses Level 2: the ribbon reads "Baker Level 2! Chocolate chips and cinnamon can go in the pantry now." and Marmalade says "A new level! Look at you go."
- In the Pantry, adding chocolate chips asks first ("It costs 20 Crumbs… You'll have 10 Crumbs left."), then the jar moves to Flavourings, the plaque drops to 10 Crumbs and 50 XP, and Marmalade's note takes focus.
- *Replay the tutorial* from Settings starts it again; skipping a replay leaves it `completed: true` and lands focus on the screen heading.

## Returning player (Interval 4 save)

A version 3 save (Sam / Oven Mitts, all 12 ingredients, three recipes found including the legendary Honey Flapjack, two memories, sound on) was written into IndexedDB and the page reloaded.

- No tutorial. The kitchen shows Baker Level 5, 260 / 340 XP (20 + 40 + 200 for the three recipes), 0 Crumbs.
- The stored save is version 4 with names, settings, all three discoveries and their original dates, both memories and all 12 ingredients unchanged. The original version 3 save is in the archive store.
- The Recipe Book stamps the three cards Common, Uncommon and Legendary. *Bake again: Snickerdoodle* lays out the five ingredients; baking it shows no reward and no Marmalade, and appears first in Baking Memories.
- A first Epic (Double Chocolate Shortbread) with full motion: plum three-star stamp, stitched card, "+75 Crumbs · +120 XP", "Baker Level 6!" with no ingredient list (this kitchen owns everything), and Marmalade: "Epic! My whiskers are actually tingling."

In the dev server the archive held the version 3 original twice, because React's StrictMode runs the load effect twice in development. The production build archived it once.

## Viewports

Every screen, plus the tutorial cards, a level-up result and the add-ingredient dialog, was checked for horizontal scrolling. At 320 × 568 every button and standalone link in the main content was also measured for a 44 × 44px target, and the last control on the Pantry page was checked to sit above the tab bar after scrolling to the end.

| Viewport | Horizontal scroll | Notes |
| --- | --- | --- |
| desktop | none | |
| 430 × 932 | none | |
| 390 × 844 | none | tutorial replayed from Settings |
| 360 × 740 | none | level-up result and add dialog |
| 320 × 700 / 568 | none | full tutorial; no targets under 44px; last control clear of the tab bar |
| 667 × 375 landscape | none | the tutorial card is about half the screen height, scrolling with the page |

Found and fixed during the pass:

- On phones the tutorial card took nearly half the screen and pushed the shelf below the docked Mix bar. *Skip the tutorial* moved up beside the card count, and the line is a size smaller under 480px; the jars now show above the dock at 320px.
- On phones Marmalade wrapped onto her own row under the Baker plaque. The plaque now stacks XP and Crumbs so she stays beside it.
- The level ribbon's "See what's new in the Pantry" link was shorter than 44px; it's a full-height target now.
- After *Skip the tutorial*, focus could stay on the page body in a tab that wasn't painting, because the focus move waited for an animation frame. It uses a timeout now.
- The "Add for 20 Crumbs" label wrapped on narrow tags; it reads *Add to pantry* (the cost is listed just above it and in the button's accessible name).

## Offline

Against the production preview: the service worker activated and controlled the page with 37 files precached, including all 13 sounds. With the preview server then stopped, a reload opened the game from the cache, and a bake discovered Sugar Cookie, paid 15 Crumbs and 20 XP, crossed Level 2 and saved to IndexedDB.

## Not re-checked this interval

Install prompts and the update notice weren't touched by Interval 5 and weren't re-run in a browser; their automated tests pass. Screen reader output was checked through the accessibility tree and Testing Library's accessible names and descriptions, not with a running screen reader.
