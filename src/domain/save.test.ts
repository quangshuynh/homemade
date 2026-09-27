import { describe, expect, it } from 'vitest'
import { FIXED_NOW, makeSave } from '../test/fixtures'
import { defineId, isIdOf } from './ids'
import { STARTER_PANTRY } from './ingredients'
import { CURRENT_SAVE_VERSION, createNewSave, DEFAULT_SETTINGS, NAME_MAX_LENGTH, touchSave, updateSettings, validateName } from './save'

describe('createNewSave', () => {
  it('creates a versioned save with the player and bakery names', () => {
    const save = createNewSave({ playerName: 'Robin', bakeryName: 'Crumb & Co.' }, FIXED_NOW)

    expect(save.version).toBe(CURRENT_SAVE_VERSION)
    expect(save.profile.name).toBe('Robin')
    expect(save.profile.bakeryName).toBe('Crumb & Co.')
    expect(save.discoveredRecipes).toEqual([])
    expect(save.pantryIngredientIds).toEqual(STARTER_PANTRY)
    expect(save.settings).toEqual(DEFAULT_SETTINGS)
    expect(save.createdAt).toBe('2026-03-14T09:30:00.000Z')
    expect(save.updatedAt).toBe(save.createdAt)
  })

  it('gives the player a stable, prefixed id that is not derived from their name', () => {
    const a = createNewSave({ playerName: 'Robin', bakeryName: 'One' })
    const b = createNewSave({ playerName: 'Robin', bakeryName: 'One' })

    expect(isIdOf('player', a.profile.id)).toBe(true)
    expect(a.profile.id).not.toBe(b.profile.id)
    expect(a.profile.id).not.toContain('Robin')
  })

  it('tidies whitespace in names', () => {
    const save = createNewSave({ playerName: '  Robin   Q  ', bakeryName: '\tThe  Crumb Corner ' })

    expect(save.profile.name).toBe('Robin Q')
    expect(save.profile.bakeryName).toBe('The Crumb Corner')
  })

  it('refuses blank or overlong names', () => {
    expect(() => createNewSave({ playerName: '   ', bakeryName: 'Fine' })).toThrow()
    expect(() => createNewSave({ playerName: 'Fine', bakeryName: 'x'.repeat(NAME_MAX_LENGTH + 1) })).toThrow()
  })

  it('does not share the default settings object between saves', () => {
    const save = createNewSave({ playerName: 'A', bakeryName: 'B' })
    save.settings.soundEnabled = false
    expect(DEFAULT_SETTINGS.soundEnabled).toBe(true)
  })
})

describe('validateName', () => {
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['x'.repeat(NAME_MAX_LENGTH + 1), 'too-long'],
    ['Robin', null],
    ['x'.repeat(NAME_MAX_LENGTH), null],
  ])('validateName(%j) is %s', (input, expected) => {
    expect(validateName(input)).toBe(expected)
  })
})

describe('touchSave', () => {
  it('applies the change and stamps updatedAt, leaving createdAt alone', () => {
    const save = makeSave()
    const later = new Date('2026-03-15T10:00:00.000Z')

    const next = touchSave(save, (s) => updateSettings(s, { soundEnabled: false }), later)

    expect(next.settings.soundEnabled).toBe(false)
    expect(next.updatedAt).toBe(later.toISOString())
    expect(next.createdAt).toBe(save.createdAt)
    expect(save.settings.soundEnabled).toBe(true)
  })
})

describe('defineId', () => {
  it('builds readable ids for authored content', () => {
    expect(defineId('recipe', 'butter-cookie')).toBe('recipe_butter-cookie')
  })

  it('rejects slugs that would make unstable ids', () => {
    expect(() => defineId('recipe', 'Butter Cookie')).toThrow()
  })
})
