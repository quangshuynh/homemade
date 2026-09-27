import { describe, expect, it } from 'vitest'
import { bake, recordBake } from '../domain/baking'
import type { CreationId } from '../domain/ids'
import { CINNAMON, EGG, BUTTER, FLOUR, SUGAR } from '../domain/ingredients'
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
