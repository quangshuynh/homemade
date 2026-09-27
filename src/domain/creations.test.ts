import { describe, expect, it } from 'vitest'
import { makeSave } from '../test/fixtures'
import { bake, EXPERIMENT_NAME, ingredientKey, isDiscovered, matchRecipe, prepareBowl, recordBake, viewCreation } from './baking'
import { addCreation, MAX_BAKED_CREATIONS, newCreationId, recentCreations } from './creations'
import { defineId, isIdOf, type CreationId, type IngredientId } from './ids'
import {
  BUTTER,
  CHOCOLATE_CHIPS,
  CINNAMON,
  COCONUT,
  EGG,
  FLOUR,
  HONEY,
  INGREDIENTS,
  OATS,
  PEANUT_BUTTER,
  SUGAR,
  VANILLA,
} from './ingredients'
import { RECIPES } from './recipes'
import type { CookieCreation, GameSave } from './types'

const SHORTBREAD = [FLOUR, SUGAR, BUTTER]
const EXPERIMENT = [EGG, CINNAMON]
const START = Date.parse('2026-05-01T10:00:00.000Z')

let counter = 0
const nextId = () => `creation_test-${++counter}` as CreationId
const minute = (n: number) => new Date(START + n * 60_000)

/** Bakes each bowl in turn, a minute apart, as the game would. */
function bakeAll(save: GameSave, bowls: IngredientId[][], startMinute = 0): GameSave {
  return bowls.reduce((current, bowl, index) => recordBake(current, bake(bowl), minute(startMinute + index), nextId()).save, save)
}

describe('every bake is remembered', () => {
  it('creates exactly one creation for a newly discovered recipe, alongside the discovery', () => {
    const { save, outcome } = recordBake(makeSave(), bake(SHORTBREAD), minute(0), 'creation_a' as CreationId)

    expect(outcome.newDiscovery).toBe(true)
    expect(save.discoveredRecipes).toHaveLength(1)
    expect(save.bakedCreations).toEqual([
      {
        id: 'creation_a',
        recipeId: 'recipe_shortbread',
        ingredientIds: ['ingredient_butter', 'ingredient_flour', 'ingredient_sugar'],
        bakedAt: minute(0).toISOString(),
      },
    ])
    expect(outcome.creation).toBe(save.bakedCreations[0])
  })

  it('creates another creation for a rebake, but no second discovery', () => {
    const once = recordBake(makeSave(), bake(SHORTBREAD), minute(0), nextId()).save
    const { save: twice, outcome } = recordBake(once, bake([...SHORTBREAD].reverse()), minute(1), nextId())

    expect(outcome.newDiscovery).toBe(false)
    expect(twice.discoveredRecipes).toEqual(once.discoveredRecipes)
    expect(twice.bakedCreations).toHaveLength(2)
    expect(twice.bakedCreations.map((creation) => creation.recipeId)).toEqual(['recipe_shortbread', 'recipe_shortbread'])
  })

  it('remembers experiments without making them recipes or discoveries', () => {
    const { save } = recordBake(makeSave(), bake(EXPERIMENT), minute(0), nextId())

    expect(save.bakedCreations).toHaveLength(1)
    expect(save.bakedCreations[0]?.recipeId).toBeNull()
    expect(save.discoveredRecipes).toEqual([])
    expect(RECIPES.some((recipe) => ingredientKey(recipe.ingredientIds) === ingredientKey(EXPERIMENT))).toBe(false)
  })

  it('keeps the same experiment baked twice as two separate records', () => {
    const save = bakeAll(makeSave(), [EXPERIMENT, [...EXPERIMENT].reverse()])
    const [first, second] = save.bakedCreations

    expect(save.bakedCreations).toHaveLength(2)
    expect(first?.id).not.toBe(second?.id)
    expect(first?.ingredientIds).toEqual(second?.ingredientIds)
  })

  it('stores only ids and a time, never catalog text or art', () => {
    const { save } = recordBake(makeSave(), bake(SHORTBREAD), minute(0), nextId())
    expect(Object.keys(save.bakedCreations[0]!).sort()).toEqual(['bakedAt', 'id', 'ingredientIds', 'recipeId'])
    expect(JSON.stringify(save.bakedCreations)).not.toMatch(/Shortbread|buttery|pale|square/)
  })

  it('does not change the save it was given', () => {
    const save = makeSave()
    const snapshot = structuredClone(save)
    recordBake(save, bake(SHORTBREAD), minute(0), nextId())
    expect(save).toEqual(snapshot)
  })
})

