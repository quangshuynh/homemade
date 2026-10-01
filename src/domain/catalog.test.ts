import { describe, expect, it } from 'vitest'
import { findCatalogProblems, GAME_CATALOG, type Catalog } from './catalog'
import { defineId } from './ids'
import { BUTTER, EGG, FLOUR, INGREDIENTS, STARTER_PANTRY, SUGAR } from './ingredients'
import { INGREDIENT_UNLOCKS, RARITIES } from './progression'
import { RECIPE_FAMILIES, VISIBLE_RECIPES } from './recipeBook'
import { RECIPES } from './recipes'
import type { CookieRarity, Recipe, RecipeFamily } from './types'

const SHORTBREAD = RECIPES.find((recipe) => recipe.id === 'recipe_shortbread')!

/** The real catalog with one recipe swapped in or added, to prove each check actually fires. */
function withRecipe(recipe: Recipe, replace = false): Catalog {
  const recipes = replace ? RECIPES.map((existing) => (existing.id === recipe.id ? recipe : existing)) : [...RECIPES, recipe]
  return { ...GAME_CATALOG, recipes }
}

const extra = (overrides: Partial<Recipe>): Recipe => ({
  ...SHORTBREAD,
  id: defineId('recipe', 'test-extra'),
  name: 'Test Extra',
  ingredientIds: [FLOUR, EGG],
  ...overrides,
})

describe('the shipped catalog', () => {
  it('has no problems at all', () => {
    expect(findCatalogProblems()).toEqual([])
  })

  it('has 19 ingredients and 27 recipes, 3 of them secret', () => {
    expect(INGREDIENTS).toHaveLength(19)
    expect(RECIPES).toHaveLength(27)
    expect(RECIPES.filter((recipe) => recipe.isSecret)).toHaveLength(3)
    expect(VISIBLE_RECIPES).toHaveLength(24)
  })

  it('keeps rarity, family and secrecy independent of each other', () => {
    const secrets = RECIPES.filter((recipe) => recipe.isSecret)
    // Secrets span more than one rarity and more than one family, and no family is only secrets.
    expect(new Set(secrets.map((recipe) => recipe.rarity)).size).toBeGreaterThan(1)
    expect(new Set(secrets.map((recipe) => recipe.family)).size).toBe(secrets.length)
    // The Mythic is not a secret, and not every secret is Mythic.
    expect(RECIPES.filter((recipe) => recipe.rarity === 'mythic').every((recipe) => !recipe.isSecret)).toBe(true)
    for (const family of RECIPE_FAMILIES) expect(VISIBLE_RECIPES.some((recipe) => recipe.family === family.id), family.id).toBe(true)
  })

  it('has exactly one Mythic recipe', () => {
    expect(RECIPES.filter((recipe) => recipe.rarity === 'mythic').map((recipe) => recipe.name)).toEqual(['Millionaire’s Shortbread'])
  })

  it('keeps every starter recipe grounded and every secret out of the starter pantry', () => {
    for (const recipe of RECIPES.filter((entry) => entry.ingredientIds.every((id) => STARTER_PANTRY.includes(id)))) {
      expect(['common', 'uncommon'], recipe.name).toContain(recipe.rarity)
      expect(recipe.isSecret, recipe.name).toBe(false)
    }
  })

  it('keeps high rarities scarce: each tier is no bigger than the one below it', () => {
    const count = (rarity: CookieRarity) => RECIPES.filter((recipe) => recipe.rarity === rarity).length
    for (let index = 1; index < RARITIES.length; index++) {
      expect(count(RARITIES[index]!), RARITIES[index]).toBeLessThanOrEqual(count(RARITIES[index - 1]!))
    }
    expect(RARITIES.map(count)).toEqual([8, 7, 6, 3, 2, 1])
  })
})

