import { describe, expect, it } from 'vitest'
import { makeSave } from '../test/fixtures'
import {
  addToBowl,
  bake,
  BOWL_CAPACITY,
  canMix,
  EXPERIMENT_NAME,
  ingredientKey,
  isDiscovered,
  matchRecipe,
  MIN_TO_MIX,
  normalizeIngredients,
  recordBake,
  removeFromBowl,
  type Bowl,
} from './baking'
import { defineId, type CreationId } from './ids'
import { BUTTER, CHOCOLATE_CHIPS, CINNAMON, COCOA, EGG, FLOUR, INGREDIENTS, STARTER_PANTRY, SUGAR, VANILLA } from './ingredients'
import { INGREDIENT_UNLOCKS } from './progression'
import { findRecipeById, RECIPES } from './recipes'

const NOW = new Date('2026-05-01T10:00:00.000Z')
const LATER = new Date('2026-05-02T10:00:00.000Z')
const CHOC_CHIP = [FLOUR, SUGAR, BUTTER, EGG, CHOCOLATE_CHIPS]

describe('ingredient catalog', () => {
  it('has unique, stable ids', () => {
    const ids = INGREDIENTS.map((ingredient) => ingredient.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('ingredient_flour')
  })

  it('gives every ingredient a name and description', () => {
    for (const ingredient of INGREDIENTS) {
      expect(ingredient.name.trim()).not.toBe('')
      expect(ingredient.description.trim()).not.toBe('')
    }
  })
})

describe('recipe catalog', () => {
  it('stays a small, curated catalog with unique ids', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(10)
    expect(RECIPES.length).toBeLessThanOrEqual(40)
    expect(new Set(RECIPES.map((recipe) => recipe.id)).size).toBe(RECIPES.length)
  })

  it('never has two recipes made of the same ingredients', () => {
    const keys = RECIPES.map((recipe) => ingredientKey(recipe.ingredientIds))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('only uses real ingredients, each once, within what a bowl can hold', () => {
    const known = new Set(INGREDIENTS.map((ingredient) => ingredient.id))
    for (const recipe of RECIPES) {
      expect(recipe.ingredientIds.every((id) => known.has(id))).toBe(true)
      expect(normalizeIngredients(recipe.ingredientIds)).toHaveLength(recipe.ingredientIds.length)
      expect(recipe.ingredientIds.length).toBeGreaterThanOrEqual(MIN_TO_MIX)
      expect(recipe.ingredientIds.length).toBeLessThanOrEqual(BOWL_CAPACITY)
    }
  })

  it('can make every recipe from ingredients a kitchen can have: the starter pantry or a pantry addition', () => {
    const obtainable = new Set([...STARTER_PANTRY, ...INGREDIENT_UNLOCKS.map((unlock) => unlock.ingredientId)])
    for (const recipe of RECIPES) {
      expect(recipe.ingredientIds.every((id) => obtainable.has(id)), recipe.name).toBe(true)
    }
  })
})

const ALL_INGREDIENTS = INGREDIENTS.map((ingredient) => ingredient.id)

describe('the bowl', () => {
  it('adds ingredients in the order they go in', () => {
    let bowl: Bowl = []
    bowl = addToBowl(bowl, SUGAR, STARTER_PANTRY).bowl
    bowl = addToBowl(bowl, FLOUR, STARTER_PANTRY).bowl
    expect(bowl).toEqual([SUGAR, FLOUR])
  })

  it('never holds the same ingredient twice', () => {
    const change = addToBowl([FLOUR], FLOUR, STARTER_PANTRY)
    expect(change.outcome).toBe('already-in-bowl')
    expect(change.bowl).toEqual([FLOUR])
  })

  it(`holds at most ${BOWL_CAPACITY} ingredients`, () => {
    const full: Bowl = [FLOUR, SUGAR, BUTTER, EGG, VANILLA]
    const change = addToBowl(full, COCOA, ALL_INGREDIENTS)
    expect(change.outcome).toBe('bowl-full')
    expect(change.bowl).toBe(full)
  })

  it('refuses ingredients that are not in the pantry', () => {
    expect(addToBowl([], COCOA, [FLOUR, SUGAR]).outcome).toBe('not-in-pantry')
    expect(addToBowl([], defineId('ingredient', 'saffron'), [defineId('ingredient', 'saffron')]).outcome).toBe('not-in-pantry')
  })

  it('takes ingredients back out', () => {
    expect(removeFromBowl([FLOUR, SUGAR], FLOUR)).toEqual({ outcome: 'removed', bowl: [SUGAR] })
    expect(removeFromBowl([SUGAR], FLOUR).outcome).toBe('not-in-bowl')
  })

  it(`needs at least ${MIN_TO_MIX} ingredients to mix`, () => {
    expect(canMix([])).toBe(false)
    expect(canMix([FLOUR])).toBe(false)
    expect(canMix([FLOUR, SUGAR])).toBe(true)
  })
})

describe('normalizing and matching', () => {
  it('gives the same key whatever order the ingredients went in', () => {
    expect(ingredientKey([CHOCOLATE_CHIPS, FLOUR, SUGAR])).toBe(ingredientKey([SUGAR, CHOCOLATE_CHIPS, FLOUR]))
    expect(normalizeIngredients([CHOCOLATE_CHIPS, FLOUR, SUGAR])).toEqual(normalizeIngredients([FLOUR, SUGAR, CHOCOLATE_CHIPS]))
  })

  it('collapses duplicates', () => {
    expect(normalizeIngredients([FLOUR, SUGAR, FLOUR, SUGAR])).toEqual(normalizeIngredients([SUGAR, FLOUR]))
  })

  it('matches every recipe from its ingredients in any order', () => {
    for (const recipe of RECIPES) {
      expect(matchRecipe([...recipe.ingredientIds].reverse())).toBe(recipe)
    }
  })

  it('only matches an exact set: extra or missing ingredients are not the recipe', () => {
    expect(matchRecipe([FLOUR, SUGAR, BUTTER])?.name).toBe('Shortbread')
    expect(matchRecipe([FLOUR, SUGAR])).toBeNull()
    expect(matchRecipe([FLOUR, SUGAR, BUTTER, CINNAMON, VANILLA])).toBeNull()
  })
})

describe('baking', () => {
  it('bakes a known recipe', () => {
    const result = bake([CHOCOLATE_CHIPS, EGG, BUTTER, SUGAR, FLOUR])
    expect(result.kind).toBe('recipe')
    if (result.kind === 'recipe') expect(result.recipe.name).toBe('Chocolate Chip Cookie')
  })

  it('bakes an experiment when nothing matches, and it is always the same experiment', () => {
    const first = bake([EGG, CINNAMON])
    const again = bake([CINNAMON, EGG])

    expect(first.kind).toBe('experiment')
    expect(first).toEqual(again)
    if (first.kind === 'experiment') {
      expect(first.name).toBe(EXPERIMENT_NAME)
      expect(first.description).toMatch(/cinnamon and egg/)
      expect(first.look.shape).toBe('wobbly')
    }
  })

  it('never turns an experiment into a recipe', () => {
    const recipesBefore = RECIPES.length
    bake([COCOA, VANILLA, CINNAMON])
    expect(RECIPES).toHaveLength(recipesBefore)
  })

  it('refuses a bowl that cannot be mixed', () => {
    expect(() => bake([FLOUR])).toThrow()
  })
})

let idCounter = 0
const nextId = () => `creation_test-${++idCounter}` as CreationId

describe('discovery', () => {
  it('records a recipe the first time it is baked', () => {
    const save = makeSave()
    const { save: next, outcome } = recordBake(save, bake(CHOC_CHIP), NOW, nextId())

    expect(outcome.newDiscovery).toBe(true)
    expect(next.discoveredRecipes).toEqual([{ recipeId: 'recipe_chocolate-chip', discoveredAt: NOW.toISOString() }])
    expect(isDiscovered(next, defineId('recipe', 'chocolate-chip'))).toBe(true)
    expect(save.discoveredRecipes).toEqual([])
  })

  it('only discovers a recipe once, keeping the first date', () => {
    const once = recordBake(makeSave(), bake(CHOC_CHIP), NOW, nextId()).save
    const { save: twice, outcome } = recordBake(once, bake([...CHOC_CHIP].reverse()), LATER, nextId())

    expect(outcome.newDiscovery).toBe(false)
    expect(twice.discoveredRecipes).toBe(once.discoveredRecipes)
    expect(twice.discoveredRecipes).toHaveLength(1)
    expect(twice.discoveredRecipes[0]?.discoveredAt).toBe(NOW.toISOString())
  })

  it('does not record experiments as discoveries', () => {
    const save = makeSave()
    const { save: next, outcome } = recordBake(save, bake([EGG, CINNAMON]), NOW, nextId())
    expect(outcome.newDiscovery).toBe(false)
    expect(next.discoveredRecipes).toBe(save.discoveredRecipes)
  })

  it('keeps discoveries in the order they were found', () => {
    let save = makeSave()
    save = recordBake(save, bake([FLOUR, SUGAR, BUTTER]), NOW, nextId()).save
    save = recordBake(save, bake(CHOC_CHIP), LATER, nextId()).save
    expect(save.discoveredRecipes.map((entry) => findRecipeById(entry.recipeId)?.name)).toEqual([
      'Shortbread',
      'Chocolate Chip Cookie',
    ])
  })
})
