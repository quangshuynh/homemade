import { describe, expect, it } from 'vitest'
import { deserializeSave, serializeSave } from '../persistence/schema'
import { makeNewKitchen, makeSave } from '../test/fixtures'
import { bake, recordBake, type Bowl } from './baking'
import { defineId, type CreationId, type RecipeId } from './ids'
import {
  BUTTER,
  COCONUT,
  EGG,
  FLOUR,
  LEMON,
  PEANUT_BUTTER,
  STRAWBERRY_JAM,
  SUGAR,
  WHITE_CHOCOLATE,
} from './ingredients'
import { RARITY_REWARDS } from './progression'
import { bookCounts, bookSections, completedFamilies, familyName, recipeClue, RECIPE_FAMILIES, VISIBLE_RECIPES } from './recipeBook'
import { findRecipeById, RECIPES } from './recipes'
import type { GameSave } from './types'

const NOW = new Date('2026-10-01T09:00:00.000Z')
const SECRETS = RECIPES.filter((recipe) => recipe.isSecret)
const SNOWBALL = findRecipeById(defineId('recipe', 'snowball'))!
const PB_AND_JAM = findRecipeById(defineId('recipe', 'peanut-butter-jam'))!

function bakeInto(save: GameSave, bowl: Bowl, n = 1) {
  return recordBake(save, bake(bowl), NOW, `creation_${n}` as CreationId)
}

function withFound(save: GameSave, ids: readonly RecipeId[]): GameSave {
  return { ...save, discoveredRecipes: ids.map((recipeId) => ({ recipeId, discoveredAt: NOW.toISOString() })) }
}

const allEntries = (save: GameSave) => bookSections(save).flatMap((section) => section.entries)

describe('secret recipes', () => {
  it('are invisible before discovery: no card, no slot, no count, no clue', () => {
    const save = makeSave()
    const shown = allEntries(save).map((entry) => entry.recipe.id)
    for (const secret of SECRETS) {
      expect(shown, secret.name).not.toContain(secret.id)
      expect(recipeClue(save, secret)).toBeNull()
    }
    expect(bookCounts(save)).toEqual({ found: 0, total: VISIBLE_RECIPES.length, secretsFound: 0 })
    // Every slot the book shows is a non-secret recipe, one each.
    expect(shown).toHaveLength(VISIBLE_RECIPES.length)
  })

  it('are found the ordinary way: the exact set, in any order, and nothing else', () => {
    expect(bake([WHITE_CHOCOLATE, EGG, COCONUT, SUGAR])).toMatchObject({ kind: 'recipe', recipe: { id: SNOWBALL.id } })
    expect(bake([COCONUT, SUGAR, EGG])).toMatchObject({ kind: 'recipe', recipe: { name: 'Coconut Macaroon' } })
    expect(bake([COCONUT, SUGAR, WHITE_CHOCOLATE]).kind).toBe('experiment')
  })

  it('pay their rarity’s reward once, and never again', () => {
    const first = bakeInto(makeSave(), PB_AND_JAM.ingredientIds, 1)
    expect(first.outcome).toMatchObject({ newDiscovery: true, firstSecret: true, reward: { rarity: 'epic', ...RARITY_REWARDS.epic } })
    const again = bakeInto(first.save, [STRAWBERRY_JAM, EGG, SUGAR, PEANUT_BUTTER], 2)
    expect(again.outcome).toMatchObject({ newDiscovery: false, firstSecret: false, reward: null })
    expect(again.save.progression).toEqual(first.save.progression)
  })

  it('appear in their own family once found, counted apart from the main total', () => {
    const save = bakeInto(makeSave(), SNOWBALL.ingredientIds).save
    const curious = bookSections(save).find((section) => section.family.id === 'curious')!
    expect(curious.entries.find((entry) => entry.recipe.id === SNOWBALL.id)).toMatchObject({ kind: 'found' })
    expect(curious).toMatchObject({ found: 0, total: 3, secretsFound: 1 })
    expect(bookCounts(save)).toEqual({ found: 0, total: VISIBLE_RECIPES.length, secretsFound: 1 })
  })

  it('only the first secret is a milestone', () => {
    const first = bakeInto(makeSave(), SNOWBALL.ingredientIds, 1)
    expect(first.outcome.firstSecret).toBe(true)
    const second = bakeInto(first.save, PB_AND_JAM.ingredientIds, 2)
    expect(second.outcome.firstSecret).toBe(false)
    // An ordinary recipe is never a secret milestone.
    expect(bakeInto(makeSave(), [FLOUR, SUGAR, BUTTER]).outcome.firstSecret).toBe(false)
  })

  it('stay found through a save file: only the id is stored, the secret status comes from the catalog', () => {
    const save = bakeInto(makeSave(), SNOWBALL.ingredientIds).save
    const text = serializeSave(save)
    expect(text).not.toMatch(/secret|family|rarity/i)
    const read = deserializeSave(text)
    if (!read.ok) throw new Error(read.detail)
    expect(bookCounts(read.save).secretsFound).toBe(1)
  })
})

