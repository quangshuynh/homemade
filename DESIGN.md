# Design

The visual system as built through Interval 8. Tokens live in `src/styles/tokens.css`; this file explains them.

## World

A butcher-block kitchen counter seen from above, with real objects on it: an enamel mixing bowl, a tin recipe box with divider tabs, a pantry jar under a gingham cloth, index cards held down with tape. The screen *is* the counter. Things are slightly crooked, as they would be if a person had set them down.

What it refuses: dashboards, card grids, glass, gradients as decoration, pill-shaped everything, and cream-page-with-serif "cozy" defaults.

## Colour

Colours are named after the materials they come from.

| Role | Token | Source |
| --- | --- | --- |
| Ground | `--wood-*` | maple butcher block |
| Surfaces | `--paper`, `--paper-rule`, `--paper-margin` | 4×6 recipe cards: blue rules, red header line |
| Primary action | `--jam-500` | jam; used for Bake and primary buttons only |
| Accents | `--butter-*`, `--enamel-*`, `--kraft` | butter, duck-egg enamelware, kraft labels |
| Text | `--ink` (cocoa), `--ink-soft` | never pure black |
| Pen | `--ink-pen` | ballpoint blue: handwriting, ticks, focus ring |
| Marmalade | `--marmalade-*`, `--chef-white` | ginger fur, tabby stripes, cream muzzle, olive eyes, her toque |
| Rarity inks | `--rarity-*`, `--foil`, `--mythic-paper` | stamp inks (cocoa, enamel, ballpoint, damson, sealing wax, gold leaf); always paired with the word |
| Secrets | `--secret-ink` | midnight ink for a secret's wax seal and its marks; never a rarity colour, always with the word *Secret* |

All text pairs meet WCAG AA; most meet AAA (`--ink-soft` on paper is 8.5:1, on a rule line 6.7:1). The focus ring (`--ink-pen`) is 3.6:1 against the lightest wood.

## Type

- **Gluten**: display. Kitchen sign, screen titles, object labels. Soft and dough-like.
- **Atkinson Hyperlegible Next**: all running text and controls. Chosen for legibility.
- **Shantell Sans**: handwriting. Notes, greetings, values the player wrote (their names).

Fluid scale from `--text-xs` to `--text-3xl`. Body leading 1.55; handwriting 1.4.

## Shape and depth

- Paper is almost square (`--radius-paper: 3px`). Controls and tabs use slightly uneven radii so no two corners match exactly.
- Shadows are warm brown, offset downward, like light from a window above the counter. `--shadow-paper` for things lying flat, `--shadow-lifted` for things picked up, `--shadow-object` for 3D objects.
- Outlines are a 2px cocoa ink line on controls, 2.5px on illustrations.

## Components

- **Recipe tabs** (main nav): divider tabs standing in a wooden rim. The open section's tab is pulled up and underlined in jam. On phones they sit at the bottom, within thumb reach.
- **Counter objects**: illustrated links with a paper tag. Bake is the largest, with a jam-red tag.
- **Recipe card**: taped index card with faint rules; its `h1` sits on the red header line.
- **Hand note**: pen-blue handwriting, on a butter-yellow sticky note when it stands alone.
- **Buttons**: stamped card stock. They lift on hover and flatten on press.
- **Check boxes and radios**: hand-drawn boxes; ticks are drawn in pen.
- **Confirm dialog**: native `<dialog>`, safe choice focused first.

## Baking loop

- **Jars on a shelf** are toggle buttons (`aria-pressed`). Picking one lifts its lid, turns its label butter yellow, and adds a written "in the bowl" sticker, so the state never relies on colour alone.
- **The bowl** shows one dollop per ingredient in its jar colour. Mixing folds them into a single dough whose colour hints at the contents, never at the recipe. Beneath the bowl, a handwritten list names each ingredient, with a take-out button for each.
- **The oven** is a brief reveal (900ms) after the result is already decided and saved. Reduced motion skips it.
- **The result** is three cookies on a parchment tray beside a recipe card. A first discovery adds a jam-red *New recipe!* stamp with a puff of flour. Focus moves to the card heading, which reads "New recipe discovered: …" to screen readers.
- **Cookies** are drawn from a recipe's `look` (dough tone, topping, shape). Experiments are always the `wobbly` shape.
- **Recipe Book** cards are index cards; undiscovered ones are blank, taped over, with a "?". Since Interval 6 they're filed behind family dividers (see *Recipe families*).
- **Recipe Book hints**: an undiscovered card has a pen-written "Needs 4 ingredients" under the tape and, once everything it needs is owned, Marmalade's scribble (see *Clues*).
- **Bake again**: a plain stamped button at the foot of a discovered card. On the Bake screen the jars are already picked and a butter-yellow note says "Laid out for …". The note disappears the moment anything changes; the bowl stays unmixed.
- Ingredient and dough colours are tokens (`--swatch-*`, `--dough-*`). The catalogs name a swatch or tone, never a colour value.