describe('creation ids', () => {
  it('are prefixed, random and never reused', () => {
    const ids = Array.from({ length: 200 }, newCreationId)
    expect(ids.every((id) => isIdOf('creation', id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('history order', () => {
  it('lists recent bakes newest first', () => {
    const save = bakeAll(makeSave(), [SHORTBREAD, EXPERIMENT, [FLOUR, SUGAR, BUTTER, EGG]])
    expect(recentCreations(save).map((creation) => viewCreation(creation).name)).toEqual([
      'Sugar Cookie',
      EXPERIMENT_NAME,
      'Shortbread',
    ])
    expect(recentCreations(save, 2)).toHaveLength(2)
  })

  it('follows the order things were baked, even if the clock jumped backwards', () => {
    let save = recordBake(makeSave(), bake(SHORTBREAD), minute(10), 'creation_first' as CreationId).save
    save = recordBake(save, bake(EXPERIMENT), minute(0), 'creation_second' as CreationId).save

    expect(recentCreations(save).map((creation) => creation.id)).toEqual(['creation_second', 'creation_first'])
    expect(recentCreations(save)).toEqual(recentCreations(structuredClone(save)))
  })
})

describe(`history is capped at ${MAX_BAKED_CREATIONS}`, () => {
  const creation = (n: number): CookieCreation => ({
    id: `creation_${n}` as CreationId,
    ingredientIds: [...EXPERIMENT],
    recipeId: null,
    bakedAt: minute(n).toISOString(),
  })

  it('keeps everything up to the cap', () => {
    const history = Array.from({ length: MAX_BAKED_CREATIONS - 1 }, (_, n) => creation(n))
    expect(addCreation(history, creation(999))).toHaveLength(MAX_BAKED_CREATIONS)
  })

  it('drops the oldest first, keeping exactly the newest', () => {
    const history = Array.from({ length: MAX_BAKED_CREATIONS }, (_, n) => creation(n))
    const next = addCreation(history, creation(MAX_BAKED_CREATIONS))

    expect(next).toHaveLength(MAX_BAKED_CREATIONS)
    expect(next[0]?.id).toBe('creation_1')
    expect(next.at(-1)?.id).toBe(`creation_${MAX_BAKED_CREATIONS}`)
  })

  it('never touches discoveries when trimming, through real bakes past the cap', () => {
    // Discover two recipes first, so they are the oldest bakes of all.
    let save = bakeAll(makeSave(), [SHORTBREAD, [FLOUR, SUGAR, BUTTER, EGG]])
    const discoveries = save.discoveredRecipes
    const extra = 7
    save = bakeAll(save, Array.from({ length: MAX_BAKED_CREATIONS + extra }, () => EXPERIMENT), 100)

    expect(save.bakedCreations).toHaveLength(MAX_BAKED_CREATIONS)
    expect(save.bakedCreations.every((entry) => entry.recipeId === null)).toBe(true)
    expect(save.bakedCreations[0]?.bakedAt).toBe(minute(100 + extra).toISOString())
    expect(save.bakedCreations.at(-1)?.bakedAt).toBe(minute(100 + MAX_BAKED_CREATIONS + extra - 1).toISOString())
    expect(save.discoveredRecipes).toEqual(discoveries)
    expect(isDiscovered(save, defineId('recipe', 'shortbread'))).toBe(true)
  })
})

describe('viewing a remembered bake', () => {
  it('reads recipe details from the catalog', () => {
    const { outcome } = recordBake(makeSave(), bake(SHORTBREAD), minute(0), nextId())
    const view = viewCreation(outcome.creation)
    expect(view).toMatchObject({ kind: 'recipe', name: 'Shortbread', look: { shape: 'square' } })
  })

  it('shows an experiment with its usual, deterministic words and wobbly look', () => {
    const { outcome } = recordBake(makeSave(), bake(EXPERIMENT), minute(0), nextId())
    const view = viewCreation(outcome.creation)
    const fresh = bake(EXPERIMENT)

    expect(view.kind).toBe('experiment')
    if (view.kind === 'experiment' && fresh.kind === 'experiment') {
      expect(view.name).toBe(EXPERIMENT_NAME)
      expect(view.description).toBe(fresh.description)
      expect(view.look).toEqual(fresh.look)
    }
  })

  it('stays readable when a recipe or ingredient has left the catalog', () => {
    const view = viewCreation({
      id: 'creation_old' as CreationId,
      ingredientIds: [FLOUR, defineId('ingredient', 'saffron')],
      recipeId: defineId('recipe', 'retired-biscuit'),
      bakedAt: minute(0).toISOString(),
    })
    expect(view.kind).toBe('experiment')
    if (view.kind === 'experiment') expect(view.description).toMatch(/something old/)
  })
})

describe('Bake again', () => {
  const discovered = (ids: string[]) =>
    makeSave({ discoveredRecipes: ids.map((id) => ({ recipeId: defineId('recipe', id), discoveredAt: minute(0).toISOString() })) })

  it('lays out exactly the recipe’s ingredients', () => {
    const bowl = prepareBowl(discovered(['snickerdoodle']), defineId('recipe', 'snickerdoodle'))
    expect(bowl).not.toBeNull()
    expect(matchRecipe(bowl!)?.name).toBe('Snickerdoodle')
  })

  it('refuses a recipe that has not been discovered, or does not exist', () => {
    expect(prepareBowl(discovered([]), defineId('recipe', 'snickerdoodle'))).toBeNull()
    expect(prepareBowl(discovered(['nope']), defineId('recipe', 'nope'))).toBeNull()
  })

  it('only lays out what is on the shelf', () => {
    const save = { ...discovered(['shortbread']), pantryIngredientIds: [FLOUR, SUGAR] }
    expect(prepareBowl(save, defineId('recipe', 'shortbread'))).toEqual([FLOUR, SUGAR])
  })
})

describe('Interval 3 catalog additions', () => {
  it('adds oats, peanut butter, honey and coconut', () => {
    expect(INGREDIENTS.map((ingredient) => ingredient.id)).toEqual(
      expect.arrayContaining([OATS, PEANUT_BUTTER, HONEY, COCONUT]),
    )
    expect(INGREDIENTS).toHaveLength(12)
  })

  it.each([
    [[FLOUR, SUGAR, BUTTER, EGG, OATS], 'Oatmeal Cookie'],
    [[PEANUT_BUTTER, SUGAR, EGG], 'Peanut Butter Cookie'],
    [[PEANUT_BUTTER, SUGAR, EGG, CHOCOLATE_CHIPS], 'Peanut Butter Chocolate Chip'],
    [[OATS, BUTTER, HONEY], 'Honey Flapjack'],
    [[COCONUT, SUGAR, EGG], 'Coconut Macaroon'],
  ])('matches %j as %s, in any order', (ids, name) => {
    expect(matchRecipe(ids)?.name).toBe(name)
    expect(matchRecipe([...ids].reverse())?.name).toBe(name)
  })

  it('leaves near misses as experiments', () => {
    expect(bake([PEANUT_BUTTER, SUGAR]).kind).toBe('experiment')
    expect(bake([OATS, BUTTER, HONEY, VANILLA]).kind).toBe('experiment')
  })

  it('keeps recipe ids independent of names', () => {
    for (const recipe of RECIPES) expect(recipe.id).toMatch(/^recipe_[a-z0-9-]+$/)
    // Renaming a recipe must never change its id; spot-check one where they differ.
    expect(RECIPES.find((recipe) => recipe.name === 'Peanut Butter Chocolate Chip')?.id).toBe('recipe_peanut-butter-chocolate')
  })
})
