# Interval 9 verification

Real-browser checks run in the Claude desktop app's built-in Chromium browser on 2026-11-04: flows against the dev server (`npm run dev`, React StrictMode on), offline against the **production build** (`npm run build && npm run preview`). Saves were real IndexedDB, written straight into the database or created through onboarding. The browser reported `prefers-reduced-motion: reduce`, so kitchens on the default motion setting ran reduced.

## Real devices

**No physical phone or tablet was available**, so this interval's first real-device pass did not happen. Not checked: Add to Home Screen on iOS Safari (which has no `beforeinstallprompt`, so the in-game install offer never appears there and Safari's Share menu is the only way), Android Chrome's install prompt, standalone launch, real safe-area insets and the home indicator, real touch, audio unlocking after the first tap, and IndexedDB surviving the app being closed and reopened on a device. Phone layouts were checked by viewport emulation only. This should be the first thing done when a device is to hand.

## Existing player (Interval 8 save)

A version 6 kitchen written into the database: all 19 ingredients, 17 recipes (every Classics and Fruity card, Honey Flapjack, Millionaire's Shortbread and the Snowball secret), 240 Crumbs, 1,300 XP, every chapter read, the cupboard open with 11 pieces owned and two out, and five remembered bakes (four Shortbread, one experiment).

- It loaded as **version 7**, with exactly one archive entry ("Upgraded from save version 6") under StrictMode.
- **Mastery started conservatively:** Shortbread at 4 (the four remembered bakes), every other card at 1 (in the book, so baked at least once). Nothing more was claimed.
- **Ten keepsakes were stamped on the first load**, in catalog order: Happy Accident, Recipe Keeper, Recipe Box Half Full, Something Special, Secret Ingredient, Written in Gold, Family Recipe, Getting Familiar, Make It Yours, The Last Page.
- Their decorations (cookie tin, embroidered oven mitt, favourite-cookie plate) went into the open cupboard **once**; nothing was put out. Crumbs, XP and `updatedAt` were unchanged.
- The Keepsakes page showed them stamped and pinned, *Every Card Home* as a pencil outline saying *Not yet*, and the two hidden ones now visible because they'd been earned.

## Decorating

- Putting out the curtains, cookie tin, plate, thyme and crock filled the last spot: the status line said "A keepsake for the recipe box: Lived In. New in your cupboard: Marmalade figurine.", the keepsake label appeared under the chooser, and Marmalade said "Something in every spot. It finally looks like somebody lives here. Somebody does."
- All six new pieces were drawn in the kitchen or the cupboard's *Not in your cupboard yet* list (figurine and tin on the shelf, plate on the counter, mitt on the cupboard handle; bundle and spoon in the list).
- **Found and fixed:** the figurine's name was lowercased mid-sentence ("marmalade figurine"). Decoration names now go through one helper that keeps Marmalade's capital, with a test. The *how to get it* line for keepsake pieces repeated the description; it now just names the keepsake.

## New player

Onboarding made a version 7 save with no keepsakes, no counts and no favourites. The tutorial's guided Shortbread bake showed the usual reveal and **no keepsake label** (nothing is earned by the tutorial bake), and recorded Shortbread at 1 bake.

## Recipe Book and favourites

Marking Shortbread a favourite set `aria-pressed="true"`, filled the heart, saved it, and added a *♥ Favourites* divider; the kitchen then showed it under *Favourites* with *Bake again*. The card read "Familiar · Baked 4 times" with the stage inked as a stamp.

## Offline (production build)

- The worker precached this build (45 files, including `achievement-unlock.wav`, `mastery-up.wav` and `favorite.wav`).
- With the preview server stopped (a direct request to it failed), a version 6 kitchen (Shortbread and Blondie found, two Shortbread bakes remembered) baked an experiment: **Happy Accident** and Marmalade's first-keepsake line. Then Shortbread: "Shortbread is Familiar now: baked 3 times." and **Getting Familiar**. Blondie was marked a favourite.
- After an **offline reload**, the save held both keepsakes, Shortbread at 3, Blondie at 1 and the favourite; Crumbs and XP were unchanged. The plate that comes with Getting Familiar was correctly held back, since that kitchen's cupboard isn't open yet. *Something to try* read "Bake Blondie again. It's 2 bakes from Familiar."
- The production tab's console was empty.

## Phones

Recipe Book, Kitchen Keepsakes, Kitchen and decorating at 430, 390, 360 and 320 wide and 844×390: **0px horizontal overflow** and **no link or button under 44×44px** on any of them.

## Automated

596 tests at the time of the browser pass (Vitest, jsdom, `fake-indexeddb`), covering the keepsake catalog and rules, mastery boundaries, favourites, the v6 → v7 migration, save-file round trips, the reveal, the Keepsakes page (hidden keepsakes absent from the DOM), favourites in the book and kitchen, and keyboard-only navigation. Lint, type-check and build pass.

## Console

The dev tab logged `nameInSentence is not defined` while a source file was half-edited during the fix above (hot reload between two edits). It went away once the edit was complete; the shipped files type-check and the production build's console was empty.