## Baking memories

- **Cooling rack** (Home Kitchen): a steel wire rack (`--rack-wire`) at the front of the counter holding the last three bakes, each with a paper label in pen: name and a grease-pencil time ("Today, 9:30 AM"). It's small and sits below the counter objects, so the kitchen stays a kitchen. Empty, it's a single note: "Nothing on the cooling rack yet."
- **Baking Memories**: parchment slips pinned to the counter, newest first. Each shows the cookie, the name, where it came from ("From the Recipe Book" / "Not in any recipe book"), what went in, and a grease-pencil date. No numbers, stars or stats.
- **Recipe vs experiment** never relies on colour: the name says "Kitchen Experiment", experiments are always the wobbly shape, and their labels and slips have a dashed, scrap-paper edge.
- Cookies on the rack and slips are drawn from the same `look` data as everywhere else.
- Reached from the rack's "All your baking memories" link rather than a new tab, so the recipe-box tabs stay at five.

## Marmalade

The kitchen cat: an original ginger chef with olive-green eyes, darker tabby stripes, a cream muzzle, a small toque worn at an angle and an apron with a jam heart on the pocket. Drawn once in SVG (`components/Mascot.tsx`); her colours are tokens (`--marmalade-*`).

- **Personality:** warm, curious, clever, a little dramatic, a little mischievous. Encouraging, never sarcastic, never cutesy. One or two short sentences at a time, in her own handwriting (Shantell Sans), with her name written on the card so it's read out as "Marmalade: …".
- **Expressions:** `idle`, `happy` (closed crescent eyes), `thinking` (glance up, one brow), `surprised` (wide eyes, small "o"), `excited` (sparkly eyes, open mouth), `proud` (half-lidded, smirk: the mischief), `celebrate` (crescents, open mouth, blush), and `starstruck` (gold stars for eyes, open mouth, blush), kept for a first Mythic. Each is a different face on the same drawing.
- **Limited animation:** a blink every few seconds, an occasional ear twitch, a slow tail sway, and on big moments (`excited`, `celebrate`) one hat wobble and a small hop. No cinematics, no animation engine, nothing looping that draws the eye.
- **When she appears:** the tutorial; story scenes in Recipe Box Notes (see *Story*); a first card; the first recipe of a new rarity; a new level; a new ingredient. Since Interval 6, also once each for a kitchen's first secret (`surprised`: "A secret! Let's keep it between us."), first Mythic (`starstruck`), first finished family (`proud`: "Every Fruity card, back in the box.") and first pantry addition. When several firsts land at once she says the biggest: Mythic, then secret, then a new rarity, then a family, then a level. Since Interval 8, also once each for the first decoration put out (`happy`: "Oh, that looks like it's always been there."), the first whole set out (`proud`) and the framed scrap (`thinking`). In the kitchen she sits quietly beside the Baker plaque and says nothing. An ordinary bake, or swapping decorations about, gets no Marmalade at all.
- **Reduced motion:** every animation stops. She still changes expression, because that carries meaning.

## Tutorial

- A recipe card at the top of whichever screen it belongs to, in the page rather than over it, so it never covers the shelf, the bowl or the tab bar. "Card 3 of 9" in pen, a small dashed *Skip the tutorial* beside it, Marmalade and her line, and one primary button when there's something to read ("Hello, Marmalade", "Let's bake", "Where does it go?").
- **Talking cards** take focus (their line is focusable), so they're read out and Next is one Tab away; Skip is one Shift+Tab away. **Doing cards** (pick, mix, bake) leave focus where the player is and are announced politely.
- What she points at gets a dashed pen ring (jars, Mix, Bake it, the plaque, the additions shelf). Her card always says the same thing in words.
- During the pick step Mix waits for exactly flour, sugar and butter, and says so in its description: "Marmalade asked for just flour, sugar and butter."
- If the player wanders off, the card follows and offers *Back to the Bake* (or wherever it belongs).
- On phones it tightens: a smaller line, Skip beside the card count, the primary button full width.

