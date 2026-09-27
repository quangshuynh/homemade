# Design

The visual system as built through Interval 4. Tokens live in `src/styles/tokens.css`; this file explains them.

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

## Sound

- Sounds are the kitchen's own objects: a glass jar lid (pick), a wooden tock (take out), a whisk (mix), an oven timer bell (result), three rising bell notes (a new recipe). Short, soft, and mixed well under the page.
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
