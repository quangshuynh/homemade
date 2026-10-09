import { BOWL_CAPACITY, ingredientKey, MIN_TO_MIX } from './baking'
import type { IngredientId } from './ids'
import { INGREDIENTS, STARTER_PANTRY } from './ingredients'
import { INGREDIENT_UNLOCKS, MAX_LEVEL, RARITIES, RARITY_REWARDS, type IngredientUnlock } from './progression'
import { RECIPE_FAMILIES } from './recipeBook'
import { RECIPES } from './recipes'
import type { CookieRarity, Ingredient, Recipe } from './types'

/**
 * Checks the hand-written catalogs against the rules everything else
 * assumes. Returns every problem found, in words, so a test can fail with
 * the whole list rather than the first surprise. Pure, and parameterised so
 * the checks themselves can be tested against broken catalogs.
 */
export type Catalog = {
  ingredients: readonly Ingredient[]
  recipes: readonly Recipe[]
  starter: readonly IngredientId[]
  unlocks: readonly IngredientUnlock[]
}

export const GAME_CATALOG: Catalog = {
  ingredients: INGREDIENTS,
  recipes: RECIPES,
  starter: STARTER_PANTRY,
  unlocks: INGREDIENT_UNLOCKS,
}

/** Secrets are always a real find: never Common or Uncommon. */
const SECRET_RARITIES: readonly CookieRarity[] = ['rare', 'epic', 'legendary', 'mythic']

/** Every pantry addition has to be worth adding: it's in at least this many recipes, secrets aside. */
export const MIN_RECIPES_PER_ADDITION = 2

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const value of values) (seen.has(value) ? repeated : seen).add(value)
  return [...repeated]
}

/** Words a clue must never use: every word of four letters or more in any ingredient's name. */
function ingredientWords(ingredients: readonly Ingredient[]): string[] {
  return [...new Set(ingredients.flatMap((ingredient) => ingredient.name.toLowerCase().split(/\s+/)))]
    .map((word) => word.replace(/[^a-z]/g, ''))
    .filter((word) => word.length >= 4)
}

export function findCatalogProblems(catalog: Catalog = GAME_CATALOG): string[] {
  const { ingredients, recipes, starter, unlocks } = catalog
  const problems: string[] = []
  const ingredientIds = new Set(ingredients.map((ingredient) => ingredient.id))
  const familyIds = new Set(RECIPE_FAMILIES.map((family) => family.id))
  const forbidden = ingredientWords(ingredients)

  for (const id of duplicates(ingredients.map((ingredient) => ingredient.id))) problems.push(`ingredient id ${id} is used twice`)
  for (const id of duplicates(recipes.map((recipe) => recipe.id))) problems.push(`recipe id ${id} is used twice`)
  for (const name of duplicates(recipes.map((recipe) => recipe.name))) problems.push(`recipe name "${name}" is used twice`)

  const bySet = new Map<string, string>()
  for (const recipe of recipes) {
    const label = `${recipe.name} (${recipe.id})`
    const key = ingredientKey(recipe.ingredientIds)
    const clash = bySet.get(key)
    if (clash) problems.push(`${label} has the same ingredients as ${clash}`)
    else bySet.set(key, label)

    if (new Set(recipe.ingredientIds).size !== recipe.ingredientIds.length) problems.push(`${label} lists an ingredient twice`)
    const count = new Set(recipe.ingredientIds).size
    if (count < MIN_TO_MIX || count > BOWL_CAPACITY) {
      problems.push(`${label} needs ${count} ingredients; a bowl holds ${MIN_TO_MIX}–${BOWL_CAPACITY}`)
    }
    for (const id of recipe.ingredientIds) if (!ingredientIds.has(id)) problems.push(`${label} uses unknown ingredient ${id}`)

    if (!RARITIES.includes(recipe.rarity)) problems.push(`${label} has unknown rarity "${String(recipe.rarity)}"`)
    else if (!RARITY_REWARDS[recipe.rarity]) problems.push(`${label} has no reward for rarity ${recipe.rarity}`)
    if (!familyIds.has(recipe.family)) problems.push(`${label} has unknown family "${String(recipe.family)}"`)

    if (recipe.isSecret) {
      if (recipe.clue !== null) problems.push(`${label} is secret but has a clue`)
      if (!SECRET_RARITIES.includes(recipe.rarity)) problems.push(`${label} is secret but only ${recipe.rarity}`)
    } else if (!recipe.clue?.trim()) {
      problems.push(`${label} has no clue for its blank card`)
    }
    if (recipe.clue) {
      const words: readonly string[] = recipe.clue.toLowerCase().match(/[a-z]+/g) ?? []
      for (const word of forbidden) if (words.includes(word)) problems.push(`${label}'s clue names an ingredient ("${word}")`)
    }
  }

  for (const rarity of RARITIES) {
    const reward = RARITY_REWARDS[rarity]
    if (!reward || reward.crumbs <= 0 || reward.xp <= 0) problems.push(`rarity ${rarity} has no reward`)
  }

  for (const family of RECIPE_FAMILIES) {
    if (!recipes.some((recipe) => recipe.family === family.id && !recipe.isSecret)) {
      problems.push(`family ${family.id} has no visible recipes, so its divider would only ever hold secrets`)
    }
  }

  // The pantry: every ingredient arrives exactly one way, at a level that exists.
  for (const id of duplicates(unlocks.map((unlock) => unlock.ingredientId))) problems.push(`${id} can be added twice`)
  for (const ingredient of ingredients) {
    const isStarter = starter.includes(ingredient.id)
    const unlock = unlocks.find((entry) => entry.ingredientId === ingredient.id)
    if (isStarter === Boolean(unlock)) problems.push(`${ingredient.id} must be a starter or a pantry addition, not ${isStarter ? 'both' : 'neither'}`)
    if (!recipes.some((recipe) => recipe.ingredientIds.includes(ingredient.id))) problems.push(`${ingredient.id} is in no recipe`)
  }
  for (const unlock of unlocks) {
    if (!ingredientIds.has(unlock.ingredientId)) problems.push(`pantry addition ${unlock.ingredientId} is not an ingredient`)
    if (!Number.isInteger(unlock.level) || unlock.level < 2 || unlock.level > MAX_LEVEL) {
      problems.push(`${unlock.ingredientId} opens at level ${unlock.level}, outside 2–${MAX_LEVEL}`)
    }
    if (!Number.isInteger(unlock.crumbs) || unlock.crumbs <= 0) problems.push(`${unlock.ingredientId} costs ${unlock.crumbs} Crumbs`)
    const uses = recipes.filter((recipe) => recipe.ingredientIds.includes(unlock.ingredientId))
    if (uses.length < MIN_RECIPES_PER_ADDITION) problems.push(`${unlock.ingredientId} is in only ${uses.length} recipe(s)`)
    // Counting secrets wouldn't do: a jar whose only other use is hidden feels like it's for one card.
    const visibleUses = uses.filter((recipe) => !recipe.isSecret).length
    if (visibleUses < MIN_RECIPES_PER_ADDITION) problems.push(`${unlock.ingredientId} is in only ${visibleUses} recipe(s) that aren't secret`)
  }
  for (const id of starter) if (!ingredientIds.has(id)) problems.push(`starter ingredient ${id} is not an ingredient`)

  return problems
}
