# Interval 10 verification

Real-browser checks run in the Claude desktop app's built-in Chromium browser on 2026-11-04: story flows against the dev server (`npm run dev`, React StrictMode on), offline against the **production build** (`npm run build && npm run preview`). Saves were real IndexedDB, written straight into the database or created through onboarding. The browser reported `prefers-reduced-motion: reduce`, so kitchens on the default motion setting ran reduced. The browser pane was hidden for most of the pass, so flows were driven through the page's own buttons by script and read back as text, with screenshots taken under viewport emulation.

## Real devices

**No physical phone or tablet was available, so nothing in this interval was tested on a real device.** Everything below is browser-only. Phone layouts were checked by viewport emulation, which doesn't reproduce safe-area insets, the home indicator, iOS audio unlocking or standalone-PWA behaviour.

Checklist for the first real-device pass (iPhone / iOS Safari first, Android Chrome as a bonus):

- [ ] Safari's Share → **Add to Home Screen**, then launch standalone: no browser chrome, the right icon and name, the paper background behind the status bar.
- [ ] **Safe areas**, portrait and landscape, standalone and in Safari: the bottom tab bar clears the home indicator; the Bake screen's sticky controls, the story card's *Next* / *Skip this scene*, the decorating chooser's buttons and the update notice are never under the notch, the home indicator or Safari's toolbar.
- [ ] **Home Kitchen**: the wall, the framed photograph on the wall spot, the cupboard tag (*Something at the back* while Chapter 7 waits).
- [ ] **Bake**: picking, mixing, the reveal, the story nudge under a result.
- [ ] **Story**: read a scene by touch, skip one, replay one; the photograph note's torn corner and border; Marmalade's `wistful` face.
- [ ] **Recipe Box Notes** and **Kitchen Keepsakes**: scrolling, nothing hidden under the tab bar, *Kept in the Tin* appearing only once earned.
- [ ] **Decorating**: put something out, see the "New note" slip; hang the fair-day photograph.
- [ ] **Focus**: with VoiceOver, each story line is read as it appears and the note intro reads naturally ("Inside the lid of the tin, in Edie's pencil: …").
- [ ] **Audio**, after the first tap: ingredient pick, mix, oven ding, each rarity chime, `story-note`, `arc-complete`, `achievement-unlock`, `mastery-up`. Nothing uncomfortably loud, no clipping, nothing overlapping badly (an arc ending with a keepsake plays `arc-complete`, then the stamp ~0.9s later). The mute switch and Settings' sound toggle both silence it.
- [ ] **Persistence**: read a chapter, swipe the app away, relaunch: still read. Then airplane mode and relaunch: the game opens, a story recipe can be baked and its chapter read.

## Existing player (Interval 9 save, version 7)

A version 7 kitchen written into the database: all 19 ingredients, 12 recipes, the whole first arc read, the cupboard's starter set (plus two keepsake pieces) owned and **nothing out**, four keepsakes, 40 Crumbs.

