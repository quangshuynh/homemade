# Interval 6 verification

Real-browser checks run in the Claude desktop app's built-in Chromium browser on 2026-10-01: flows against the dev server (`npm run dev`), offline and the service worker against the **production build** (`npm run build && npm run preview`). Saves were real IndexedDB, created through onboarding or written straight into the database. Saves that were already in the browser were put back afterwards.

## Existing player (Interval 5 save)

A version 4 kitchen already in the dev browser (Robin / Crumb Corner: starter pantry, Shortbread found, 15 Crumbs, 50 XP, tutorial skipped).

- Loads with no upgrade and no tutorial. The Recipe Book reads "1 of 24 recipes written down." with Shortbread under **Classics**, seven family dividers (*Classics 1/5 … Strange & Wonderful 0/3*), and Marmalade's scribble on exactly the blank cards its five ingredients can make (Sugar Cookie, Vanilla Kiss, Meringue Kiss).
- The page contains no secret recipe's name and no word "secret".

## New player

Onboarding → the full nine-card tutorial → new recipes → a first addition.

- The tutorial is unchanged: Shortbread is still the guided bake ("A Common card… 15 Crumbs and 20 XP"), the Pantry card still names chocolate chips at Level 2. The result now says "Copied into your Recipe Book, under Classics."
- With the starter pantry, egg + sugar is **Meringue Kiss** (Uncommon, +25 Crumbs · +40 XP), which crosses Level 2. Marmalade: "Uncommon! Now we're getting somewhere."
- Adding chocolate chips: "Chocolate chips! Your first addition. The shelf's starting to look like yours." The seven new ingredients sit in *Pantry additions* with their level and cost (strawberry jam Level 3 / 20 … sea salt Level 11 / 60) and "Opens at Baker Level 3. You're Level 2."

## Secrets and the Mythic

A late-game kitchen (all 19 ingredients, Level 11, sound on, full motion) written into the database.

- **Before:** 22 blank cards, each with a scribble; no secret's name, card, count or "secret" anywhere in the DOM.
- **Snowball** (coconut, sugar, egg, white chocolate): heading "Secret recipe discovered: Snowball", stamp *Secret recipe!*, "Something unexpected…", Rare and **Secret** seals, "+40 Crumbs · +70 XP", "under Strange & Wonderful", Marmalade's first-secret line. Status: "Something unexpected: a secret recipe! Rare recipe. Earned 40 Crumbs and 70 XP." Measured beats for a Rare: unexpected 0.2s, name 0.6s, seals 0.8s, reward 1.0s, Marmalade 1.4s.
- **Millionaire's Shortbread:** *Mythic find!*, gold-leaf parchment (`rgb(252, 241, 210)`), the gold slip, seven sparkles, Marmalade `starstruck`: "A Mythic. In this kitchen. …". Exactly +300 Crumbs and +320 XP; a rebake changed neither. `discover-mythic.wav` and `discover-secret.wav` both loaded.
- **Reduced motion**, same Mythic: the result is up immediately (no oven), every reveal element has a 0s delay and duration, no sparkles, no hop or hat wobble, and the starstruck face still shows.

## Phones

320, 360, 390 and 430 wide, every screen: no horizontal scroll, and no button or standalone link under 44 × 44px.

- The Recipe Book's dividers wrap (five rows at 320px, all 44px tall); the last control sits above the tab bar after scrolling to the end.
- **Found and fixed during this pass:** at 320px the reveal briefly overflowed sideways while the rarity stamp was pressed on, because the whole rarity *line* scaled to 160%; the press now applies to each seal on its own. The Mythic's two outermost stars also poked 1px past the screen edge; on phones they now sit closer to the tray. Re-checked by stepping every reveal animation through its timeline at 320px: 0px overflow for the PB & Jam secret and for the Mythic.

## Offline and updates (production build)

The preview origin already had an Interval 5 build and a kitchen (Sam / Oven Mitts, upgraded from Interval 4: the old 12 ingredients, 15 Crumbs, 40 XP).

- The new worker installed in the background (38 files, including `discover-secret.wav`) and waited; *A fresh batch of Homemade is ready.* appeared. *Refresh* activated it, removed the old cache, and left the save byte-for-byte identical.
- With the preview server stopped (a direct request to it failed; the page was worker-controlled): the Recipe Book's families loaded, and this kitchen baked Meringue Kiss and Honeycomb Crunch (Level 3; the level-up named only strawberry jam, since it owns oats and cocoa), added strawberry jam, and found the **Peanut Butter & Jam Thumbprint** secret with its full reveal.
- Reloaded, still offline: "4 of 24 recipes written down. Secrets found: 1", Nutty "0 of 3 discovered · 1 secret", jam in the pantry, 110 Crumbs and 230 XP (15 + 25 + 15 − 20 + 75; 40 + 40 + 20 + 10 + 120), original discovery dates, names, settings and tutorial state unchanged, still save version 4.
- `discover-secret.wav` was served from the cache offline and decoded (1.5s).

No console errors and no dev-server errors during any of it.