describe('families', () => {
  it('group every visible card under its own family, in the recipe box’s order', () => {
    const sections = bookSections(makeSave())
    expect(sections.map((section) => section.family.id)).toEqual(RECIPE_FAMILIES.map((family) => family.id))
    for (const section of sections) {
      for (const entry of section.entries) expect(entry.recipe.family, entry.recipe.name).toBe(section.family.id)
    }
  })

  it('show a found card with its date and a blank card with only its clues', () => {
    const save = withFound(makeSave(), [defineId('recipe', 'shortbread')])
    const classics = bookSections(save).find((section) => section.family.id === 'classics')!
    expect(classics.entries[0]).toEqual({ kind: 'found', recipe: RECIPES[0], discoveredAt: NOW.toISOString() })
    expect(classics.entries[1]).toMatchObject({ kind: 'blank', clue: { ingredientCount: 4 } })
  })

  it('count found of visible per family, and know when one is complete', () => {
    const chocolate = VISIBLE_RECIPES.filter((recipe) => recipe.family === 'chocolate')
    const save = withFound(makeSave(), chocolate.slice(0, 2).map((recipe) => recipe.id))
    expect(bookSections(save).find((section) => section.family.id === 'chocolate')).toMatchObject({
      found: 2,
      total: chocolate.length,
      complete: false,
    })
    const all = withFound(makeSave(), chocolate.map((recipe) => recipe.id))
    expect(completedFamilies(all)).toEqual(['chocolate'])
    expect(bookSections(all).find((section) => section.family.id === 'chocolate')?.complete).toBe(true)
  })

  it('never need a secret to be complete', () => {
    const nutty = VISIBLE_RECIPES.filter((recipe) => recipe.family === 'nutty')
    expect(nutty.some((recipe) => recipe.id === PB_AND_JAM.id)).toBe(false)
    expect(completedFamilies(withFound(makeSave(), nutty.map((recipe) => recipe.id)))).toEqual(['nutty'])
  })

  it('notice the discovery that finishes a family, and the first one ever', () => {
    const fruity = VISIBLE_RECIPES.filter((recipe) => recipe.family === 'fruity')
    const nearly = withFound(makeSave(), fruity.slice(1).map((recipe) => recipe.id))
    const finish = bakeInto(nearly, fruity[0]!.ingredientIds)
    expect(finish.outcome).toMatchObject({ completedFamily: 'fruity', firstCompletedFamily: true })

    const classics = VISIBLE_RECIPES.filter((recipe) => recipe.family === 'classics')
    const another = bakeInto(withFound(finish.save, [...finish.save.discoveredRecipes.map((entry) => entry.recipeId), ...classics.slice(1).map((recipe) => recipe.id)]), classics[0]!.ingredientIds)
    expect(another.outcome).toMatchObject({ completedFamily: 'classics', firstCompletedFamily: false })

    // A rebake finishes nothing.
    expect(bakeInto(finish.save, fruity[0]!.ingredientIds).outcome.completedFamily).toBeNull()
  })

  it('have readable names', () => {
    expect(familyName('warm-spiced')).toBe('Warm & Spiced')
    expect(familyName('curious')).toBe('Strange & Wonderful')
  })
})

describe('clues', () => {
  const LEMON_CRINKLE = findRecipeById(defineId('recipe', 'lemon-crinkle'))!

  it('always say how many ingredients a recipe needs', () => {
    expect(recipeClue(makeNewKitchen(), LEMON_CRINKLE)).toEqual({ ingredientCount: 5, note: null })
  })

  it('add Marmalade’s note once everything the recipe needs is on the shelf', () => {
    const save = makeNewKitchen({ pantryIngredientIds: [...makeNewKitchen().pantryIngredientIds, LEMON] })
    expect(recipeClue(save, LEMON_CRINKLE)).toEqual({ ingredientCount: 5, note: LEMON_CRINKLE.clue })
  })

  it('never name an ingredient, or say anything for a secret', () => {
    for (const recipe of RECIPES) {
      const clue = recipeClue(makeSave(), recipe)
      if (recipe.isSecret) expect(clue).toBeNull()
      else expect(clue?.note, recipe.name).toBeTruthy()
    }
  })
})

describe('the book’s counts', () => {
  it('ignore ids the catalog no longer has', () => {
    const save = withFound(makeNewKitchen(), [defineId('recipe', 'retired-recipe'), defineId('recipe', 'shortbread')])
    expect(bookCounts(save)).toEqual({ found: 1, total: VISIBLE_RECIPES.length, secretsFound: 0 })
  })

  it('hide families that only have undiscovered secrets to show', () => {
    const onlySecret = RECIPES.map((recipe) => (recipe.family === 'fruity' ? { ...recipe, isSecret: true, clue: null } : recipe))
    const families = (save: GameSave) => bookSections(save, onlySecret).map((section) => section.family.id)
    expect(families(makeSave())).not.toContain('fruity')
    const lemonShortbread = defineId('recipe', 'lemon-shortbread')
    expect(families(withFound(makeSave(), [lemonShortbread]))).toContain('fruity')
  })
})
