import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import { defineId } from '../domain/ids'
import { FIXED_NOW, makeSave } from '../test/fixtures'
import { deserializeSave, findSaveProblem, readSave, serializeSave, type Migration } from './schema'

describe('readSave', () => {
  it('accepts a current-version save unchanged', () => {
    const save = makeSave()
    const result = readSave(structuredClone(save))

    expect(result).toEqual({ ok: true, save, migratedFrom: null })
  })

  it.each([undefined, null, 'a string', 42, [], {}, { version: 'one' }, { version: 0 }, { version: 1.5 }])(
    'rejects %j as unrecognised',
    (raw) => {
      const result = readSave(raw)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('unrecognised')
    },
  )

  it('rejects a save from a newer version of the game without touching it', () => {
    const raw = { ...makeSave(), version: CURRENT_SAVE_VERSION + 1, somethingNew: true }
    const snapshot = structuredClone(raw)

    const result = readSave(raw)

    expect(result).toMatchObject({ ok: false, reason: 'newer-version', version: CURRENT_SAVE_VERSION + 1 })
    expect(raw).toEqual(snapshot)
  })

  it('flags a current-version save with a broken shape as invalid', () => {
    const raw = { ...makeSave(), profile: { id: 'player_x', name: '', bakeryName: 'Somewhere' } }
    const result = readSave(raw)

    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    if (!result.ok) expect(result.detail).toContain('profile.name')
  })

  it('flags recipe ids that are not recipe ids', () => {
    const raw = { ...makeSave(), discoveredRecipes: [{ recipeId: 'Butter Cookie', discoveredAt: '2026-03-14T09:30:00.000Z' }] }
    expect(readSave(raw)).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('accepts remembered bakes, including experiments', () => {
    const raw = {
      ...makeSave(),
      bakedCreations: [
        { id: 'creation_a', ingredientIds: ['ingredient_flour', 'ingredient_sugar'], recipeId: null, bakedAt: FIXED_NOW.toISOString() },
        { id: 'creation_b', ingredientIds: ['ingredient_flour'], recipeId: 'recipe_shortbread', bakedAt: FIXED_NOW.toISOString() },
      ],
    }
    expect(readSave(raw)).toMatchObject({ ok: true })
  })

  it.each([
    ['a missing list', undefined],
    ['a non-creation id', [{ id: 'bake_1', ingredientIds: [], recipeId: null, bakedAt: '2026-03-14T09:30:00.000Z' }]],
    ['a bad recipe id', [{ id: 'creation_1', ingredientIds: [], recipeId: 'Shortbread', bakedAt: '2026-03-14T09:30:00.000Z' }]],
    ['a bad date', [{ id: 'creation_1', ingredientIds: [], recipeId: null, bakedAt: 'yesterday' }]],
    ['copied names instead of ids', [{ id: 'creation_1', ingredientIds: ['Flour'], recipeId: null, bakedAt: '2026-03-14T09:30:00.000Z' }]],
  ])('flags bakedCreations with %s', (_, bakedCreations) => {
    const result = readSave({ ...makeSave(), bakedCreations })
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    if (!result.ok) expect(result.detail).toContain('bakedCreations')
  })

  it.each([
    ['missing progression', { progression: undefined }, 'progression'],
    ['negative Crumbs', { progression: { crumbs: -5, xp: 0 } }, 'progression.crumbs'],
    ['fractional Crumbs', { progression: { crumbs: 1.5, xp: 0 } }, 'progression.crumbs'],
    ['XP as text', { progression: { crumbs: 0, xp: '40' } }, 'progression.xp'],
    ['missing tutorial', { tutorial: undefined }, 'tutorial'],
    ['a tutorial flag that is not a boolean', { tutorial: { completed: 'yes', skipped: false } }, 'tutorial.completed'],
  ])('flags %s', (_, patch, field) => {
    const result = readSave({ ...makeSave(), ...patch })
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    if (!result.ok) expect(result.detail).toContain(field)
  })

  it('flags unknown settings values', () => {
    const save = makeSave()
    const raw = { ...save, settings: { ...save.settings, motion: 'wiggly' } }
    expect(readSave(raw)).toMatchObject({ ok: false, reason: 'invalid' })
  })

  describe('migrations', () => {
    // A pretend future where version 2 renamed `profile.kitchen` to `profile.bakeryName`.
    // The shape check ignores the version number so the real validator can judge the result.
    const current = makeSave()
    const { bakeryName, ...profileWithoutBakery } = current.profile
    const versionOne = { ...current, version: 1, profile: { ...profileWithoutBakery, kitchen: bakeryName } }
    const shapeOnly = (value: Record<string, unknown>) => findSaveProblem({ ...value, version: CURRENT_SAVE_VERSION })

    const renameKitchen: Migration = (raw) => {
      const { kitchen, ...profile } = raw.profile as Record<string, unknown>
      return { ...raw, version: 2, profile: { ...profile, bakeryName: kitchen } }
    }

    it('upgrades an old save and reports where it came from', () => {
      const result = readSave(versionOne, { migrations: { 1: renameKitchen }, currentVersion: 2, findProblem: shapeOnly })

      expect(result).toEqual({ ok: true, save: { ...current, version: 2 }, migratedFrom: 1 })
    })

    it('runs every step of a chain, in order', () => {
      const steps: number[] = []
      const bump =
        (from: number): Migration =>
        (raw) => {
          steps.push(from)
          return { ...raw, version: from + 1 }
        }

      const result = readSave(
        { ...current, version: 1 },
        { migrations: { 1: bump(1), 2: bump(2) }, currentVersion: 3, findProblem: shapeOnly },
      )

      expect(steps).toEqual([1, 2])
      expect(result).toMatchObject({ ok: true, migratedFrom: 1, save: { version: 3 } })
    })

    it('never modifies the stored data while migrating', () => {
      const snapshot = structuredClone(versionOne)
      readSave(versionOne, {
        migrations: { 1: (raw) => Object.assign(raw, { version: 2, clobbered: true }) },
        currentVersion: 2,
        findProblem: shapeOnly,
      })
      expect(versionOne).toEqual(snapshot)
    })

    it('reports a gap in the migration chain instead of guessing', () => {
      const result = readSave({ ...current, version: 1 }, { migrations: {}, currentVersion: 3 })
      expect(result).toMatchObject({ ok: false, reason: 'no-migration', version: 1 })
    })

    it('reports a migration that throws', () => {
      const result = readSave(versionOne, {
        migrations: {
          1: () => {
            throw new Error('boom')
          },
        },
        currentVersion: 2,
      })
      expect(result).toMatchObject({ ok: false, reason: 'migration-failed' })
      if (!result.ok) expect(result.detail).toContain('boom')
    })

    it('reports a migration that forgets to bump the version', () => {
      const result = readSave(versionOne, { migrations: { 1: (raw) => raw }, currentVersion: 2, findProblem: shapeOnly })
      expect(result).toMatchObject({ ok: false, reason: 'migration-failed' })
    })

    it('rejects an upgraded save that still has the wrong shape', () => {
      const result = readSave(versionOne, {
        migrations: { 1: (raw) => ({ ...raw, version: 2 }) },
        currentVersion: 2,
        findProblem: shapeOnly,
      })
      expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    })
  })
})

describe('serialization', () => {
  it('round-trips a save through JSON', () => {
    const save = makeSave({ discoveredRecipes: [{ recipeId: defineId('recipe', 'shortbread'), discoveredAt: FIXED_NOW.toISOString() }] })
    const json = serializeSave(save)

    expect(JSON.parse(json).version).toBe(CURRENT_SAVE_VERSION)
    expect(deserializeSave(json)).toEqual({ ok: true, save, migratedFrom: null })
  })

  it('reports text that is not JSON', () => {
    expect(deserializeSave('{ not json')).toMatchObject({ ok: false, reason: 'unrecognised' })
  })
})
