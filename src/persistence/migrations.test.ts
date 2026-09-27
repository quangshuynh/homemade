import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import { STARTER_PANTRY } from '../domain/ingredients'
import { makeV1Save } from '../test/fixtures'
import { migrateV1ToV2 } from './migrations'
import { readSave } from './schema'

describe('save version 1 → 2', () => {
  it('loads an Interval 1 save as the current version', () => {
    const result = readSave(makeV1Save())

    expect(CURRENT_SAVE_VERSION).toBe(2)
    expect(result).toMatchObject({ ok: true, migratedFrom: 1, save: { version: 2 } })
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
