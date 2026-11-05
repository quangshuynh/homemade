import { describe, expect, it } from 'vitest'
import { bake, recordBake } from '../domain/baking'
import type { CreationId } from '../domain/ids'
import { BUTTER, CHOCOLATE_CHIPS, CINNAMON, COCONUT, EGG, FLOUR, MARSHMALLOW, PECAN, SUGAR, VANILLA } from '../domain/ingredients'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import { FIXED_NOW, makeSave, makeV1Save, makeV2Save } from '../test/fixtures'
import { exportSave, MAX_IMPORT_BYTES, readSaveFile, SAVE_FILE_FORMAT, saveFileName } from './portable'
import { serializeSave } from './schema'

/** A kitchen with a discovery and remembered bakes (one of them an experiment). */
function playedSave() {
  let save = makeSave()
  save = recordBake(save, bake([FLOUR, SUGAR, BUTTER]), new Date('2026-04-01T10:00:00.000Z'), 'creation_one' as CreationId).save
  save = recordBake(save, bake([EGG, CINNAMON]), new Date('2026-04-02T10:00:00.000Z'), 'creation_two' as CreationId).save
  return save
}

const fileWith = (save: unknown) => JSON.stringify({ format: SAVE_FILE_FORMAT, exportedAt: FIXED_NOW.toISOString(), save })

describe('saveFileName', () => {
  it.each([
    ['Crumb & Co.', 'homemade-crumb-co.json'],
    ['  The   Oven ', 'homemade-the-oven.json'],
    ['Crème Brûlée Café', 'homemade-creme-brulee-cafe.json'],
    ['../../etc/passwd', 'homemade-etc-passwd.json'],
    ['CON: <>|?*', 'homemade-con.json'],
    ['🍪🍪🍪', 'homemade-save.json'],
    ['パン屋', 'homemade-save.json'],
  ])('%j → %s', (name, expected) => {
    expect(saveFileName(name)).toBe(expected)
  })

  it('keeps long names to a sensible length without a trailing dash', () => {
    const name = saveFileName('a'.repeat(30) + ' ' + 'b'.repeat(30))
    expect(name.length).toBeLessThanOrEqual('homemade-.json'.length + 40)
    expect(name).not.toMatch(/-\.json$/)
  })
})

describe('exporting and importing', () => {
  it('round-trips a played kitchen exactly: names, ids, discoveries, memories and settings', () => {
    const save = playedSave()
    const { fileName, text } = exportSave(save, FIXED_NOW)

    expect(fileName).toBe('homemade-crumb-co.json')
    const result = readSaveFile(text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.save).toEqual(save)
    expect(result.migratedFrom).toBeNull()
    expect(result.summary).toEqual({
      playerName: 'Robin',
      bakeryName: 'Crumb & Co.',
      recipeCount: 1,
      secretCount: 0,
      memoryCount: 2,
      lastSaved: save.updatedAt,
    })
  })

  it('writes a recognisable, versioned file holding only the logical save', () => {
    const save = playedSave()
    const parsed = JSON.parse(exportSave(save, FIXED_NOW).text)
    expect(Object.keys(parsed).sort()).toEqual(['exportedAt', 'format', 'save'])
    expect(parsed.format).toBe(SAVE_FILE_FORMAT)
    expect(parsed.save.version).toBe(CURRENT_SAVE_VERSION)
    expect(parsed.save).toEqual(save)
  })

  it('accepts a bare save, like the backup the save-problem screen downloads', () => {
    const save = playedSave()
    expect(readSaveFile(serializeSave(save))).toMatchObject({ ok: true, save })
  })

  it('upgrades an older save, keeping the untouched original to archive', () => {
    const v2 = makeV2Save()
    const result = readSaveFile(fileWith(v2))
    expect(result).toMatchObject({ ok: true, migratedFrom: 2, original: v2, save: { version: CURRENT_SAVE_VERSION, bakedCreations: [] } })
    expect(result.ok && result.save.discoveredRecipes).toEqual(v2.discoveredRecipes)
  })

  it('upgrades a version 1 save as well', () => {
    expect(readSaveFile(fileWith(makeV1Save()))).toMatchObject({ ok: true, migratedFrom: 1 })
  })
})

