import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import { STARTER_PANTRY } from '../domain/ingredients'
import { makeV1Save, makeV2Save } from '../test/fixtures'
import { migrateV1ToV2, migrateV2ToV3 } from './migrations'
import { readSave } from './schema'

describe('save version 1 → 2', () => {
  it('loads an Interval 1 save as the current version', () => {
    const result = readSave(makeV1Save())

    expect(CURRENT_SAVE_VERSION).toBe(3)
    expect(result).toMatchObject({ ok: true, migratedFrom: 1, save: { version: 3, bakedCreations: [] } })
  })

  it('keeps the profile, kitchen name, settings and timestamps', () => {
    const v1 = makeV1Save()
    const result = readSave(v1)
    if (!result.ok) throw new Error(result.detail)

    expect(result.save.profile).toEqual(v1.profile)
    expect(result.save.profile.bakeryName).toBe('Crumb & Co.')
    expect(result.save.settings).toEqual({ soundEnabled: false, motion: 'reduced' })
    expect(result.save.createdAt).toBe(v1.createdAt)
    expect(result.save.updatedAt).toBe(v1.updatedAt)
  })

  it('stocks the pantry with the starter ingredients and starts with no discoveries', () => {
    const result = readSave(makeV1Save())
    if (!result.ok) throw new Error(result.detail)

    expect(result.save.pantryIngredientIds).toEqual([...STARTER_PANTRY])
    expect(result.save.discoveredRecipes).toEqual([])
    expect(result.save).not.toHaveProperty('discoveredRecipeIds')
  })

  it('carries over any recipe ids, once each, dated to the last update', () => {
    const migrated = migrateV1ToV2(
      makeV1Save({ discoveredRecipeIds: ['recipe_shortbread', 'recipe_shortbread', 'recipe_old-favourite'] }),
    )
    expect(migrated.discoveredRecipes).toEqual([
      { recipeId: 'recipe_shortbread', discoveredAt: '2026-02-03T09:00:00.000Z' },
      { recipeId: 'recipe_old-favourite', discoveredAt: '2026-02-03T09:00:00.000Z' },
    ])
  })

  it('is deterministic', () => {
    expect(migrateV1ToV2(makeV1Save())).toEqual(migrateV1ToV2(makeV1Save()))
  })

  it('does not modify the stored data', () => {
    const v1 = makeV1Save()
    const snapshot = structuredClone(v1)
    readSave(v1)
    expect(v1).toEqual(snapshot)
  })

  it('reports a version 1 save it cannot upgrade instead of guessing', () => {
    const result = readSave(makeV1Save({ discoveredRecipeIds: 'not a list' }))
    expect(result).toMatchObject({ ok: false, reason: 'migration-failed', version: 1 })
  })

  it('reports a version 1 save that upgrades into something invalid', () => {
    const result = readSave(makeV1Save({ profile: { id: 'player_x', name: '', bakeryName: 'Somewhere' } }))
    expect(result).toMatchObject({ ok: false, reason: 'invalid', version: 1 })
  })
})

describe('save version 2 → 3', () => {
  it('loads an Interval 2 save as version 3 with empty baking memories', () => {
    const result = readSave(makeV2Save())
    expect(result).toMatchObject({ ok: true, migratedFrom: 2, save: { version: 3, bakedCreations: [] } })
  })

  it('keeps the profile, kitchen name, settings, discoveries and timestamps exactly', () => {
    const v2 = makeV2Save()
    const result = readSave(v2)
    if (!result.ok) throw new Error(result.detail)

    expect(result.save.profile).toEqual(v2.profile)
    expect(result.save.settings).toEqual(v2.settings)
    expect(result.save.discoveredRecipes).toEqual(v2.discoveredRecipes)
    expect(result.save.createdAt).toBe(v2.createdAt)
    expect(result.save.updatedAt).toBe(v2.updatedAt)
  })

  it('never invents past bakes, even from discoveries', () => {
    const result = readSave(makeV2Save())
    if (!result.ok) throw new Error(result.detail)
    expect(result.save.discoveredRecipes).toHaveLength(2)
    expect(result.save.bakedCreations).toEqual([])
  })

  it('keeps the pantry as it was and puts the new ingredients on the shelf after it', () => {
    const v2 = makeV2Save()
    const migrated = migrateV2ToV3(v2)
    expect(migrated.pantryIngredientIds).toEqual([
      ...(v2.pantryIngredientIds as string[]),
      'ingredient_oats',
      'ingredient_peanut-butter',
      'ingredient_honey',
      'ingredient_coconut',
    ])
    expect(new Set(migrated.pantryIngredientIds as string[])).toEqual(new Set(STARTER_PANTRY))
  })

  it('does not add an ingredient twice', () => {
    const migrated = migrateV2ToV3(makeV2Save({ pantryIngredientIds: ['ingredient_flour', 'ingredient_oats'] }))
    expect(migrated.pantryIngredientIds).toEqual([
      'ingredient_flour',
      'ingredient_oats',
      'ingredient_peanut-butter',
      'ingredient_honey',
      'ingredient_coconut',
    ])
  })

  it('is deterministic and leaves the stored data untouched', () => {
    const v2 = makeV2Save()
    const snapshot = structuredClone(v2)
    expect(migrateV2ToV3(makeV2Save())).toEqual(migrateV2ToV3(makeV2Save()))
    readSave(v2)
    expect(v2).toEqual(snapshot)
  })

  it('reports a version 2 save it cannot upgrade instead of guessing', () => {
    expect(readSave(makeV2Save({ pantryIngredientIds: 'flour' }))).toMatchObject({ ok: false, reason: 'migration-failed', version: 2 })
    expect(readSave(makeV2Save({ discoveredRecipes: undefined }))).toMatchObject({ ok: false, reason: 'migration-failed', version: 2 })
  })
})
