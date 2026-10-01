import type { RecipeId } from './ids'
import { RECIPES } from './recipes'
import type { GameSave, Recipe, RecipeFamily } from './types'

/**
 * What the Recipe Book is allowed to show, worked out from the save and the
 * catalog alone (nothing here is stored). The rules it keeps:
 *
 * - A secret recipe the player hasn't baked doesn't exist as far as the
 *   book is concerned: no card, no slot, no count, no family, no clue.
 * - The main count is "found of visible". Secrets found are counted
 *   separately, so the total never hints at how many secrets there are.
 * - Families group cards by theme. They never affect matching or rewards.
 */

export type FamilyInfo = { id: RecipeFamily; name: string }

/** In the order the dividers sit in the recipe box. */
export const RECIPE_FAMILIES: readonly FamilyInfo[] = [
  { id: 'classics', name: 'Classics' },
  { id: 'chocolate', name: 'Chocolate' },
  { id: 'warm-spiced', name: 'Warm & Spiced' },
  { id: 'nutty', name: 'Nutty' },
  { id: 'fruity', name: 'Fruity' },
  { id: 'sweet-sticky', name: 'Sweet & Sticky' },
  { id: 'curious', name: 'Strange & Wonderful' },
]

const familyNames = new Map(RECIPE_FAMILIES.map((family) => [family.id, family.name]))

export function familyName(id: RecipeFamily): string {
  return familyNames.get(id) ?? id
}

/** Recipes the book admits exist before they're found: every one that isn't secret. */
export const VISIBLE_RECIPES: readonly Recipe[] = RECIPES.filter((recipe) => !recipe.isSecret)

function discoveryDates(save: GameSave): Map<RecipeId, string> {
  return new Map(save.discoveredRecipes.map((entry) => [entry.recipeId, entry.discoveredAt]))
}

export type BookCounts = {
  /** Non-secret recipes found. */
  found: number
  /** Non-secret recipes in the catalog. Secrets never add to this. */
  total: number
  /** Secret recipes found. Zero until the first is baked. */
  secretsFound: number
}

export function bookCounts(save: GameSave, recipes: readonly Recipe[] = RECIPES): BookCounts {
  const dates = discoveryDates(save)
  const visible = recipes.filter((recipe) => !recipe.isSecret)
  return {
    found: visible.filter((recipe) => dates.has(recipe.id)).length,
    total: visible.length,
    secretsFound: recipes.filter((recipe) => recipe.isSecret && dates.has(recipe.id)).length,
  }
}

export type BookEntry =
  | { kind: 'found'; recipe: Recipe; discoveredAt: string }
  /** An undiscovered, non-secret recipe: shown only as a blank card with its clues. */
  | { kind: 'blank'; recipe: Recipe; clue: RecipeClue }

export type FamilySection = {
  family: FamilyInfo
  /** In catalog order. Never contains an undiscovered secret. */
  entries: BookEntry[]
  /** Non-secret recipes found in this family. */
  found: number
  /** Non-secret recipes in this family. */
  total: number
  secretsFound: number
  /** Every non-secret recipe in the family is found. Secrets don't count towards it. */
  complete: boolean
}

/**
 * The book, one section per family that has anything to show. A family
 * whose only recipes are undiscovered secrets has no section at all, so not
 * even a divider gives one away.
 */
export function bookSections(save: GameSave, recipes: readonly Recipe[] = RECIPES): FamilySection[] {
  const dates = discoveryDates(save)
  return RECIPE_FAMILIES.map((family): FamilySection => {
    const entries: BookEntry[] = []
    for (const recipe of recipes) {
      if (recipe.family !== family.id) continue
      const discoveredAt = dates.get(recipe.id)
      if (discoveredAt) entries.push({ kind: 'found', recipe, discoveredAt })
      else if (!recipe.isSecret) entries.push({ kind: 'blank', recipe, clue: recipeClue(save, recipe)! })
    }
    const visible = recipes.filter((recipe) => recipe.family === family.id && !recipe.isSecret)
    const found = visible.filter((recipe) => dates.has(recipe.id)).length
    return {
      family,
      entries,
      found,
      total: visible.length,
      secretsFound: entries.filter((entry) => entry.kind === 'found' && entry.recipe.isSecret).length,
      complete: visible.length > 0 && found === visible.length,
    }
  }).filter((section) => section.entries.length > 0)
}

export type RecipeClue = {
  /** Always shown: the one hint every blank card has had since Interval 2. */
  ingredientCount: number
  /**
   * Marmalade's scribble, shown once everything the recipe needs is on the
   * player's shelf, so the hint arrives when it can actually help. Never
   * names an ingredient.
   */
  note: string | null
}

/**
 * The clues for an undiscovered card, or null for any secret, which never
 * gets one. The family is a clue too, given by which divider the card sits
 * behind. Clues are free, deterministic and never bought.
 */
export function recipeClue(save: GameSave, recipe: Recipe): RecipeClue | null {
  if (recipe.isSecret) return null
  const onShelf = recipe.ingredientIds.every((id) => save.pantryIngredientIds.includes(id))
  return { ingredientCount: recipe.ingredientIds.length, note: onShelf ? recipe.clue : null }
}

/** Families whose every non-secret recipe has been found. */
export function completedFamilies(save: GameSave, recipes: readonly Recipe[] = RECIPES): RecipeFamily[] {
  const dates = discoveryDates(save)
  return RECIPE_FAMILIES.filter((family) => {
    const visible = recipes.filter((recipe) => recipe.family === family.id && !recipe.isSecret)
    return visible.length > 0 && visible.every((recipe) => dates.has(recipe.id))
  }).map((family) => family.id)
}
