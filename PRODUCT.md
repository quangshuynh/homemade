# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript + Vite, plain CSS with design tokens. Chosen by the project brief (Interval 1).

## Users

Players who want a calm, personal game they can open in a browser tab and spend a few unhurried minutes in. They play solo, often on a laptop or phone, with no account. They come back to *their* kitchen, which is named by them.

## Product Purpose

A cozy baking game about discovering recipes by experimenting with ingredients, collecting what you make, keeping a recipe book, and making a kitchen your own. Success is a player who feels the kitchen is theirs and wants to come back to see what else they can make.

## Positioning

Not an idle or clicker game: nothing accumulates while you're away, and there are no numbers to grind. Progress is what you've discovered and made. The interface is the kitchen itself (counter, recipe box, jars, index cards), not a dashboard around a game.

## Constraints

- Works without an account; saves stay in the browser (IndexedDB).
- A save is never discarded without the player's explicit say-so.
- No fake content: an unfinished area says it's unfinished.
- Accessible from the start: keyboard, screen readers, contrast, reduced motion.
- Keep dependencies minimal.

## Gameplay rules to preserve

These are decisions later work builds on. Change them on purpose, not by accident.

- **Selection is presence, not quantity.** An ingredient is in the bowl or it isn't. The bowl holds at most 5, needs at least 2 to mix, and can't hold the same ingredient twice.
- **Order never matters.** Selections are normalized (unique ids, sorted) before matching.
- **A recipe is an exact ingredient set.** No two recipes share a set; tests enforce this. Extra or missing ingredients mean it's not that recipe.
- **Every bake produces something.** Unmatched sets become a *Kitchen Experiment*. Its description is deterministic for a given set. Experiments are never saved as recipes and never appear in the Recipe Book.
- **Discovery happens once.** The first bake of a recipe records `{ recipeId, discoveredAt }`, and rebakes change nothing in the save.
- **Undiscovered recipes stay secret.** The Recipe Book shows a blank card for each, with no name, ingredients or hints. The total count is shown.
- **Catalogs are static; saves store ids.** Ingredient and recipe ids are permanent once shipped. Saves never copy catalog data. A save that references an id the catalog no longer has stays loadable.
- **No economy.** No currency, prices, scores, XP, timers or rarity. The pantry starts full.

## Voice

Warm, plain, a little playful, never cutesy. Short sentences, written like a note left on the counter. Controls say what they do ("Open the kitchen", "Keep my kitchen"). Errors say what happened and what's safe.

## Open decisions

- Whether names can be changed after setup.
- Whether and how ingredients are ever gained (currently everyone has all of them).
- Whether individual bakes are kept (a collection), which would change the save schema.
- Audio direction (the sound setting is stored but nothing plays yet).
