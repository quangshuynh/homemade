import type { IngredientId, RecipeId } from './ids'
import { COCOA, CHOCOLATE_CHIPS, CINNAMON, findIngredient, FLOUR, listIngredientNames, SUGAR, VANILLA } from './ingredients'
import { RECIPES } from './recipes'
import type { CookieLook, GameSave, Recipe } from './types'

/**
 * Baking rules. Pure functions only: the Bake screen holds the bowl in its
 * own state and calls these to change it, match it and bake it.
 *
 * Selection semantics (Interval 2):
 * - An ingredient is either in the bowl or not. There are no quantities.
 * - The bowl holds at most BOWL_CAPACITY different ingredients.
 * - Adding something already in the bowl changes nothing.
 * - The order things went in never changes the result.
 * - A recipe matches only when the bowl holds exactly its ingredients.
 */

export const BOWL_CAPACITY = 5
export const MIN_TO_MIX = 2

/** Ingredients in the order they were added; never contains duplicates. */
export type Bowl = readonly IngredientId[]

export type BowlChange =
  | { outcome: 'added' | 'removed'; bowl: Bowl }
  | { outcome: 'already-in-bowl' | 'bowl-full' | 'not-in-pantry' | 'not-in-bowl'; bowl: Bowl }

export function addToBowl(bowl: Bowl, id: IngredientId, pantry: readonly IngredientId[]): BowlChange {
  if (bowl.includes(id)) return { outcome: 'already-in-bowl', bowl }
  if (!pantry.includes(id) || !findIngredient(id)) return { outcome: 'not-in-pantry', bowl }
  if (bowl.length >= BOWL_CAPACITY) return { outcome: 'bowl-full', bowl }
  return { outcome: 'added', bowl: [...bowl, id] }
}

export function removeFromBowl(bowl: Bowl, id: IngredientId): BowlChange {
  if (!bowl.includes(id)) return { outcome: 'not-in-bowl', bowl }
  return { outcome: 'removed', bowl: bowl.filter((item) => item !== id) }
}

export function canMix(bowl: Bowl): boolean {
  const count = normalizeIngredients(bowl).length
  return count >= MIN_TO_MIX && count <= BOWL_CAPACITY
}

/** The canonical form of a selection: unique ids in a fixed (sorted) order. */
export function normalizeIngredients(ids: readonly IngredientId[]): IngredientId[] {
  return [...new Set(ids)].sort()
}

/** A string that is identical for any two selections containing the same ingredients. */
export function ingredientKey(ids: readonly IngredientId[]): string {
  return normalizeIngredients(ids).join('+')
}

/** The recipe whose ingredients are exactly this selection, if any. */
export function matchRecipe(ids: readonly IngredientId[], recipes: readonly Recipe[] = RECIPES): Recipe | null {
  const key = ingredientKey(ids)
  return recipes.find((recipe) => ingredientKey(recipe.ingredientIds) === key) ?? null
}

export type BakeResult =
  | { kind: 'recipe'; recipe: Recipe; ingredientIds: IngredientId[] }
  | { kind: 'experiment'; name: string; description: string; look: CookieLook; ingredientIds: IngredientId[] }

export const EXPERIMENT_NAME = 'Kitchen Experiment'

const EXPERIMENT_ENDINGS = [
  'It came out lopsided, and honestly rather good.',
  'Crumbly, curious, and gone in minutes.',
  'It spread across the whole tray. Delicious anyway.',
  'Nobody has written this one down. Maybe nobody should. Maybe you should.',
  'A little odd, a little wonderful.',
]

/** A small, stable number for a selection, so the same experiment always reads the same. */
function keyHash(key: string): number {
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

function describeExperiment(ids: IngredientId[]): string {
  const made = `Made with ${listIngredientNames(ids)}.`
  if (!ids.includes(FLOUR)) return `${made} Without flour it never quite held together, but the kitchen smells lovely.`
  if (!ids.includes(SUGAR)) return `${made} Not sweet at all. Somewhere between a cookie and a cracker.`
  return `${made} ${EXPERIMENT_ENDINGS[keyHash(ingredientKey(ids)) % EXPERIMENT_ENDINGS.length]}`
}

function experimentLook(ids: IngredientId[]): CookieLook {
  const dough = ids.includes(COCOA) ? 'cocoa' : ids.includes(CINNAMON) ? 'spiced' : ids.includes(FLOUR) ? 'golden' : 'pale'
  const topping = ids.includes(CHOCOLATE_CHIPS) ? 'chips' : ids.includes(VANILLA) ? 'vanilla-flecks' : 'none'
  return { dough, topping, shape: 'wobbly' }
}

/**
 * Bakes whatever is in the bowl. Always produces something: a known recipe,
 * or a playful experiment. Experiments never become recipes.
 */
export function bake(bowl: Bowl, recipes: readonly Recipe[] = RECIPES): BakeResult {
  if (!canMix(bowl)) throw new Error(`A bake needs ${MIN_TO_MIX}–${BOWL_CAPACITY} different ingredients.`)
  const ingredientIds = normalizeIngredients(bowl)
  const recipe = matchRecipe(ingredientIds, recipes)
  if (recipe) return { kind: 'recipe', recipe, ingredientIds }
  return {
    kind: 'experiment',
    name: EXPERIMENT_NAME,
    description: describeExperiment(ingredientIds),
    look: experimentLook(ingredientIds),
    ingredientIds,
  }
}

/** The dough colour once mixed. Hints at what's in the bowl, never at which recipe it is. */
export function mixedDoughTone(bowl: Bowl): CookieLook['dough'] {
  return experimentLook(normalizeIngredients(bowl)).dough
}

export function isDiscovered(save: GameSave, recipeId: RecipeId): boolean {
  return save.discoveredRecipes.some((entry) => entry.recipeId === recipeId)
}

export type BakeOutcome = {
  result: BakeResult
  /** True only the first time a recipe is ever baked in this kitchen. */
  newDiscovery: boolean
}

/** Applies a bake to the save: records a first-time recipe discovery, and nothing else. */
export function recordBake(save: GameSave, result: BakeResult, now: Date): { save: GameSave; outcome: BakeOutcome } {
  if (result.kind !== 'recipe' || isDiscovered(save, result.recipe.id)) {
    return { save, outcome: { result, newDiscovery: false } }
  }
  return {
    save: {
      ...save,
      discoveredRecipes: [...save.discoveredRecipes, { recipeId: result.recipe.id, discoveredAt: now.toISOString() }],
    },
    outcome: { result, newDiscovery: true },
  }
}
