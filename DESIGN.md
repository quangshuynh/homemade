# Design

The visual system as built through Interval 5. Tokens live in `src/styles/tokens.css`; this file explains them.

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
| Rarity inks | `--rarity-*`, `--foil` | stamp inks (cocoa, enamel, ballpoint, damson, sealing wax, gold leaf); always paired with the word |

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
- **Recipe Book** cards are index cards; undiscovered ones are blank, taped over, with a "?".
- **Recipe Book hints**: an undiscovered card adds only a pen-written "Needs 4 ingredients" under the tape.
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
- **Expressions:** `idle`, `happy` (closed crescent eyes), `thinking` (glance up, one brow), `surprised` (wide eyes, small "o"), `excited` (sparkly eyes, open mouth), `proud` (half-lidded, smirk: the mischief), `celebrate` (crescents, open mouth, blush). Each is a different face on the same drawing.
- **Limited animation:** a blink every few seconds, an occasional ear twitch, a slow tail sway, and on big moments (`excited`, `celebrate`) one hat wobble and a small hop. No cinematics, no animation engine, nothing looping that draws the eye.
- **When she appears:** the tutorial; a first card; the first recipe of a new rarity; a new level; a new ingredient. In the kitchen she sits quietly beside the Baker plaque and says nothing. An ordinary bake gets no Marmalade at all.
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
- Sound is independent: chimes still play if sound is on.

## Sound

- Sounds are the kitchen's own objects: a glass jar lid (pick), a wooden tock (take out), a whisk (mix), an oven timer bell (result), three rising bell notes (a new recipe), a music-box ta-da (a new level), a paper bag and a jar set down (a new ingredient), a paper flick (a tutorial card). Short, soft, and mixed well under the page.
- **A new recipe's chime grows with its rarity**, from the same three notes: Uncommon adds a fourth, Rare a glassy shimmer, Epic a warm chord underneath, Legendary a second phrase, Mythic both and longer. Longer and fuller, never louder: every file is normalised to the same peak.
- Every sound answers something the player just did. Nothing plays on load, nothing loops, and there's no music.
- Screens ask for a meaning (`playSound('mix')`) and never see a file. The sound setting is checked in one place; turning it off also stops anything still ringing.
- The same sound can't stack on itself, and only a few play at once. A sound that isn't ready is skipped, never late.
- Sound and motion are independent: reduced motion keeps sound, and muting keeps motion.

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

- Phone (<720px): bowl first and full width, recipe box and jar side by side below it, tabs fixed at the bottom (see *Phones and small screens*).
- Tablet: three objects in a row, content flows.
- Desktop (≥960px): the kitchen fills the viewport, with the counter in the middle distance.
- Cooling rack: three across; under 480px, one bake per row with its label beside it, so names never break mid-word.
- No horizontal scroll at 320px.
