# Interval 4 verification

Real-browser checks run against the **production build** (`npm run build && npm run preview`) in Chromium 141 (Playwright), on 2026-09-27. The save was seeded straight into IndexedDB with a deliberately awkward kitchen: a 32-character kitchen name ("The Very Long Named Crumb Corner"), a long player name ("Bartholomew-Anne"), all 12 recipes found and the full 50 baking memories.

## Viewports

Every screen (Kitchen, Bake, Recipe Book, Baking Memories, Pantry, Settings) at each size was checked for horizontal scrolling, for the last control on the page being reachable above the tab bar after scrolling to the end, and for touch targets under 44 × 44 px.

| Viewport | Orientation | Horizontal scroll | Last control clear of tab bar | Targets < 44px |
| --- | --- | --- | --- | --- |
| 1440 × 900 | desktop | none | yes (tabs on top) | none |
| 820 × 1180 | tablet portrait | none | yes (tabs on top) | none |
| 430 × 932 | phone | none | yes | none |
| 390 × 844 | phone | none | yes | none |
| 360 × 740 | phone | none | yes | none |
| 320 × 568 | narrow phone | none | yes | none |
| 844 × 390 | phone landscape | none | yes (tabs on top) | none |
| 667 × 375 | small phone landscape | none | yes (slim bar) | none |
| 568 × 320 | narrow phone landscape | none | yes (slim bar) | none |

Check boxes and radio circles are 26px drawings inside 44px-tall labels; the label is the target.

Found and fixed during the pass:

- Bake (all phones): the bowl and Mix button started entirely below the fold. The bowl's actions now dock above the tab bar until you reach them.
- Short landscape: the dock took two rows of a 320px-tall screen; it's one row there now.
- The header sign link was 26px tall, and the "All your baking memories" link 25px. Both are 44px now (the latter without making the paper strip taller).
- Keyboard focus on the bottom row of jars could land under the docked bar at 320 × 568 and 667 × 375. `scroll-padding-bottom` now includes the dock.
- The import dialog at 320px focused the scrolling card instead of *Keep my kitchen*, and closing a dialog left focus on the page body. Both fixed in `ConfirmDialog`.
- `scroll-padding-bottom` reads as `auto` (NaN) where it isn't set, which made the "bring the bowl into view" check always scroll. Fixed and covered by a test.

## Bake flow on phones

Walked pick → mix → bake → result → *Bake another batch* → Recipe Book → *Bake again* at 320 × 568, 390 × 844, 667 × 375 and 820 × 1180.

- Mix is always visible while picking (docked). Pressing it brings the dough into view.
- The result card's heading takes focus and is on screen, with *Bake another batch* reachable.
- *Bake again* lands with the "Laid out for Chocolate Chip Cookie…" note focused, directly above the bowl, with all five ingredients visible and Mix in reach. The note's accessible text also lists the ingredients.

## Keyboard sweep

Tabbed through every screen at 390 × 844, 320 × 568 and 667 × 375, checking that each focused element was fully on screen, not under the tab bar or dock, and drew a focus ring. After the fix above: every stop visible, every stop with a ring, on all 18 screen/size combinations.

## Offline, install and updates

With a persistent (non-incognito) profile at 390 × 844:

1. Loaded online with a seeded save. The service worker installed and took control; one cache (`homemade-shell-<version>`) with 29 entries.
2. Installability: `Page.getInstallabilityErrors` returned **no errors**; the manifest parsed with no errors; all five icons returned 200.
3. Went offline and reloaded: the kitchen and its save loaded; all three fonts loaded from cache.
4. Baked offline (Vanilla Kiss): the result showed and the save in IndexedDB went from 4 to 5 memories.
5. Navigated by hash and reloaded offline onto Settings: fine.
6. Back online, changed `dist/sw.js` to simulate a deploy and asked the browser to check. The "A fresh batch of Homemade is ready." note appeared; the page did not reload by itself.
7. Pressed *Refresh*: the page reloaded once, the old cache was removed, only the new one remained, and the save was intact (same kitchen, 5 memories).

The only failed requests in the console were Chrome's own manifest-icon fetches, cancelled by the offline switch; the app logged no errors.

Not verified here: a real phone's home-screen install, and iOS Safari (no `beforeinstallprompt`, so no install button is shown there; players use Share → Add to Home Screen). The layout was checked with emulated safe-area-free viewports; the safe-area insets themselves only exist on real devices.

## Audio

The five sounds are synthesised by `scripts/make-sounds.mjs` (sine partials and seeded noise; no recordings, samples or third-party assets) and committed as small mono WAVs (~160 KB total). They're fetched only after the first sound is asked for, and precached for offline play. Playback, overlap limits and every failure path are covered by unit tests; they weren't listened to in this automated pass.
