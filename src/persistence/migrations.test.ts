import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import { INGREDIENT_UNLOCKS, unlockStatus } from '../domain/progression'
import { bookCounts } from '../domain/recipeBook'
import { availableScene, readyScenes } from '../story/progress'
import { DECORATIONS } from '../decorating/catalog'
import { decoratingOpen, grantEarnedDecorations } from '../decorating/rules'
import { makeSave, makeV1Save, makeV2Save, makeV3Save, makeV4Save, makeV5Save } from '../test/fixtures'
import { migrateV1ToV2, migrateV2ToV3, migrateV3ToV4, migrateV4ToV5, migrateV5ToV6 } from './migrations'
import { readSave } from './schema'

/** Every ingredient the catalog had through Interval 4. Later ingredients are earned, never handed out by an upgrade. */
const INTERVAL_4_INGREDIENTS = [
  'ingredient_flour',
  'ingredient_sugar',
  'ingredient_butter',
  'ingredient_egg',
  'ingredient_chocolate-chips',
  'ingredient_vanilla',
  'ingredient_cocoa',
  'ingredient_cinnamon',
  'ingredient_oats',
  'ingredient_peanut-butter',
  'ingredient_honey',
  'ingredient_coconut',
]

describe('save version 1 → 2', () => {
  it('loads an Interval 1 save as the current version', () => {
    const result = readSave(makeV1Save())

    expect(CURRENT_SAVE_VERSION).toBe(6)
    expect(result).toMatchObject({ ok: true, migratedFrom: 1, save: { version: 6, bakedCreations: [] } })
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

  it('stocks the pantry with every ingredient those versions had, and starts with no discoveries', () => {
    const result = readSave(makeV1Save())
    if (!result.ok) throw new Error(result.detail)

    // An Interval 1 kitchen predates locked ingredients, so it upgrades through the full Interval 2/3 pantry.
    expect(new Set(result.save.pantryIngredientIds)).toEqual(new Set(INTERVAL_4_INGREDIENTS))
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
    expect(result).toMatchObject({ ok: true, migratedFrom: 2, save: { version: 6, bakedCreations: [] } })
    expect(migrateV2ToV3(makeV2Save())).toMatchObject({ version: 3, bakedCreations: [] })
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
    expect(new Set(migrated.pantryIngredientIds as string[])).toEqual(new Set(INTERVAL_4_INGREDIENTS))
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

describe('save version 3 → 4', () => {
  it('loads an Interval 4 save as the current version', () => {
    const result = readSave(makeV3Save())
    expect(result).toMatchObject({ ok: true, migratedFrom: 3, save: { version: 6 } })
    expect(migrateV3ToV4(makeV3Save())).toMatchObject({ version: 4 })
  })

  it('keeps names, settings, discoveries and their dates, memories and timestamps exactly', () => {
    const v3 = makeV3Save()
    const result = readSave(v3)
    if (!result.ok) throw new Error(result.detail)

    expect(result.save.profile).toEqual(v3.profile)
    expect(result.save.settings).toEqual(v3.settings)
    expect(result.save.discoveredRecipes).toEqual(v3.discoveredRecipes)
    expect(result.save.bakedCreations).toEqual(v3.bakedCreations)
    expect(result.save.createdAt).toBe(v3.createdAt)
    expect(result.save.updatedAt).toBe(v3.updatedAt)
  })

  it('never takes away an ingredient the kitchen already owned', () => {
    const v3 = makeV3Save()
    const migrated = migrateV3ToV4(v3)
    expect(migrated.pantryIngredientIds).toEqual(v3.pantryIngredientIds)
    expect(migrated.pantryIngredientIds).toHaveLength(12)
  })

  it('starts Crumbs at zero and gives XP for each recipe already in the book, once each', () => {
    // Shortbread (common, 20) + Snickerdoodle (uncommon, 40) + Honey Flapjack (legendary, 200).
    expect(migrateV3ToV4(makeV3Save()).progression).toEqual({ crumbs: 0, xp: 260 })

    const duplicated = makeV3Save({
      discoveredRecipes: [
        { recipeId: 'recipe_shortbread', discoveredAt: '2026-02-10T10:00:00.000Z' },
        { recipeId: 'recipe_shortbread', discoveredAt: '2026-02-11T10:00:00.000Z' },
        { recipeId: 'recipe_retired-favourite', discoveredAt: '2026-02-12T10:00:00.000Z' },
      ],
    })
    expect(migrateV3ToV4(duplicated).progression).toEqual({ crumbs: 0, xp: 20 })
    expect(migrateV3ToV4(makeV3Save({ discoveredRecipes: [] })).progression).toEqual({ crumbs: 0, xp: 0 })
  })

  it('marks the tutorial as done, so a returning player is never sent through it', () => {
    expect(migrateV3ToV4(makeV3Save()).tutorial).toEqual({ completed: true, skipped: false })
  })

  it('upgrades the oldest saves all the way, with the tutorial done and their pantry full', () => {
    const result = readSave(makeV1Save())
    if (!result.ok) throw new Error(result.detail)
    expect(result.save.tutorial).toEqual({ completed: true, skipped: false })
    expect(result.save.progression).toEqual({ crumbs: 0, xp: 0 })
    expect(result.save.pantryIngredientIds).toHaveLength(12)
  })

  it('is deterministic and leaves the stored data untouched', () => {
    const v3 = makeV3Save()
    const snapshot = structuredClone(v3)
    expect(migrateV3ToV4(makeV3Save())).toEqual(migrateV3ToV4(makeV3Save()))
    readSave(v3)
    expect(v3).toEqual(snapshot)
  })

  it('reports a version 3 save it cannot upgrade instead of guessing', () => {
    expect(readSave(makeV3Save({ pantryIngredientIds: 'flour' }))).toMatchObject({ ok: false, reason: 'migration-failed', version: 3 })
    expect(readSave(makeV3Save({ discoveredRecipes: null }))).toMatchObject({ ok: false, reason: 'migration-failed', version: 3 })
  })
})

describe('Interval 6 content on older saves', () => {
  it('keeps everything an upgraded kitchen had, and leaves the new ingredients to be earned', () => {
    const v3 = makeV3Save()
    const result = readSave(v3)
    if (!result.ok) throw new Error(result.detail)
    const { save } = result

    expect(save.version).toBe(CURRENT_SAVE_VERSION)
    expect(save.pantryIngredientIds).toEqual(v3.pantryIngredientIds)
    expect(save.discoveredRecipes).toEqual(v3.discoveredRecipes)
    expect(save.bakedCreations).toEqual(v3.bakedCreations)
    expect(save.profile).toEqual(v3.profile)
    expect(save.settings).toEqual(v3.settings)
    expect(save.tutorial).toEqual({ completed: true, skipped: false })

    for (const unlock of INGREDIENT_UNLOCKS.filter((entry) => !INTERVAL_4_INGREDIENTS.includes(entry.ingredientId))) {
      expect(unlockStatus(save, unlock.ingredientId).kind, unlock.ingredientId).not.toBe('owned')
    }
    // Families and secrecy come from the catalog: nothing new was written into the save.
    expect(Object.keys(save).sort()).toEqual(
      [
        'bakedCreations',
        'createdAt',
        'decorating',
        'discoveredRecipes',
        'pantryIngredientIds',
        'profile',
        'progression',
        'settings',
        'story',
        'tutorial',
        'updatedAt',
        'version',
      ],
    )
    expect(bookCounts(save)).toEqual({ found: 3, total: 31, secretsFound: 0 })
  })

  it('reads a current save exactly as it was written', () => {
    const interval5 = makeSave({ progression: { crumbs: 37, xp: 412 }, discoveredRecipes: [{ recipeId: 'recipe_shortbread' as never, discoveredAt: '2026-08-01T10:00:00.000Z' }] })
    const result = readSave(JSON.parse(JSON.stringify(interval5)))
    expect(result).toEqual({ ok: true, save: interval5, migratedFrom: null })
  })
})

describe('save version 4 → 5', () => {
  it('loads an Interval 6 save as the current version, with no story seen', () => {
    const result = readSave(makeV4Save())
    expect(result).toMatchObject({ ok: true, migratedFrom: 4, save: { version: 6, story: { seenSceneIds: [] } } })
    expect(migrateV4ToV5(makeV4Save())).toMatchObject({ version: 5, story: { seenSceneIds: [] } })
  })

  it('keeps every earlier field exactly: names, settings, pantry, Crumbs, XP, discoveries and dates, memories, tutorial, timestamps', () => {
    const v4 = makeV4Save()
    const result = readSave(v4)
    if (!result.ok) throw new Error(result.detail)
    const { story, decorating, ...rest } = result.save
    expect(rest).toEqual({ ...v4, version: 6 })
    expect(decorating).toEqual({ ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] })
    expect(story).toEqual({ seenSceneIds: [] })
  })

  it('never sends a returning player back through the tutorial, whether they finished or skipped it', () => {
    for (const tutorial of [
      { completed: false, skipped: true },
      { completed: true, skipped: false },
    ]) {
      const result = readSave(makeV4Save({ tutorial }))
      if (!result.ok) throw new Error(result.detail)
      expect(result.save.tutorial).toEqual(tutorial)
    }
  })

  it('lets an existing kitchen catch up from the first chapter, one scene at a time', () => {
    const result = readSave(makeV4Save())
    if (!result.ok) throw new Error(result.detail)
    // Nothing is marked seen on their behalf; everything their progress has earned is ready, in order.
    expect(availableScene(result.save)?.scene.id).toBe('scene_faded-box')
    expect(readyScenes(result.save).map((placed) => placed.scene.id)).toEqual([
      'scene_faded-box',
      'scene_margins',
      'scene_margins-spice',
      'scene_second-shelf',
    ])
  })

  it('upgrades the oldest saves all the way through', () => {
    for (const old of [makeV1Save(), makeV2Save(), makeV3Save()]) {
      const result = readSave(old)
      if (!result.ok) throw new Error(result.detail)
      expect(result.save.story).toEqual({ seenSceneIds: [] })
      expect(result.save.version).toBe(6)
    }
  })

  it('is deterministic and leaves the stored data untouched', () => {
    const v4 = makeV4Save()
    const snapshot = structuredClone(v4)
    expect(migrateV4ToV5(makeV4Save())).toEqual(migrateV4ToV5(makeV4Save()))
    readSave(v4)
    expect(v4).toEqual(snapshot)
  })

  it('reports a version 4 save it cannot upgrade instead of guessing, and leaves it as it was', () => {
    const broken = makeV4Save({ tutorial: null })
    const snapshot = structuredClone(broken)
    expect(readSave(broken)).toMatchObject({ ok: false, reason: 'migration-failed', version: 4 })
    expect(readSave(makeV4Save({ discoveredRecipes: 'none' }))).toMatchObject({ ok: false, reason: 'migration-failed', version: 4 })
    expect(broken).toEqual(snapshot)
  })

  it('rejects a current save whose story is damaged', () => {
    const save = makeSave()
    expect(readSave({ ...save, story: undefined })).toMatchObject({ ok: false, reason: 'invalid' })
    expect(readSave({ ...save, story: { seenSceneIds: ['chapter one'] } })).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('keeps seen scenes it doesn’t recognise, so a rewritten scene never makes a save unreadable', () => {
    const save = makeSave({ story: { seenSceneIds: ['scene_faded-box', 'scene_retired'] as never } })
    expect(readSave(JSON.parse(JSON.stringify(save)))).toEqual({ ok: true, save, migratedFrom: null })
  })
})

describe('save version 5 → 6', () => {
  /** A version 5 kitchen that had read all five chapters: the first Mythic is in its book. Literal, like the fixtures. */
  const finishedArc = () =>
    makeV5Save({
      discoveredRecipes: [
        { recipeId: 'recipe_shortbread', discoveredAt: '2026-09-01T10:00:00.000Z' },
        { recipeId: 'recipe_honey-flapjack', discoveredAt: '2026-09-02T10:00:00.000Z' },
        { recipeId: 'recipe_millionaires-shortbread', discoveredAt: '2026-09-03T10:00:00.000Z' },
      ],
      story: {
        seenSceneIds: ['scene_faded-box', 'scene_margins', 'scene_margins-spice', 'scene_second-shelf', 'scene_hidden-recipes', 'scene_last-card'],
      },
    })

  it('loads an Interval 7 save as the current version, with an empty cupboard and nothing out', () => {
    const result = readSave(makeV5Save())
    expect(result).toMatchObject({
      ok: true,
      migratedFrom: 5,
      save: { version: 6, decorating: { ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] } },
    })
  })

  it('keeps every earlier field exactly, story and timestamps included', () => {
    const v5 = makeV5Save()
    const result = readSave(v5)
    if (!result.ok) throw new Error(result.detail)
    const { decorating, ...rest } = result.save
    expect(rest).toEqual({ ...v5, version: 6 })
    expect(decorating).toEqual({ ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] })
  })

  it('finds the cupboard already open for a kitchen that had finished Chapter 5, and hands over what it earned', () => {
    const result = readSave(finishedArc())
    if (!result.ok) throw new Error(result.detail)
    expect(decoratingOpen(result.save)).toBe(true)
    // The first evaluation after loading, exactly as the game runs it.
    const { save, granted } = grantEarnedDecorations(result.save)
    expect(granted.map((entry) => entry.id)).toEqual([
      ...DECORATIONS.filter((entry) => entry.unlock.type === 'chapter-complete').map((entry) => entry.id),
      'decoration_gold-seal-frame',
      'decoration_little-lemon-tree',
    ])
    // Nothing is replayed or invented: the story, the book and the Crumbs are as they were, and nothing is put out.
    expect(save.story).toEqual(result.save.story)
    expect(save.discoveredRecipes).toEqual(result.save.discoveredRecipes)
    expect(save.progression).toEqual(result.save.progression)
    expect(save.decorating.equippedBySlot).toEqual({})
    // And it's the same every time.
    expect(grantEarnedDecorations(result.save)).toEqual({ save, granted })
    expect(grantEarnedDecorations(save).granted).toEqual([])
  })

  it('keeps the cupboard shut for a kitchen still partway through the story', () => {
    const result = readSave(makeV5Save())
    if (!result.ok) throw new Error(result.detail)
    expect(grantEarnedDecorations(result.save).granted).toEqual([])
  })

  it('upgrades the oldest saves all the way through', () => {
    for (const old of [makeV1Save(), makeV2Save(), makeV3Save(), makeV4Save()]) {
      const result = readSave(old)
      if (!result.ok) throw new Error(result.detail)
      expect(result.save.decorating).toEqual({ ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] })
    }
  })

  it('is deterministic, leaves the stored data untouched, and refuses a save it can’t upgrade', () => {
    const v5 = makeV5Save()
    const snapshot = structuredClone(v5)
    expect(migrateV5ToV6(makeV5Save())).toEqual(migrateV5ToV6(makeV5Save()))
    readSave(v5)
    expect(v5).toEqual(snapshot)
    expect(readSave(makeV5Save({ story: null }))).toMatchObject({ ok: false, reason: 'migration-failed', version: 5 })
  })
})

describe('the decorating part of a current save', () => {
  const withDecorating = (decorating: unknown) => ({ ...makeSave(), decorating })
  const good = { ownedDecorationIds: ['decoration_gingham-towel'], equippedBySlot: { textile: 'decoration_gingham-towel' }, noticedMomentIds: ['first-equip'] }

  it('reads back exactly as written', () => {
    const save = withDecorating(good)
    expect(readSave(JSON.parse(JSON.stringify(save)))).toEqual({ ok: true, save, migratedFrom: null })
  })

  it('keeps decorations the catalog doesn’t know, so a retired one never makes a save unreadable', () => {
    const save = withDecorating({ ...good, ownedDecorationIds: ['decoration_gingham-towel', 'decoration_retired-vase'], equippedBySlot: { shelf: 'decoration_retired-vase' } })
    expect(readSave(save)).toMatchObject({ ok: true })
  })

  it('refuses one that’s missing, misshapen, out somewhere that isn’t a spot, or out without being owned', () => {
    for (const [decorating, problem] of [
      [undefined, 'decorating is missing'],
      [{ ...good, ownedDecorationIds: 'all of it' }, 'not a list of decoration ids'],
      [{ ...good, ownedDecorationIds: ['recipe_shortbread'] }, 'not a list of decoration ids'],
      [{ ...good, ownedDecorationIds: ['decoration_gingham-towel', 'decoration_gingham-towel'] }, 'lists a decoration twice'],
      [{ ...good, equippedBySlot: { ceiling: 'decoration_gingham-towel' } }, 'unknown spot "ceiling"'],
      [{ ...good, equippedBySlot: { textile: 'decoration_fruit-print-towel' } }, 'doesn’t own'.replace('’', "'")],
      [{ ...good, equippedBySlot: { textile: 42 } }, 'not a decoration id'],
      [{ ...good, noticedMomentIds: [''] }, 'noticedMomentIds'],
    ] as const) {
      const result = readSave(withDecorating(decorating))
      expect(result, problem).toMatchObject({ ok: false, reason: 'invalid' })
      if (!result.ok) expect(result.detail, problem).toContain(problem)
    }
  })
})