## Progress and rarity

- **Baker plaque:** a kraft label with a stitched (dashed) inner edge, under the kitchen sign and at the top of the Pantry. "Baker Level 3", a stitched ribbon filled in butter, "140 / 170 XP" in pen, and Crumbs with their mark (three little crumbs). The ribbon is decoration and never pulses; the words carry it.
- **Rarity seals** (`components/RaritySeal.tsx`) are rubber stamps, always with the word. Each tier also differs in shape and a count of hand-painted stars, so colour is never the only cue:
  - Common: plain cocoa-ink stamp, no stars.
  - Uncommon: enamel-green stamp, one star.
  - Rare: ballpoint-blue double ring, two stars.
  - Epic: damson-plum double ring with a stitched edge, three stars.
  - Legendary: a pressed sealing-wax seal in jam, the word embossed, four stars.
  - Mythic: gold leaf on paper, stitched all round, five stars.
- Rare and rarer cards (in the Recipe Book and on the result) get a stitched edge in their stamp's ink; Epic and up a second inner rule. Warm inks and paper, never neon or glow.

## The discovery reveal

- Everything is in the page from the first frame (and read in order); only its appearance is staged, in beats: cookies on the tray → the name (beat 2) → the rarity stamp pressed on (3) → "+15 Crumbs · +20 XP" on a butter slip (4) → any level-up ribbon and the *New recipe!* stamp (5) → Marmalade, if she has something to say (6).
- A beat is 110ms for Common, rising to 400ms for Mythic (`screens/reveal.ts`), so a common card is done in about a second and a mythic one takes a breath. Rare and up add a few hand-painted stars that twinkle once around the tray.
- The rarity's chime is timed to the stamp landing; a level-up's ta-da follows it.
- Screen readers hear the heading ("New recipe discovered: …") and a status line: "Common recipe. Earned 15 Crumbs and 20 XP. Baker Level 2! …".
- **Level-up:** a butter ribbon with notched ends pinned across the card: "Baker Level 2! Chocolate chips and cinnamon can go in the pantry now.", with a link to the Pantry. Several levels at once are one ribbon naming the new level, never a stack of dialogs.

## Pantry additions

- A second shelf below the owned ones, "Pantry additions", with a dashed edge. Each ingredient is a jar wrapped in kraft paper and tied with jam-red twine, its contents just peeking out, beside a tag with its name, description and what it needs: "Baker Level 2" (with "✓ reached") and "20 Crumbs".
- *Add to pantry* is a real button when it's possible, and a dashed, flat, still-focusable "not yet" button when it isn't, with the reason written beneath it and attached as its description: "Opens at Baker Level 3. You're Level 2." or "You need 15 more Crumbs. New recipes earn them."
- Adding asks first, with a primary (not danger) confirm: "It costs 20 Crumbs and stays on your shelf for good. You'll have 30 Crumbs left." Afterwards a butter note with Marmalade takes focus, and the jar is on the shelf.
- Never a "Shop". Nothing says which recipes an ingredient is for.

## Reduced motion

The same information arrives, just all at once:

- The reveal's beats (`--motion-scale` is 0) and every duration collapse, so name, rarity, reward, level and Marmalade appear together. No sparkles.
- Marmalade's blink, twitch, tail, hat wobble and hop stop; her expression still changes.
- Tutorial cards and the "added" note appear without sliding. Nothing scrolls smoothly. The plaque ribbon never animates.
- A secret's extra beat collapses too: "Something unexpected…", the Secret seal and everything after it appear together. The Mythic's stars don't appear at all; its parchment, gold slip and Marmalade's starstruck face stay, because they carry meaning.
- Each stamp is pressed on by itself, never the whole line, so nothing ever scales past a phone's edge even mid-animation.
- Sound is independent: chimes still play if sound is on.

## Sound