describe('refusing files that are not a readable Homemade save', () => {
  it('turns away malformed JSON', () => {
    expect(readSaveFile('{"format": "homemade-save", "save": ')).toMatchObject({ ok: false, problem: 'not-json' })
    expect(readSaveFile('')).toMatchObject({ ok: false, problem: 'not-json' })
  })

  it.each([
    ['an array', '[1, 2, 3]'],
    ['a number', '42'],
    ['some other app’s file', JSON.stringify({ format: 'recipe-box-export', data: {} })],
    ['unrelated JSON', JSON.stringify({ name: 'package', version: '1.0.0' })],
    ['a file with no save inside', JSON.stringify({ format: SAVE_FILE_FORMAT })],
  ])('turns away %s', (_label, text) => {
    expect(readSaveFile(text)).toMatchObject({ ok: false, problem: 'not-homemade' })
  })

  it('refuses a save from a newer version, in plain words', () => {
    const result = readSaveFile(fileWith({ ...makeSave(), version: CURRENT_SAVE_VERSION + 1 }))
    expect(result).toMatchObject({ ok: false, problem: 'newer-version' })
    expect(!result.ok && result.message).toBe('This save was made by a newer version of Homemade and can’t be opened here yet.')
  })

  it('refuses a damaged save instead of repairing it', () => {
    const { profile: _profile, ...noProfile } = makeSave()
    expect(readSaveFile(fileWith(noProfile))).toMatchObject({ ok: false, problem: 'damaged' })
    expect(readSaveFile(fileWith({ ...makeSave(), bakedCreations: 'lots' }))).toMatchObject({ ok: false, problem: 'damaged' })
    expect(readSaveFile(fileWith({ ...makeSave(), settings: { soundEnabled: 'yes', motion: 'system' } }))).toMatchObject({
      ok: false,
      problem: 'damaged',
    })
  })

  it('refuses an older save whose upgrade fails', () => {
    expect(readSaveFile(fileWith(makeV2Save({ pantryIngredientIds: 'none' })))).toMatchObject({ ok: false, problem: 'damaged' })
  })

  it('refuses anything far too large to be a save', () => {
    expect(readSaveFile(' '.repeat(MAX_IMPORT_BYTES + 1))).toMatchObject({ ok: false, problem: 'too-large' })
  })
})

describe('decorations in a save file', () => {
  const decorated = () =>
    makeSave({
      decorating: {
        ownedDecorationIds: ['decoration_gingham-towel', 'decoration_copper-crock', 'decoration_cafe-curtains'] as never,
        equippedBySlot: { textile: 'decoration_gingham-towel', 'counter-right': 'decoration_copper-crock' } as never,
        noticedMomentIds: ['first-equip'],
      },
    })

  it('carries what the kitchen owns and what’s out, exactly, there and back', () => {
    const save = decorated()
    const result = readSaveFile(exportSave(save, FIXED_NOW).text)
    if (!result.ok) throw new Error(result.message)
    expect(result.save).toEqual(save)
    expect(result.save.decorating).toEqual(save.decorating)
  })

  it('refuses a file whose decorations don’t add up, and says it’s damaged rather than patching it', () => {
    const save = decorated()
    const broken = { ...save, decorating: { ...save.decorating, equippedBySlot: { wall: 'decoration_gold-seal-frame' } } }
    expect(readSaveFile(fileWith(broken))).toMatchObject({ ok: false, problem: 'damaged' })
    const unknownSpot = { ...save, decorating: { ...save.decorating, equippedBySlot: { attic: 'decoration_gingham-towel' } } }
    expect(readSaveFile(fileWith(unknownSpot))).toMatchObject({ ok: false, problem: 'damaged' })
  })

  it('opens an Interval 7 file with an empty cupboard, never inventing decorations in the file itself', () => {
    const v5 = { ...makeSave(), version: 5, decorating: undefined }
    const result = readSaveFile(fileWith(v5))
    if (!result.ok) throw new Error(result.message)
    expect(result.migratedFrom).toBe(5)
    expect(result.save.decorating).toEqual({ ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] })
  })
})