- It loaded **without a migration** (still version 7, no archive entry). The kitchen showed no new-note flag and the cupboard's tag said *Make it yours*: Chapter 7 waits for something to be out. The earlier keepsake pieces it qualified for arrived in the cupboard as before.
- **Chapter 7.** In the decorating screen, putting the café curtains out said "Put out: Café curtains, on the window. A keepsake for the recipe box: Make It Yours." and showed the slip "New note: Something shifted at the back of the old cupboard. *Open the Recipe Box Notes*". Back in the kitchen the cupboard's tag read *Something at the back*. In Recipe Box Notes every first-arc chapter was still listed with its replay. The scene played six beats with each line focused and the right face (surprised, note, thinking, happy, note, thinking); putting it back paid 10 Crumbs and filed *Chapter 7 Behind the Cupboard* with its two notes as `h3`s.
- **Chapter 8.** Baking oats, sugar, butter, egg and honey: "New recipe discovered: Edie's Oat Crisps · Rare · +40 Crumbs · +70 XP", then "New note: The card from the tin has a name at the bottom." The scene named Edie (with the new `wistful` face) and paid 15.
- **Chapters 9 and 10.** The first *Lunchbox Windows* opened Chapter 9 (15 Crumbs). A second bake opened nothing. The third said "Lunchbox Windows is Familiar now: baked 3 times.", stamped *Getting Familiar*, and opened Chapter 10, whose photograph note was drawn as a photo (20 Crumbs).
- **Chapter 11.** *Fair-Day Parkin* opened it. Seven beats; the closing note read "Put back in the box. That's the end of For M. The tin is empty now, all but the letter…", then the keepsake label: "Kept in the Tin … Came with the fair-day photograph, now in the old cupboard." The waiting slip and the "still too faded" line were gone.
- Crumbs went 40 → 205, exactly the three discoveries (40 + 25 + 40) and the four chapter rewards (10 + 15 + 15 + 20). XP rose only by the discoveries. The save stayed version 7.
- The photograph went up on the wall from the chooser ("Put out: Fair-day photograph, on the wall."); the kitchen read out "Out in your kitchen: Fair-day photograph, Café curtains." Before it was earned it was absent from the wall spot's *Not in your cupboard yet* list and from *What's in the cupboard*.
- **Found and fixed:** "That's the end of For M.." (a doubled full stop after a title ending in a full stop). And every note was introduced to screen readers as "in someone else's handwriting", including ones that describe an object (the tin's blank card, the photograph, the envelope; also the first arc's brass key) or that already name the hand ("Inside the lid of the tin, in Edie's pencil, in someone else's handwriting"). Notes now say which (`intro`), and the redundant phrase is gone.
- **Found and fixed (in tests, before the browser pass):** the cupboard's *What's in the cupboard* list would have named the fair-day photograph and its "torn corner" before Arc 2 began. Decorations that come with a hidden keepsake are now left out of both lists until owned.

## New player

Onboarding then *Skip the tutorial*: Recipe Box Notes showed only "A new note: Marmalade has something to show you in the recipe box." No chapter numbers, titles or notes from Arc 2 anywhere in the page.

## Replay and skip

Replaying Chapter 11 (online and offline) showed "Chapter 11: For M. (replay)" and *Stop the replay*, and left the stored save byte-for-byte identical. Skipping is covered by tests (it pays exactly what reading does and files the notes).

## Offline (production build)

- After *Refresh* on the update notice, the page ran this build (`index-DNUE2-gk.js`, matching `dist/index.html`), and the worker's cache held `arc-complete.wav` with the rest of the build.
- With the preview server stopped (a direct request failed with a network error), a kitchen through Chapter 10 baked *Fair-Day Parkin* (the Chapter 11 nudge appeared), read Chapter 11, and got the keepsake and the photograph. After an **offline reload** the save held all 12 scenes, the keepsake, the photograph and 140 Crumbs (100 + 40); a replay changed nothing.
- The only console error was that deliberate request to the stopped server.

## Phones

Kitchen, Recipe Box Notes (all 11 chapters), decorating, Kitchen Keepsakes, Recipe Book and Bake at **430, 390, 360 and 320** wide and **844×390**: **0px horizontal overflow** and **no link or button under 44×44px** on any of them. In 844×390 the story card's *Next* and *Stop the replay* were both inside the viewport and clear of the tab bar. The photo note's text (ink on `--photo-print`) is far above AA contrast. Under reduced motion it has no animation or transition.

## Audio

Not listened to on a device (see above). In the browser, a first reading recorded `story-note` and the arc's last scene recorded `arc-complete` instead, never both; replays recorded neither (tests check the same). `arc-complete` is normalised to the same peak as every other effect and played at volume 0.3, like `story-note`.

## Automated

633 tests (Vitest, jsdom, `fake-indexeddb`): Arc 2's chapter eligibility, order and queue, E., R. and M. reveal timing, the Familiar step (two bakes don't open it; three do), skip, replay idempotence, the arc's rewards paid once, the keepsake and photograph granted once and retroactively, rebakes not farming; content validation (unique ids, no missing scenes, notes or recipes, at most one mastery step and never past Familiar, decoration steps only after the cupboard opens, every story recipe bakeable from obtainable ingredients, notes never naming an ingredient); the catalog's balance (family sizes within one, Epic cap, no ingredient-order deadlock); save files round-tripping Arc 2 state with no version change; and UI flows for the kitchen cue, the decorating nudge, keyboard reading, skip, replay, the photo note, the arc ending and the hidden keepsake and decoration. Lint, type-check and production build pass.