- Sounds are the kitchen's own objects: a glass jar lid (pick), a wooden tock (take out), a whisk (mix), an oven timer bell (result), three rising bell notes (a new recipe), a music-box ta-da (a new level), a paper bag and a jar set down (a new ingredient), a paper flick (a tutorial card). Short, soft, and mixed well under the page.
- **A secret adds a hush** before its rarity's chime (see *Secrets*). It's a layer, not a tier: any rarity can be secret.
- **A new recipe's chime grows with its rarity**, from the same three notes: Uncommon adds a fourth, Rare a glassy shimmer, Epic a warm chord underneath, Legendary a second phrase, Mythic both and longer. Longer and fuller, never louder: every file is normalised to the same peak.
- Every sound answers something the player just did. Nothing plays on load, nothing loops, and there's no music.
- Screens ask for a meaning (`playSound('mix')`) and never see a file. The sound setting is checked in one place; turning it off also stops anything still ringing.
- The same sound can't stack on itself, and only a few play at once. A sound that isn't ready is skipped, never late.
- Sound and motion are independent: reduced motion keeps sound, and muting keeps motion.

## Recipe families (Interval 6)

- **The recipe box has dividers.** Above the cards, a row of kraft divider tabs (*Every family*, *Classics 1/5*, *Chocolate 0/4* …) filters the book to one family. They're real toggle buttons (`aria-pressed`) in a labelled group, so Tab, Enter and Space work and the chosen one is announced; a polite status line says what's shown ("Showing Chocolate: 3 of 4 discovered."). The chosen tab is pulled up out of the box: paper-coloured with a pen underline. No dropdown, no animation.
- **Each family is a section** with a kraft divider card across its top: the family name as a heading (`h2`) on the tab, and its progress beside it in handwriting ("3 of 5 discovered", "· 1 secret", "· every card back"). Cards are `h3` beneath it.
- **Empty families say so quietly:** "No recipes written here yet." in pen, above their blank cards. Never a hidden name.
- **On phones** the tabs wrap onto a few rows (smaller type, same 44px height) rather than scrolling sideways; long recipe names wrap inside their card.

## Clues

- Every blank card: "Needs 4 ingredients" in pen.
- Once every ingredient it needs is on the shelf: a small scrap of butter paper, tilted, in Marmalade's handwriting: "Marmalade scribbled: “Autumn leaves, in biscuit form.”" The label is part of the text, so it's read out in full. A feeling or a texture, never an ingredient, a rarity or a name.
- Secrets have no card, so they never have a clue.

## Secrets

- **Before it's found, nothing.** No card, no blank, no divider, no count and no word "secret" anywhere in the page.
- **The secret reveal** is one beat longer than usual, and quiet rather than loud: "Something unexpected…" in midnight ink (beat 1), then the name, then the rarity stamp with a round **Secret** wax seal pressed beside it (a keyhole in midnight ink, always with the word), then the reward and Marmalade. The *New recipe!* stamp reads *Secret recipe!* in the same ink, and the card gets a thin midnight rule just inside its edge, like a note slipped under a door. No confetti, no fanfare, nothing that looks like a prize draw.
- Screen readers hear "Secret recipe discovered: …" as the heading and "Something unexpected: a secret recipe! Rare recipe. Earned 40 Crumbs and 70 XP." as the status, in reveal order.
- **In the book** a found secret sits in its own family like any card, with the same Secret seal beside its rarity and the same midnight rule; the count line adds "Secrets found: 1".
- **Sound:** a hushed minor chord with three bell notes stepping *down* (`discover-secret`), played with "Something unexpected…", before the rarity's own chime. Only on a first discovery.

## The Mythic reveal

The strongest card in the kitchen, still made of paper:

- **Gold-leaf parchment** (`--mythic-paper` with two soft foil washes in opposite corners), inside the stitched gold border Epic and up already have.
- The stamp reads *Mythic find!*; the five-star gold-leaf seal lands on its slower beat (400ms); a gold-ink slip reads "✦ A Mythic recipe. Hardly any kitchen ever writes one down. ✦" (the stars are decorative and hidden from screen readers).
- Seven hand-painted stars twinkle once around the tray, and the longest chime plays.
- Marmalade is **starstruck**: gold stars for eyes, mouth open, a blush, one hat wobble and a hop.
- No glow, no screen shake, no flashing, no loop. A stylesheet test checks the Mythic rules for any of those.

## Story (Interval 7)

