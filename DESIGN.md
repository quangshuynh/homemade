# Design

The visual system as built in Interval 1. Tokens live in `src/styles/tokens.css`; this file explains them.

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
- **Sticker**: small round-ended label for status words ("coming soon").
- **Buttons**: stamped card stock. They lift on hover and flatten on press.
- **Check boxes and radios**: hand-drawn boxes; ticks are drawn in pen.
- **Confirm dialog**: native `<dialog>`, safe choice focused first.

## Motion

- `--ease-out` / `--ease-settle`, exponential ease-out; no bounce.
- Hover lifts (`--lift-hover`), press scales (`--press-scale`), screens settle in from 8px below.
- One ambient detail: the dough in the bowl rises very slowly.
- `prefers-reduced-motion` zeroes durations and stops ambient loops. The player can override it either way in Settings; this is stored as `data-motion` on `<html>`.

## Layout

- Phone (<720px): bowl first and full width, recipe box and jar side by side below it, tabs fixed at the bottom.
- Tablet: three objects in a row, content flows.
- Desktop (≥960px): the kitchen fills the viewport, with the counter in the middle distance.
- No horizontal scroll at 320px.
