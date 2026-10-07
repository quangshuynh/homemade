# Interval 7 verification

Real-browser checks run in the Claude desktop app's built-in Chromium browser on 2026-10-07: flows against the dev server (`npm run dev`), offline against the **production build** (`npm run build && npm run preview`). Saves were real IndexedDB, created through onboarding or written straight into the database. Both origins had no save beforehand and were cleared afterwards. The browser reported `prefers-reduced-motion: reduce`, so kitchens on the default motion setting ran reduced.

## New player

Onboarding (Robin / Story Oven) → the nine-card tutorial → Chapter 1.

- While the tutorial runs, the Recipe Book's *Recipe Box Notes* bookmark shows no "New note", and the kitchen shows no story indicator.
- The last tutorial card now reads "…And when you have a minute, look in the recipe box: there's something I want to show you."
- Afterwards the kitchen's recipe box tag reads "1 recipe · A new note inside", and Marmalade has a small pen speech mark beside her.
- In Recipe Box Notes, *A new note* waits with *Read it with Marmalade*. Played by keyboard alone: each line takes focus ("Marmalade: …"; the lid note reads "Inside the lid of the recipe box, in someone else's handwriting: Recipes. Please put them back where you found them."), and Next is one Tab away. After *Put it back in the box*, focus lands on "Put back in the box. That's the end of The Faded Recipe Box." Chapter 1 is then filed with its note and *Replay with Marmalade*, followed by "The rest of the box is still too faded to read."
- **Found and fixed:** a chapter divider's "Read" aligned with the small "Chapter 1" line rather than the title (now `last baseline`).

## Existing player (Interval 6 save)

A version 4 kitchen written into the database: 9 ingredients, 5 recipes (including Snickerdoodle), 42 Crumbs, 215 XP, tutorial skipped.

- It loaded as version 5 with `story.seenSceneIds: []`. Every other field was unchanged: 42 Crumbs, 215 XP, 5 recipes, 9 ingredients, and the tutorial still `{completed: false, skipped: true}`. No tutorial ran, and the original was archived as "Upgraded from save version 4".
- The kitchen showed "A new note inside". *Skip this scene* on Chapter 1 gave "Skipped. Whatever was found is filed below…", filed the lid note, and showed "Another note is waiting".
- Catch-up went one scene at a time: Chapter 2 part 1, then part 2 ("The spiced card has writing on it too."), then Chapter 3 ("Something was stuck behind the new jars."). Finishing Chapter 2 showed "Tucked between the cards: 10 Crumbs."
- The archive held two copies of the original. React StrictMode runs the load effect twice in development, and both runs upgraded and archived. This was already true before Interval 7 and is dev-only. Both copies are the identical original.

## Secret clue

- Before Chapter 2, the page has no "winter fair" clue and no "snowball" anywhere in the DOM.
- After Chapter 2 part 1, the scrap reads: "For the winter fair: little snowballs. No dough to speak of, they hold themselves together. Pale right through, and something sweeter hidden in the middle." The Recipe Book still has no Snowball and no "secret".
- In a late kitchen (all ingredients, Level 11), baking coconut, sugar, egg and white chocolate gave "Secret recipe discovered: Snowball". The same note then read "Marmalade pencilled beside it: “Found it. Snowball.”"

## The finale

The same late kitchen, with chapters 1–4 read.

- Millionaire's Shortbread: the full Mythic reveal, with Marmalade's starstruck line and exactly one paper slip under it: "New note: Something slipped out from behind the new card. *Open the Recipe Box Notes*". Nothing opened by itself.
- Chapter 5 ends "That's the end of The Last Card." and pays 25 Crumbs. All five chapters are filed with their notes, ending on the key ("Its tag says only: Not yet."), and the "still too faded" line is gone.
- **Found and fixed:** the slip's link was shorter than 44px on its own line. It's now a full tap target.

## Phones

Recipe Box Notes at 430, 390, 360 and 320 wide, with a scene open and with the full notes list.

- At 320px, Marmalade and the dialogue card fit side by side for every beat of Chapter 2 part 2, including the longest line and a note. The scene card spans x 15–305.
- At every width: 0px horizontal overflow, and no button or link under 44 × 44px. Scrolled to the end, the last control sits 35px above the tab bar.

## Offline (production build)

- The worker cached this build (39 files, including `story-note.wav`). A version 4 kitchen upgraded on load.
- With the preview server stopped (a direct request failed; the page was worker-controlled), Chapter 1 was read by keyboard to the end.
- After an offline reload, `seenSceneIds: ["scene_faded-box"]` had persisted, the chapter and its note were listed, and Chapter 2 was waiting.
- An offline replay showed "Chapter 1: The Faded Recipe Box (replay)" with *Stop the replay* and *Close*. Closing it returned focus to the chapter heading and left the save untouched: same scenes, same 42 Crumbs and 215 XP, same `updatedAt`.

No console errors during any of it.