The story is something found in the kitchen, not a screen of its own: it lives at the back of the recipe box.

- **Recipe Box Notes** (`#/recipe-book/notes`) is reached from a kraft bookmark on the Recipe Book ("Recipe Box Notes") rather than a sixth tab, the way Baking Memories hangs off the cooling rack. No chapter list, no progress bars, no locked titles.
- **Chapter markers** are the same kraft divider cards as the families: "Chapter 2" in pen above the title (`h2`), and "Read" or "More to come" beside it. Its notes sit beneath as cards (`h3` for where each was found), then *Replay with Marmalade* (or *Replay part 1*, *part 2*). Chapters not yet reached aren't in the page at all; while the arc is unfinished, one pen line says "The rest of the box is still too faded to read. Keep baking."
- **Note visual language:** notes are in the box's *other* hand: graphite pencil (`--pencil`), slightly oblique, never Marmalade's ballpoint blue. That contrast is how a glance tells them apart. Each kind is drawn as what it is: `margin` is pencil past a card's red margin rule; `card` is a ruled index card with the red header line; `scrap` is darker paper, tilted, with a torn bottom edge; `label` is kraft with a stitched (dashed) inner edge. Where it was found ("Pencilled beside a spiced card") is a small bold caption above it. Once a clue's secret is baked, Marmalade's blue pen adds "Found it. Snowball." on a butter slip.
- **Dialogue** reuses the tutorial's propped-up card: the chapter title in the corner ("Chapter 2: Notes in the Margins, part 1"), a dashed *Skip this scene* beside it, "3 of 6" in pen, then Marmalade and her line (`MascotSays`, read as "Marmalade: …") or a note read out as "Inside the lid of the recipe box, in someone else's handwriting: …", and one primary button: *Next*, then *Put it back in the box* (*Close* on a replay, with *Stop the replay* in place of Skip). Every beat's line takes focus, so it's announced and Next is one Tab away. Nothing advances by itself.
- **After a scene**, a butter note takes focus: "Put back in the box. That's the end of Notes in the Margins." and, the first time a chapter completes, "Tucked between the cards: 10 Crumbs." If another scene is now ready, the slip below says "Another note is waiting".
- **New-note indicators** are words on paper, never a red dot or a count: the waiting slip ("A new note", with a kraft bookmark poking up and *Read it with Marmalade*), "New note" on a butter slip on the Recipe Book's bookmark, "A new note inside" on the kitchen's recipe box tag (with Marmalade looking thoughtful and a tiny pen speech mark beside her, decorative only), and once, under a bake or pantry addition that opened it, a paper slip: "New note: There's pencil in the margin of one of your cards. *Open the Recipe Box Notes*". Never a pop-up, never repeated.
- **Marmalade in the story:** the same drawing and expressions, no new ones. `thinking` when she's puzzling, `surprised` when a note catches her out, `happy` when she remembers something, `proud` when she's worked something out. She speaks in short lines and asks more than she explains. The first Mythic keeps its own starstruck reaction; the finale's nudge sits beneath it rather than adding a second voice.
- **Sound:** *Next* is the tutorial's paper flick; the first time a scene is put back, a card slides in with one low, warm bell (`story-note`). Never on a replay. No voice, no music.
- **Reduced motion:** the scene card arrives without sliding (it uses the tutorial card's `--duration-slow`, which reduced motion zeroes), Marmalade doesn't blink, bob or wobble, and nothing flutters. Expressions still change. Every line appears the moment Next is pressed, with or without motion: the story never sets its own pace. A stylesheet test keeps the story's CSS to duration tokens only.
- **Phones:** the card tightens like the tutorial's (smaller line, full-width buttons); notes stack one per row; every link and button is at least 44px; checked at 430, 390, 360 and 320 with no sideways scroll.

## Decorating (Interval 8)

The kitchen gets a back wall, so decorations have somewhere to go without crowding the counter.

- **The kitchen picture** reads back to front: a cream subway-tiled wall behind the counter (`--wall-tile`, tiles drawn as an inline SVG pattern), with a frame spot on the left, a four-pane window in the middle and a wall shelf on the right; along its bottom, a dark wood lip (the back edge of the counter) with three spots standing on it: by the recipe box, under the window, by the pantry jar. Then the counter objects, unchanged, overlapping the lip a little because they're nearer. Under them, a strip of painted cupboard doors (`--cupboard`), the right-hand door handle carrying the towel spot. An empty spot is just the kitchen: a nail on the wall, a bare window, an empty shelf.
- **Layering** is a token list in `tokens.css`, back to front: `--layer-scene-wall`, `-wall-decor` (frames), `-fixtures` (window, shelf), `-fixture-decor` (curtains, herbs, what's on the shelf), `-counter-back`, `-counter-decor`, `-objects` (the recipe box, bowl and jar), `-front` (cupboard and towel), `-edit` (edit mode's outlines), then the page's own `--layer-dock`, `--layer-nav` and `--layer-dialog`. Every `z-index` in the app is one of these tokens; a stylesheet test checks both that and the order.
- **The art** is the kitchen's own hand: flat SVG shapes, a 2px cocoa outline, colours from tokens named after materials (`--terracotta`, `--stoneware`, `--glaze-green`, `--copper-*`, `--gilt`, `--brass`, `--leaf-*`, `--sky`). Reusable drawings take a variant (`towel` gingham/fruit/stripe, `frame` with its picture and moulding, `jar`, `crock`, `pot-plant`), so a new piece is usually a new variant, not a new drawing. The window's curtains and herbs share the window's box, so they always line up with the glass. All decorative and `aria-hidden`; in the kitchen one visually hidden line reads out what's out ("Out in your kitchen: Café curtains, Potted thyme.").
- **The cupboard and its way in.** Before Chapter 5 ends, the left door just has a keyhole. Afterwards the brass key (string and all) sits in the lock with a kraft tag tied to it: *The old cupboard* / *The brass key fits* (until its scene is read), then *Make it yours*. The tag is the only way into decorating: a physical object, not a "Customize" button.
- **First opening.** The first visit to `#/decorate` plays the cupboard's scene on the story card (*Chapter 6: The Old Cupboard*, Skip always there). Putting it back focuses a butter note: "The cupboard's open, and everything in it is yours to put out." The key turns with `decor-open`.
- **Edit mode** (`#/decorate`, "Make it yours", with *Done* back to the kitchen) is the same picture drawn as a plan: squared pen-blue dots over the tiles, a dashed pen border, and the counter objects faded and desaturated, since they're not what's being arranged. Every spot is a `<button aria-pressed>` covering its zone, with a pen-outlined tag naming it ("Wall", "Counter, left", "Towel"); the chosen spot's outline is solid and its tag filled in pen. Each spot's accessible name says what's in it: "Wall: Framed recipe card, trying it here".
- **The chooser** below the picture is a paper card: "Choosing for / Wall", "Out now: …" in handwriting, then what fits that spot, standing on a cupboard shelf (a strip of paper shade with a wooden plank along the bottom). Each piece is a toggle button with its drawing and name; the one shown in the spot is outlined in dashed pen and labelled in words ("Out now", or a butter "Trying it"). Trying something draws it in the spot with a butter "Trying it" slip and saves nothing. *Put out the …* (primary) and *Clear this spot* are always there in the same place; when they can't act they're `aria-disabled` with the reason written below and attached ("Pick something above to try it here first.", "Nothing's out here to clear."), so focus is never lost.
- **Not in your cupboard yet** lists the spot's other pieces, faded behind a dashed kraft edge, each saying how it arrives in words ("For your first Legendary recipe.", "For finding every Fruity card.") or its price with a *Buy it* button (or why not: "You need 10 more Crumbs. New recipes earn them."). Buying asks first, with a primary confirm; afterwards focus lands on the new piece, already being tried in its spot.
- **What's in the cupboard** groups everything by theme (Cottage, Warm Bakery, Garden Kitchen, Keepsakes) on paper cards with a kraft divider, "2 of 4 out" in pen, each piece's state in words. Read-only: a reference, not a shop.
- **Feedback** is a polite status line ("Put out: Café curtains, on the window. The … went back in the cupboard."), and Marmalade's one-time remarks appear in a live region in the chooser, never taking focus.
- **On phones** the wall is shorter (5.5rem and 3.5rem rows, shorter still in short landscape), spot tags wrap between words, the cupboard shelf wraps into rows (never scrolls sideways), and the action buttons go full width. No dragging anywhere; every spot, piece and link is at least 44px. Checked at 430, 390, 360 and 320 wide and 844×390.
- **Bake news.** A bake that earns a keepsake gets a kraft tag with the brass key under the result: "For your kitchen: something new in the old cupboard (little lemon tree). *Open the cupboard*". It never opens anything or puts anything out.
- **Sound:** `decor-open` (two clicks of a brass key and a soft door) for the first opening; `decor-equip` (a small wooden knock) when something is put out, never on a preview; `decor-unlock` (tissue paper and two warm bell notes) for a purchase or a newly earned piece; clearing a spot reuses the wooden *tock*. Nothing for selecting a spot or trying a piece.
- **Reduced motion:** a piece that's put out or tried fades in over `--duration-base` (opacity only, never a slide or bounce), which reduced motion makes instant. The tag's hover lift uses `--lift-hover`, also zeroed. No information depends on motion. A stylesheet test keeps decorating to duration tokens.

## Motion

- `--ease-out` / `--ease-settle`, exponential ease-out; no bounce.
- Hover lifts (`--lift-hover`), press scales (`--press-scale`), screens settle in from 8px below.
- Ambient: the dough on the kitchen counter rises very slowly.
- Baking: dollops drop into the bowl, the bowl wobbles as it mixes, the oven glows, cookies settle onto the tray, and the stamp lands. Every one of these has a zero-duration end state under reduced motion, so nothing is hidden when motion is off.
- `prefers-reduced-motion` zeroes durations and stops ambient loops. The player can override it either way in Settings; this is stored as `data-motion` on `<html>`.

## Phones and small screens

- **Tab bar:** fixed at the bottom on phones, a wooden rim with the dividers hanging from it; the open section's card is pulled up through the rim. Its height is `--nav-height` plus the home-indicator inset, and `--nav-clearance` is what everything else reserves.
- **Safe areas:** `--safe-*` tokens wrap `env(safe-area-inset-*)`. Side padding uses `--gutter-left/right`, so landscape notches never cover content; the tab bar pads for the home indicator and both sides.
- **Nothing hides under the bar:** every screen reserves `--nav-clearance` at the end, `scroll-padding-bottom` keeps focused and scrolled-to elements above it (and above the Bake dock), and anything pinned to the bottom sits above it. A stylesheet test enforces this.
- **Short landscape phones** (under 500px tall) get a slimmer bar with icon and label side by side.
- **Bake on a phone:** the bowl's actions dock as a paper strip above the tab bar ("3 of 5 in the bowl", Mix) while the shelf is on screen, and settle under the bowl when you reach it. Pure `position: sticky`. Pressing Mix from the dock brings the bowl into view to show the dough.
- **Bake again on a phone:** the "Laid out for…" note sits above the bowl, takes focus (so it's read out), and the bowl is scrolled into view only if it's off screen. Element-based, never a hard-coded offset, and instant under reduced motion.
- Viewport heights use `dvh`, never `100vh`.

## Notices and dialogs

- **Update note:** a butter-yellow sticky note above the tab bar: "A fresh batch of Homemade is ready." with *Refresh* and *Later*. Polite status, never modal, never automatic.
- **Import confirmation:** the standard confirm dialog, with the file's kitchen written out on a paper slip (kitchen, baker, recipes, memories, last saved) and a plain sentence about what happens to the current kitchen. *Keep my kitchen* is focused first; focus returns to *Open a save file…* on close. Long content scrolls inside the card.
- Refusals (bad file, newer version) are an inline alert under the controls, with the technical detail tucked in a disclosure.

## App icon

The cookie "o" from the wordmark, with a bite out of it, on duck-egg enamel (the mixing bowl's colour). The full wordmark is never squeezed into a square. A maskable version keeps the cookie inside the safe zone. Source: `scripts/icon-mark.svg`.

## Layout

- Kitchen, back to front: the tiled wall with its spots, the counter objects, the cupboard doors, then the cooling rack (see *Decorating*).
- Phone (<720px): bowl first and full width, recipe box and jar side by side below it, tabs fixed at the bottom (see *Phones and small screens*).
- Tablet: three objects in a row, content flows.
- Desktop (≥960px): the kitchen fills the viewport, with the counter in the middle distance.
- Cooling rack: three across; under 480px, one bake per row with its label beside it, so names never break mid-word.
- No horizontal scroll at 320px.
