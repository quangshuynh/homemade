# Interval 8 verification

Real-browser checks run in the Claude desktop app's built-in Chromium browser on 2026-10-09: flows against the dev server (`npm run dev`, React StrictMode on), offline against the **production build** (`npm run build && npm run preview`). Saves were real IndexedDB, written straight into the database or created through onboarding. The browser reported `prefers-reduced-motion: reduce`, so kitchens on the default motion setting ran reduced.

No physical phone was available, so standalone PWA mode, real safe-area insets, real touch and audio on a device were **not** checked this interval. Phone layouts were checked by viewport emulation only.

## Existing player (Interval 7 save)

A version 5 kitchen written into the database: all 19 ingredients, 11 recipes (every Classics card, Honey Flapjack and Millionaire's Shortbread), 240 Crumbs, 1,300 XP, all five chapters read.

- It loaded as version 6. On the first look after loading it was handed the cupboard's six starter pieces plus the framed gold seal (first Mythic), the little lemon tree (first Legendary) and the old rolling pin (every Classics card), and that was written straight away. Nothing was put out, the story and Crumbs were unchanged, and `updatedAt` kept its old value.
- **The archive held exactly one copy** of the original ("Upgraded from save version 5"), with StrictMode running the load effect twice. Interval 7 had recorded two; overlapping loads now share one read (see below).
- The kitchen showed the tiled wall, the window and the empty shelf, and the brass key in the cupboard lock with the tag *The old cupboard / The brass key fits*.
- Opening it played *Chapter 6: The Old Cupboard* (six beats, the cupboard-door note in pencil); putting it back focused "The cupboard's open, and everything in it is yours to put out."

## Decorating

- Choosing the wall, trying the framed recipe card and putting it out saved `{ wall: … }` and showed Marmalade's one-time "Oh, that looks like it's always been there." Five more pieces went out without another word, until the gingham towel completed the Cottage set: "The whole Cottage set, out at once. It looks lived in again."
- Every piece was drawn in both kitchens (two full sets of seven), and the kitchen read the names out in one hidden line.
- A purchase (the botanical print) asked first, took 345 → 295 Crumbs, landed focus on the new piece, already being tried; putting it out and the rolling pin out, then **reloading**, kept both out and the remarks noted.
- Under the default (reduced) motion a piece appears instantly (`animation-duration: 0s`); with motion set to full it fades in over 240ms. No slide or bounce either way.

## New player and the intended unlock point

- Onboarding a fresh kitchen made a version 6 save with an empty cupboard; the tutorial's first card opened as before, and the cupboard door showed only a keyhole, with no way in.
- A kitchen partway through (chapters 1–4 read) baked Millionaire's Shortbread: the Mythic reveal and the Chapter 5 nudge, and **no** cupboard news (the cupboard wasn't open yet). Reading Chapter 5 to the end paid its 25 Crumbs and handed over the starter set and the three earned keepsakes in the same write; the notes then said "Another note is waiting: The brass key has been waiting for something."

## Recipes

In that kitchen: Chocolate Haystack (Uncommon, Strange & Wonderful), Pistachio Nougat (Epic, Nutty), Jam Sandwich (Uncommon, Fruity) and Honey Madeleine (Common, Sweet & Sticky) were each discovered with the usual reveal and reward. The book read "21 of 31 recipes written down." with the dividers counting 5, 4, 4, 4, 5, 5 and 4 cards. *Bake again* on Pistachio Nougat laid out egg, sugar, honey and pistachios, unmixed, and all four appeared in Baking Memories.

## Save files

Using the app's own export and the Settings file picker:

- A file with something out that it didn't own was refused: "This save looks damaged, so it can't be opened safely. Nothing was changed." The current save's decorations were byte-for-byte the same afterwards.
- The exported file (renamed kitchen) showed the usual summary and, once confirmed, came back with `decorating` exactly as exported.

## Phones

Kitchen, decorating, Recipe Book, Pantry and Recipe Box Notes at 430, 390, 360 and 320 wide, and the kitchen and decorating at 844×390.

- At every size: 0px horizontal overflow, and no button or link under 44×44px (every spot, piece and action included).
- Scrolled to the end of decorating at 430 wide, the last control sits 47px above the tab bar.
- **Found and fixed:** at 320 the towel spot's tag broke mid-word ("Tow / el"); tags now wrap only between words. Decorations were also first drawn too small beside the counter objects, and the tiles read as graph paper: the wall's rows are taller on wide screens and the tiles are offset subway tiles.

## Offline (production build)

- The worker cached this build (42 files, including the three `decor-*.wav` sounds).
- With the preview server stopped (a direct request to it failed), a version 5 kitchen that had finished Chapter 5 opened the cupboard, skipped the scene, put out the framed scrap (Marmalade's remark about the pencil) and bought and put out the drying herbs (120 → 75 Crumbs).
- After an offline reload, both were still out and the Crumbs and remarks were saved.
- **Found and fixed:** "Put out the a scrap, framed": the two pieces named with an article are now *Framed gold seal* and *Framed scrap*, and a catalog test keeps articles out. Also, when the first piece out earned a bigger remark (the scrap), the next piece got "first thing out" too; any first remark now counts as that one.

## StrictMode double archive

Fixed (dev-only, but it touched real data): two overlapping `load()` calls on the IndexedDB repository now share one in-flight read, so an upgraded save is archived once. A regression test starts two loads before either writes and checks for exactly one archive entry; it fails without the fix.

No console errors from the app. The production tab's console was empty; the dev tab's only errors were Vite hot-reload failures from earlier in the session, while a source file was briefly swapped out to check that the regression test fails without the fix.
