import type { CreationId, IngredientId, RecipeId } from './ids'
import {
  COCOA,
  COCONUT,
  CHOCOLATE_CHIPS,
  CINNAMON,
  findIngredient,
  FLOUR,
  HONEY,
  listIngredientNames,
  OATS,
  PEANUT_BUTTER,
  SUGAR,
  VANILLA,
} from './ingredients'
import { addCreation, makeCreation } from './creations'
import { findRecipeById, RECIPES } from './recipes'
import type { CookieCreation, CookieLook, GameSave, Recipe } from './types'

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

/** What an experiment made of these ingredients says about itself. The same set always reads the same. */
export function describeExperiment(ids: readonly IngredientId[]): string {
  const made = `Made with ${listIngredientNames(ids)}.`
  if (!ids.includes(FLOUR)) return `${made} Without flour it never quite held together, but the kitchen smells lovely.`
  if (!ids.includes(SUGAR)) return `${made} Not sweet at all. Somewhere between a cookie and a cracker.`
  return `${made} ${EXPERIMENT_ENDINGS[keyHash(ingredientKey(ids)) % EXPERIMENT_ENDINGS.length]}`
}

/** How an experiment made of these ingredients looks. Always the wobbly shape, so it never passes for a recipe. */
export function experimentLook(ids: readonly IngredientId[]): CookieLook {
  const dough: CookieLook['dough'] = ids.includes(COCOA)
    ? 'cocoa'
    : ids.includes(CINNAMON)
      ? 'spiced'
      : ids.includes(PEANUT_BUTTER)
        ? 'nutty'
        : ids.includes(FLOUR) || ids.includes(OATS) || ids.includes(HONEY)
          ? 'golden'
          : 'pale'
  const topping: CookieLook['topping'] = ids.includes(CHOCOLATE_CHIPS)
    ? 'chips'
    : ids.includes(VANILLA)
      ? 'vanilla-flecks'
      : ids.includes(OATS)
        ? 'oats'
        : ids.includes(COCONUT)
          ? 'coconut'
          : 'none'
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
  /** The batch as it is remembered in the save. */
  creation: CookieCreation
}

/**
 * Applies a bake to the save in one step: remembers the batch (every bake,
 * recipes and experiments alike) and records a first-time recipe discovery.
 * Returns the whole next save, so the caller writes it once and a bake can
 * never be half-saved.
 */
export function recordBake(
  save: GameSave,
  result: BakeResult,
  now: Date,
  creationId: CreationId,
): { save: GameSave; outcome: BakeOutcome } {
  const creation = makeCreation(result, now, creationId)
  const newDiscovery = result.kind === 'recipe' && !isDiscovered(save, result.recipe.id)
  return {
    save: {
      ...save,
      bakedCreations: addCreation(save.bakedCreations, creation),
      discoveredRecipes: newDiscovery
        ? [...save.discoveredRecipes, { recipeId: result.recipe.id, discoveredAt: now.toISOString() }]
        : save.discoveredRecipes,
    },
    outcome: { result, newDiscovery, creation },
  }
}

/** A bowl laid out by "Bake again": ingredients in, nothing mixed or baked. */
export type PreparedBake = { recipeId: RecipeId; bowl: Bowl }

/**
 * Lays out a discovered recipe's ingredients for baking it again. Returns
 * null for a recipe the player hasn't discovered, so an undiscovered recipe
 * can never be prepared (or given away). Only what's on the shelf goes in.
 */
export function prepareBowl(save: GameSave, recipeId: RecipeId): Bowl | null {
  const recipe = findRecipeById(recipeId)
  if (!recipe || !isDiscovered(save, recipeId)) return null
  return recipe.ingredientIds.reduce<Bowl>((bowl, id) => addToBowl(bowl, id, save.pantryIngredientIds).bowl, [])
}

/** A remembered bake joined with what the catalogs say about it, ready to show. */
export type CreationView =
  | { kind: 'recipe'; creation: CookieCreation; recipe: Recipe; name: string; look: CookieLook }
  | { kind: 'experiment'; creation: CookieCreation; name: string; description: string; look: CookieLook }

/**
 * A recipe id the catalog no longer has is shown as an experiment rather
 * than invented: the save stays readable, and nothing is made up.
 */
export function viewCreation(creation: CookieCreation): CreationView {
  const recipe = creation.recipeId ? findRecipeById(creation.recipeId) : undefined
  if (recipe) return { kind: 'recipe', creation, recipe, name: recipe.name, look: recipe.look }
  const ids = creation.ingredientIds
  return { kind: 'experiment', creation, name: EXPERIMENT_NAME, description: describeExperiment(ids), look: experimentLook(ids) }
}