describe('Arc 2 state (Interval 10)', () => {
  /** A kitchen part-way through the second arc: new scenes seen, a story card found and baked, the photograph out. */
  function arc2Save() {
    return makeSave({
      discoveredRecipes: [
        { recipeId: 'recipe_edies-oat-crisp' as never, discoveredAt: '2026-11-01T10:00:00.000Z' },
        { recipeId: 'recipe_lunchbox-window' as never, discoveredAt: '2026-11-02T10:00:00.000Z' },
      ],
      recipeBakeCounts: { ['recipe_lunchbox-window' as never]: 3, ['recipe_edies-oat-crisp' as never]: 1 },
      story: { seenSceneIds: ['scene_faded-box', 'scene_behind-cupboard', 'scene_edies-hand', 'scene_rs-lunchbox'] as never },
      decorating: {
        ownedDecorationIds: ['decoration_gingham-towel', 'decoration_fair-day-photograph'] as never,
        equippedBySlot: { textile: 'decoration_gingham-towel' as never, wall: 'decoration_fair-day-photograph' as never },
        noticedMomentIds: ['first-equip'],
      },
      achievementIds: ['achievement_last-page', 'achievement_kept-in-the-tin'] as never,
    })
  }

  it('needs no new save version: it fits the Interval 9 shape exactly', () => {
    expect(CURRENT_SAVE_VERSION).toBe(7)
    const save = arc2Save()
    expect(Object.keys(save).sort()).toEqual(Object.keys(makeSave()).sort())
  })

  it('round-trips through a save file unchanged', () => {
    const save = arc2Save()
    const result = readSaveFile(exportSave(save, FIXED_NOW).text)
    if (!result.ok) throw new Error(result.problem)
    expect(result.save).toEqual(save)
    expect(result.migratedFrom).toBeNull()
  })

  it('opens in an older-catalog copy of the game too: ids it doesn’t know are kept, not refused', () => {
    // The same shape with ids from a later interval than this build knows.
    const later = { ...arc2Save(), story: { seenSceneIds: ['scene_faded-box', 'scene_from-the-future'] } }
    const result = readSaveFile(fileWith(later))
    if (!result.ok) throw new Error(result.problem)
    expect(result.save.story.seenSceneIds).toEqual(['scene_faded-box', 'scene_from-the-future'])
  })
})

describe('Interval 11 content in a save file', () => {
  it('carries the new jars, cards, mastery, favourites and memories there and back, with no version change', () => {
    let save = makeSave({ favoriteRecipeIds: [] })
    const sandie = [FLOUR, SUGAR, BUTTER, VANILLA, PECAN]
    for (let n = 0; n < 3; n++) save = recordBake(save, bake(sandie), new Date(`2026-11-0${n + 1}T10:00:00.000Z`), `creation_${n}` as CreationId).save
    save = recordBake(save, bake([CHOCOLATE_CHIPS, MARSHMALLOW, COCONUT, PECAN]), new Date('2026-11-04T10:00:00.000Z'), 'creation_rr' as CreationId).save
    save = { ...save, favoriteRecipeIds: ['recipe_pecan-sandie' as never] }

    const result = readSaveFile(exportSave(save, FIXED_NOW).text)
    if (!result.ok) throw new Error(result.message)
    expect(result.migratedFrom).toBeNull()
    expect(result.save).toEqual(save)
    expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.save.recipeBakeCounts).toMatchObject({ 'recipe_pecan-sandie': 3, 'recipe_rocky-road': 1 })
    expect(result.summary).toMatchObject({ recipeCount: 2, memoryCount: 4 })
  })
})
