import type { IngredientId } from './ids'
import { INGREDIENTS } from './ingredients'
import { INGREDIENT_UNLOCKS, RARITIES, RARITY_REWARDS } from './progression'
import { RECIPE_FAMILIES } from './recipeBook'
import { RECIPES } from './recipes'
import type { CookieRarity, Recipe, RecipeFamily } from './types'

/**
 * Plain counts over the catalogs, for balancing by eye and for the tests
 * that keep the balance (catalog.test). Nothing in the game reads these.
 */

export type IngredientUsage = { id: IngredientId; name: string; recipes: number; visible: number }

/** How many recipes use each ingredient, fewest first (ties in catalog order). */
export function ingredientUsage(recipes: readonly Recipe[] = RECIPES): IngredientUsage[] {
  return INGREDIENTS.map((ingredient) => {
    const uses = recipes.filter((recipe) => recipe.ingredientIds.includes(ingredient.id))
    return { id: ingredient.id, name: ingredient.name, recipes: uses.length, visible: uses.filter((recipe) => !recipe.isSecret).length }
  }).sort((a, b) => a.recipes - b.recipes)
}

export type FamilyAudit = { id: RecipeFamily; visible: number; secret: number; rarities: Record<CookieRarity, number> }

export function familyAudit(recipes: readonly Recipe[] = RECIPES): FamilyAudit[] {
  return RECIPE_FAMILIES.map((family) => {
    const inFamily = recipes.filter((recipe) => recipe.family === family.id)
    const rarities = Object.fromEntries(RARITIES.map((rarity) => [rarity, inFamily.filter((recipe) => recipe.rarity === rarity).length]))
    return {
      id: family.id,
      visible: inFamily.filter((recipe) => !recipe.isSecret).length,
      secret: inFamily.filter((recipe) => recipe.isSecret).length,
      rarities: rarities as Record<CookieRarity, number>,
    }
  })
}

export function rarityCounts(recipes: readonly Recipe[] = RECIPES): Record<CookieRarity, number> {
  return Object.fromEntries(RARITIES.map((rarity) => [rarity, recipes.filter((recipe) => recipe.rarity === rarity).length])) as Record<
    CookieRarity,
    number
  >
}

/** What every first discovery that isn't secret pays in all, against what the whole pantry costs. */
export function economyTotals(recipes: readonly Recipe[] = RECIPES) {
  const visible = recipes.filter((recipe) => !recipe.isSecret)
  const sum = (key: 'crumbs' | 'xp') => visible.reduce((total, recipe) => total + RARITY_REWARDS[recipe.rarity][key], 0)
  return {
    visibleCrumbs: sum('crumbs'),
    visibleXp: sum('xp'),
    pantryCost: INGREDIENT_UNLOCKS.reduce((total, unlock) => total + unlock.crumbs, 0),
    pantryAdditions: INGREDIENT_UNLOCKS.length,
  }
}
