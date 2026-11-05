# Interval 11 verification

Stability work and a content expansion, checked on 2026-11-05 on branch `feat/stability-content-expansion` (from `main` at `7b1a504`, Interval 10's merge). Browser checks ran in the Claude desktop app's built-in Chromium: the dev server (`npm run dev`, React StrictMode on) for the existing- and new-player passes, the **production build** (`npm run build && npm run preview`) for offline. Saves were real IndexedDB, either written straight into the database or made through onboarding. The browser reported `prefers-reduced-motion: reduce`, so kitchens on the default motion setting ran reduced. The pane was hidden for most of the pass, so flows were driven through the page's own buttons by script and read back as text, with screenshots under viewport emulation.

## The two intermittent UI tests

In Interval 10's first full run, two tests failed once and passed on rerun:

- `Keepsakes.test.tsx` › *names a mastery stage only when one is reached, with its own small sound* (3120ms when it failed)
- `Progression.test.tsx` › *plays the chime for the recipe's rarity, and Marmalade notices a first Uncommon* (2421ms)

**Reproduction.**

| Run | Result |
| --- | --- |
| Full suite ×10, before any change | 10/10 clean (27–37s each) |
| The two tests ×30, isolated | 29/30; one failure: the mastery test hit Vitest's 5s limit (5035ms) in a run whose whole duration jumped to 27s from the usual 8s |
| Four sound-heavy UI files ×15, while two full suites ran in parallel as CPU load | 15/15 clean |

So the failures are **environment-dependent and genuinely intermittent**: not order-dependent (each test renders a fresh app and the setup file cleans up), not reproducible under steady load, but reproducible when the event loop stalls. During this interval another session was running its own Vitest suite on the same machine (seen in the process list), which is exactly that kind of contention.

**Root cause.** Both tests waited on *real time* for sounds the Bake screen schedules on bare `setTimeout`s: `waitFor` gives up after 1000ms, the mastery stage's sound is due at 700ms and the reduced-motion chime at 350ms, so a stall of a few hundred ms fails the assertion. The mastery test also slept a real 900ms to prove that a sound *didn't* play, inside a 5s budget that its two full-app bakes already used most of. The same pattern was in five more places: the tutorial walkthrough slept 400ms "long enough for its chime" (due at 350ms), and other tests used ad-hoc `{ timeout: 2500 }` / `3000` waits for sounds. A second, test-only race came with it: after the mastery bake, the test cleared its sound log and baked again, but the first bake's keepsake stamp (due at 1400ms) could land after the clear on a slow run.

**Fix (not a timeout change).**

- The oven's sounds are now one pure cue sheet, `bakeSoundCues(outcome, reducedMotion)` in `screens/reveal.ts`: which sounds, and when, as data. It carries exactly the old delays and order.
- `useSoundCues()` (`audio/cues.ts`) is the only code that sets sound timers. It plays cues through the sound setting at the moment each rings, returns a cancel function, and cancels anything still waiting when its screen unmounts. The Bake, Pantry, Decorate and Notes screens use it. Before, the Decorate and Notes screens' keepsake stamps were bare timers that could outlive their screen; that is fixed too.
- A `CueSchedulerContext` lets tests supply the clock. UI tests use an *immediate* clock (cues ring synchronously, in order), so they assert the exact sound sequence with no waiting: `['pick', 'pick', 'pick', 'mix', 'ding', 'mastery-up', 'achievement-unlock']`. All the sleeps and extended sound timeouts are gone, and several assertions got stricter (full order instead of "contains").
- Regression tests: a *manual* clock shows that moving on from a result cancels its waiting sounds, so one bake's stamp can't ring into the next (`Keepsakes.test.tsx`); `cues.test.ts` checks the real timer clock with fake timers (rings on time, cancels only what's waiting, leaves no timers); `reveal.test.ts` pins the cue sheet for experiments, rebakes, mastery, secrets and a Mythic with a level, a decoration and a keepsake.

**A third one, found by CI.** The branch's first CI run failed once on `Story.test.tsx` › *shows every line straight away under reduced motion*: it read `data-motion="system"` where the save said `reduced`, 30ms into the test. This one was a real bug. `App` applied the motion preference in a passive `useEffect`, which React runs after the ready screen is committed, so the kitchen's first frame briefly ran on the loading screen's `system` setting, and a test reading the attribute as soon as a heading appeared could see it. It's now a `useLayoutEffect`, applied in the same commit, before paint. A regression test in `App.test.tsx` records the attribute from a `MutationObserver` the moment the kitchen's heading is inserted: it failed 3/3 before the change and passes after. The same test name had failed in an Interval 8 session too, so it was older than this interval.

**What's left: long journeys on a saturated machine.** After the fix, every failure seen in the runs below was a **5s Vitest timeout** in a multi-screen journey (the tutorial walkthrough and its replay, the new-player story walkthrough, the two keepsake bakes, the whole-bake sound test), and only on a heavily loaded machine. When a test times out, Vitest abandons it but its pending clicks keep running against the next test's freshly rendered app, so one timeout can fail one or two later tests in the same file within a few hundred ms. Those cascades are not separate bugs.

Evidence that it's load, not the code or the new content:

- Alone, those journeys take 1.0–2.3s on this branch. An interleaved A/B on the same machine (`main`, branch, `main`, branch, three rounds) had the branch as fast or faster on every one: the mastery test 2.6–2.9s on `main`, 1.2–1.4s here, since its sleeps are gone.
- Every failing full run took 60s or more (clean ones ranged 31–84s, so load varied a lot), and CPU sampled every 20s during the second gate read 86–100%. Other sessions on the machine were running their own Vitest suites and Playwright browsers throughout.
- Capping Vitest at 4 workers didn't clearly help (slowest test 2.2–2.6s against 2.6–2.7s, longer runs), so the config is unchanged.

No test was given a longer limit. Splitting the longest journeys, or giving the handful that walk several screens an explicit, documented budget, is left for Interval 12.

## Repeated runs

All on the final code, on a machine shared with other sessions' test runs. Every failure listed is a 5s timeout in a long journey, plus its cascades (see above); there were no assertion failures.

| Run | Clean | Duration each | Failures |
| --- | --- | --- | --- |
| Full suite ×10, first gate | 7/10 (runs 1–3 and 5–8) | 41–89s | run 4: 2 timeouts and a cascade; runs 9 and 10: 3 timeouts each |
| Full suite ×5, `--sequence.shuffle` (random file and test order) | 3/5 | 53–89s | one timeout in each of two runs |
| The two formerly flaky tests and the new regression test ×50 | 49/50 | 7–35s | run 9: the mastery test timed out (5063ms) and the next test in its file cascaded |
| Full suite ×10, second gate (CPU 86–100% throughout) | 9/10; **runs 1–7 consecutive** | 31–73s | run 8: 2 timeouts (tutorial replay, new-player story) and 2 cascades in the story file |
| Full suite ×4, quieter machine (CPU ~55%; two of them with `--maxWorkers=4`) | 4/4 | 38–53s | none; slowest test 2.7s |

The gate of five consecutive clean full runs was met (seven in a row in the second batch), and every failing run was one where the whole suite took 60s or more. It is not true that the suite *never* fails here: under that load a long journey can still miss 5s.

## Real devices

**No physical phone or tablet was available, so nothing in this interval was tested on a real device**, and no iPhone, Safari, Add to Home Screen, Android or Chrome-PWA behaviour is claimed. Phone layouts were checked by viewport emulation, which doesn't reproduce safe-area insets, the home indicator, iOS audio unlocking, install prompts or standalone mode. Interval 10's real-device checklist still stands in full; Interval 11 adds:

- [ ] **Pantry** with 24 jars, and the five wrapped Interval 11 jars: tags, "✓ reached", confirm dialog, the note that takes focus afterwards.
- [ ] **Recipe Book** with 50 cards: scrolling each divider, Every family, nothing hidden under the tab bar.
- [ ] **Decorating**: the dried orange garland in the window and the potted coffee plant under it, portrait and landscape.
- [ ] **Audio after the first tap**, same list as Interval 10, plus: a level-up from a pantry addition (rings 700ms after the jar sound), and baking, then leaving the result before its chime: the chime should not ring on the next screen.
- [ ] **Persistence and offline**: buy a new jar, bake a new card three times (Familiar), favourite it, swipe the app away, relaunch in airplane mode.

**Audio.** Not listened to on any device. No sound files were added or changed (new cards reuse the rarity chimes; the new jars reuse the ingredient sound). In the browser and in tests, the cue sheet keeps every delay and order from Interval 10, and one bake's sounds are cancelled when the player moves on.

## Content

Five ingredients (24 in all) and thirteen visible recipes (50 in all, 47 visible, three secrets, unchanged). That's one more card than the "8–12" aimed for: the thirteenth (*Marshmallow Puff*) is what lets marshmallows pay for themselves (see *Progression*).

| Ingredient | Level | Crumbs | Cards (starter-shelf card first) |
| --- | --- | --- | --- |
| Orange | 4 | 25 | Orange Biscotti, Chocolate Orange Cookie, Orange & Ginger Thin |
| Ginger | 5 | 15 | Gingersnap, Orange & Ginger Thin |
| Espresso | 6 | 25 | Coffee Kiss, Mocha Crinkle |
| Pecans | 7 | 15 | Pecan Sandie, Maple Pecan Cookie, Salted Pecan Turtle, Rocky Road |
| Marshmallows | 10 | 15 | Marshmallow Puff, Campfire S'more, Rocky Road |

Plus *Salted Peanut Butter Cookie*, made only from older jars. No new secrets (none was needed to make experimenting more interesting, and every new jar already had a starter-shelf card to find), no second Mythic, no story.

**Ingredient usage** (cards that use each; all recipes, secrets included):

| | Lowest before | Lowest after |
| --- | --- | --- |
| 2 | sea salt | ginger, espresso (both new) |
| 3 | vanilla, cocoa, peanut butter, coconut, lemon, white chocolate, maple, pistachios | lemon, white chocolate, pistachios, orange, marshmallows |
| 4 | strawberry jam | vanilla, cocoa, peanut butter, coconut, strawberry jam, maple, sea salt, pecans |

Every ingredient is in at least two cards that aren't secret (a catalog check). Lemon, white chocolate and pistachios didn't gain a card; an *Orange Pistachio Biscotti* was drafted and dropped when orange needed a starter-shelf card instead.

**Families** (visible cards; C/U/R/E/L/M):

| Family | Before | After | Rarity after |
| --- | --- | --- | --- |
| Classics | 5 | 6 | 5/1/0/0/0/0 |
| Chocolate | 5 | 7 | 2/3/1/1/0/0 |
| Warm & Spiced | 5 (+1 secret) | 6 (+1 secret) | 3/2/1/0/1/0 (secret Legendary included) |
| Nutty | 4 (+1 secret) | 7 (+1 secret) | 1/1/3/3/0/0; its first Common and Uncommon |
| Fruity | 5 | 7 | 2/4/1/0/0/0 |
| Sweet & Sticky | 5 | 7 | 2/0/2/1/1/1 |
| Strange & Wonderful | 5 (+1 secret) | 7 (+1 secret) | 0/4/3/1/0/0 |

No divider is more than one card bigger than another. **Rarity** across the catalog went from 11/10/9/4/2/1 to 15/15/11/6/2/1: each tier no bigger than the one below, Epic up by two, no Legendary or Mythic added, and Epic, Legendary and Mythic together under a fifth of the book.

## Progression

- **No new levels.** The jars sit at existing levels, Level 11 (sea salt) stays the top, and no threshold, older price or reward moved.
- **The first draft could deadlock.** Priced like the old jars (25–40 Crumbs), the anti-deadlock walk found **386** pantry orders from a new kitchen with no affordable next step: kitchens that bought honey and peanut butter, skipped the cheap early jars, and then spent on a new jar whose cards all needed something else. No price or level grid fixed it on its own (1,920 combinations tried). The fix was structural: every new jar got a card from the starter shelf and that jar alone, worth at least its price, so buying one never leaves a kitchen worse off. That's now a test.
- **The walk is still exhaustive, and faster.** With 19 additions the old walk (a queue of every order) ran for minutes. Where a kitchen stands depends only on which jars it has, so the walk now visits each pantry *set* once as a bitmask: about 169,000 sets from a new kitchen in about 0.3s. It's cross-checked against the game's real save and unlock rules on 600 sampled pantries, and it runs from three starts: a new kitchen, an upgraded Interval 4 kitchen with no Crumbs, and a finished Interval 10 kitchen with no Crumbs. **No stuck pantry from any of them**, and every one can reach the whole pantry. Secrets are never counted.
- **Economy.** First discoveries that aren't secret pay 1,825 Crumbs in all (was 1,410); the whole pantry costs 630 (was 535). The worst case is handled by the walk above, not by the totals.
- **XP.** Visible first discoveries now give 2,720 XP (was 2,060) plus 190 for the pantry. Level 11 is 1,100 XP, unchanged. The biggest single reward is unchanged (an Epic's 120 XP), so nothing new jumps several levels at once. A kitchen reaches Level 11 a little earlier in the book than before, which only means sea salt is sooner; nothing else is gated on it.
- **Rebakes.** Every recipe in the catalog, baked a second time in reverse order, pays nothing (a test loops the whole catalog).

## Existing player (Interval 10 save, version 7)

A finished Interval 10 kitchen written into the database: the old 19 jars, every old card plus the Snowball, both arcs read, 12 keepsakes (Every Card Home and Full Shelf among them), the cupboard and keepsake pieces, the fair-day photograph and café curtains out, Shortbread a House Favourite, two favourites, 12 Crumbs, 2,150 XP.

- It loaded **without a migration** (still version 7). The kitchen, plaque, favourites and memories were as written.
- The Pantry showed the five new jars wrapped under *Pantry additions*, each with "Baker Level N ✓ reached", its price and "You need N more Crumbs. New recipes earn them."
- Baking peanut butter, brown sugar, egg and sea salt: "New recipe discovered: Salted Peanut Butter Cookie · Rare · +40 Crumbs · +70 XP". Pecans and orange were then bought through the confirm dialog ("You'll have 37 Crumbs left."), each landing focus on a note with Marmalade's line and "+10 XP for filling the shelf".
- Pecan Sandie (Common), Chocolate Orange Cookie (Common), Orange Biscotti (Uncommon) and Salted Pecan Turtle (Epic) each paid their rarity's reward; a second Pecan Sandie paid nothing ("Baked twice"). Crumbs went 12 → 142 and XP 2,150 → 2,440, exactly the rewards minus the two jars.
- The Recipe Book read "39 of 47 recipes written down", Secrets found 1, Keepsakes 13 of 16. The Nutty divider showed its new cards with their rarity in words, mastery and the favourite toggle; the toggle's `aria-pressed` flipped to true. The undiscovered Maple Pecan card showed Marmalade's clue once both its jars were owned. *Bake again: Pecan Sandie* laid out the bowl with the "Laid out for Pecan Sandie" note focused. Baking Memories listed the new bakes.
- Recipe Box Notes listed every chapter of both arcs, unchanged, with nothing new.
- After buying ginger and espresso, Gingersnap finished Warm & Spiced ("For your kitchen: something new in the old cupboard (dried orange garland).") and Mocha Crinkle finished Chocolate (the potted coffee plant). Both went out from the chooser ("Put out: Dried orange garland, on the window. The café curtains went back in the cupboard."), and the kitchen read "Out in your kitchen: Fair-day photograph, Dried orange garland, Potted coffee plant."
- **Observed, left as is:** because new cards re-opened every old divider, this kitchen heard Marmalade's "Every Warm & Spiced card, back in the box. That's a whole divider done." again. It's said when no other divider is finished, which was true; it doesn't say "first", and it can't repeat for the same kitchen unless a later interval grows the dividers again.
- After a reload, everything above was still there.

## New player

Onboarding, then the whole tutorial by its buttons: the shortbread bake (Card 6: "Shortbread! A Common card… 15 Crumbs and 20 XP"), the Recipe Book, and the Pantry card ("First up: chocolate chips, at Baker Level 2 for 20 Crumbs"), unchanged. Afterwards the Pantry listed all 19 additions in level order, the new jars among them (… lemon, orange, coconut, brown sugar, ginger, peanut butter, espresso, honey, white chocolate, pecans, …, marshmallows, sea salt). Reaching each new jar from a new kitchen, in every order, is the anti-deadlock walk's job (above).

## Phones

Kitchen, Pantry (24 jars), Recipe Book (50 cards), Kitchen Keepsakes, Bake, Baking Memories, decorating and Recipe Box Notes at **430, 390, 360 and 320** wide and **844×390**: **0px horizontal overflow** on all of them. The only link or button under 44×44px was the word *Pantry* inside the Bake screen's hint sentence ("More ingredients can be added in the Pantry."), an inline text link (WCAG's inline exception), shown to any kitchen with jars still to buy; it isn't new.

Screenshots at 390 wide: the wrapped jars with their tags, the five new jars on the Bake shelf (orange halves, ginger, dark espresso granules, pecan halves, marshmallows), the Marshmallow Puff result, and the kitchen with the garland across the window and the coffee plant beneath it.

**Long content.** Measured in jsdom with the draft catalog, against `main`: rendering the Recipe Book went from ~153ms to ~181ms (new kitchen), the Pantry from ~44ms to ~68ms, and node counts rose by ~20–25%. In the browser nothing felt slow. No virtualisation, search or filter was added; the family dividers and *Favourites* remain the way to narrow the book.

## Accessibility and motion

New ingredients and cards go through the existing components, so they get the same words: rarity written on every card ("Common", "Epic"), family headings, mastery in text ("Baked twice", "Pecan Sandie is Familiar now: baked 3 times."), the lock explanation on every wrapped jar, `aria-pressed` on the favourite toggle, and the decorations named in the kitchen's read-out. Clues for the new cards name no ingredient (the catalog check covers the five new names too). No secrets were added, so nothing new is hidden or revealed. No animation was added: new cards use the existing reveal and toppings, and the two decorations use the existing fade-in that reduced motion makes instant.

## Offline (production build)

- The preview origin still had Interval 10's worker in control; the new build's worker waited behind the *Refresh* notice. After *Refresh* the page ran this build (`index-DhUpomMs.js`, matching `dist/index.html`) with one cache of 46 files including all 22 sounds. Interval 11 adds no asset files (the new art is inline SVG).
- With the preview server stopped (a direct request failed with a network error), a kitchen written as Interval 10 baked *Salted Peanut Butter Cookie*, bought pecans, baked *Pecan Sandie* three times ("Pecan Sandie is Familiar now: baked 3 times.") and favourited it. After an **offline reload** the save was still version 7 with pecans owned, `recipe_pecan-sandie: 3`, both favourites, and 52 Crumbs / 2,250 XP, exactly as summed.

## Saves

No save version change and no migration: ownership, discoveries, mastery counts, favourites and decorations already store ids, and everything else comes from the catalogs. New tests: an Interval 10 save reads back byte-for-byte with no migration, its five new jars are locked, settling it keeps every keepsake it earned under the smaller dividers, and a save file carrying new jars, cards, mastery, favourites and memories round-trips with no version change. Unknown future ids keep following the existing policy (kept, not shown).

## Automated

654 tests (Vitest, jsdom, `fake-indexeddb`), up from 633: the motion preference applied before the first frame, the sound cue sheet and both clocks, the cancel-on-move-on regression, every catalog recipe never paying twice, the Interval 11 jars' levels, prices and self-financing, the three-start exhaustive deadlock walk cross-checked against the real rules, the usage, family and rarity audit, the two family-reward decorations, an Interval 10 save loading unchanged with its keepsakes kept, and a save file carrying the new content. Lint, type-check and production build pass.

## Bugs found and fixed

- **Timing-sensitive tests** (above): sound-delay waits and sleeps replaced by an explicit, cancellable cue sheet and a test clock.
- **The motion preference arrived a frame late** (above): applied after the first commit; now before paint, with a regression test.
- **Keepsake sounds could outlive their screen:** the Decorate and Notes screens' stamps were uncancelled timers. Now cancelled on unmount.
- **Draft balance deadlock** (above): caught by the anti-deadlock walk before anything shipped; fixed by giving every new jar a starter-shelf card worth its price.

## Decisions

- **MkDocs: deferred again.** The docs are about 150 KB across 13 Markdown files, all linked from the README, and still easy to navigate.
- **`docs/story-canon.md`: unchanged.** No new recipe touches the story.