describe('the catalog checks fail loudly on', () => {
  it('a duplicate recipe id', () => {
    const problems = findCatalogProblems(withRecipe({ ...extra({}), id: SHORTBREAD.id }))
    expect(problems).toContain('recipe id recipe_shortbread is used twice')
  })

  it('a duplicate ingredient id', () => {
    const problems = findCatalogProblems({ ...GAME_CATALOG, ingredients: [...INGREDIENTS, INGREDIENTS[0]!] })
    expect(problems).toContain('ingredient id ingredient_flour is used twice')
  })

  it('two recipes with the same set, in any order', () => {
    const problems = findCatalogProblems(withRecipe(extra({ ingredientIds: [BUTTER, SUGAR, FLOUR] })))
    expect(problems.some((problem) => problem.includes('has the same ingredients as Shortbread'))).toBe(true)
  })

  it('an unknown rarity, family or ingredient', () => {
    const problems = findCatalogProblems(
      withRecipe(
        extra({ rarity: 'shiny' as CookieRarity, family: 'savoury' as RecipeFamily, ingredientIds: [FLOUR, defineId('ingredient', 'saffron')] }),
      ),
    )
    expect(problems).toEqual(
      expect.arrayContaining([
        'Test Extra (recipe_test-extra) has unknown rarity "shiny"',
        'Test Extra (recipe_test-extra) has unknown family "savoury"',
        'Test Extra (recipe_test-extra) uses unknown ingredient ingredient_saffron',
      ]),
    )
  })

  it('too few or too many ingredients for the bowl', () => {
    const one = findCatalogProblems(withRecipe(extra({ ingredientIds: [FLOUR] })))
    expect(one).toContain('Test Extra (recipe_test-extra) needs 1 ingredients; a bowl holds 2–5')
    const six = findCatalogProblems(withRecipe(extra({ ingredientIds: INGREDIENTS.slice(0, 6).map((ingredient) => ingredient.id) })))
    expect(six).toContain('Test Extra (recipe_test-extra) needs 6 ingredients; a bowl holds 2–5')
  })

  it('a secret with a clue, a low-rarity secret, or a visible recipe with no clue', () => {
    expect(findCatalogProblems(withRecipe(extra({ isSecret: true, rarity: 'rare', clue: 'Psst.' })))).toContain(
      'Test Extra (recipe_test-extra) is secret but has a clue',
    )
    expect(findCatalogProblems(withRecipe(extra({ isSecret: true, rarity: 'common', clue: null })))).toContain(
      'Test Extra (recipe_test-extra) is secret but only common',
    )
    expect(findCatalogProblems(withRecipe(extra({ clue: null })))).toContain('Test Extra (recipe_test-extra) has no clue for its blank card')
  })

  it('a clue that names an ingredient', () => {
    const problems = findCatalogProblems(withRecipe({ ...SHORTBREAD, clue: 'Mostly butter, honestly.' }, true))
    expect(problems).toContain('Shortbread (recipe_shortbread)\'s clue names an ingredient ("butter")')
  })

  it('a pantry addition with too few recipes, or an ingredient that arrives two ways', () => {
    const lonely = { ...GAME_CATALOG, recipes: RECIPES.filter((recipe) => !recipe.ingredientIds.includes(INGREDIENT_UNLOCKS[0]!.ingredientId)) }
    expect(findCatalogProblems(lonely)).toContain('ingredient_chocolate-chips is in no recipe')
    const twice = { ...GAME_CATALOG, starter: [...STARTER_PANTRY, INGREDIENT_UNLOCKS[0]!.ingredientId] }
    expect(findCatalogProblems(twice)).toContain('ingredient_chocolate-chips must be a starter or a pantry addition, not both')
  })

  it('a family that would only ever hold secrets', () => {
    const recipes = RECIPES.map((recipe) => (recipe.family === 'fruity' ? { ...recipe, isSecret: true, clue: null, rarity: 'rare' as const } : recipe))
    expect(findCatalogProblems({ ...GAME_CATALOG, recipes })).toContain(
      'family fruity has no visible recipes, so its divider would only ever hold secrets',
    )
  })
})
