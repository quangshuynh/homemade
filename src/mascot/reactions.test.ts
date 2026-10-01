import { describe, expect, it } from 'vitest'
import { bake, recordBake, type Bowl } from '../domain/baking'
import type { CreationId } from '../domain/ids'
import {
  BROWN_SUGAR,
  BUTTER,
  CHOCOLATE_CHIPS,
  CINNAMON,
  EGG,
  FLOUR,
  HONEY,
  LEMON,
  OATS,
  PISTACHIO,
  SEA_SALT,
  STRAWBERRY_JAM,
  SUGAR,
  VANILLA,
} from '../domain/ingredients'
import type { GameSave } from '../domain/types'
import { makeNewKitchen, makeSave } from '../test/fixtures'
import { describeLevelUp, discoveryReaction, unlockReaction } from './reactions'

let n = 0
function bakeInto(save: GameSave, bowl: Bowl) {
  return recordBake(save, bake(bowl), new Date('2026-05-01T00:00:00Z'), `creation_${n++}` as CreationId)
}

describe('Marmalade’s reactions', () => {
  it('stays quiet for ordinary bakes: rebakes, experiments, a second Common', () => {
    const first = bakeInto(makeNewKitchen(), [FLOUR, SUGAR, BUTTER])
    expect(discoveryReaction(bakeInto(first.save, [FLOUR, SUGAR, BUTTER]).outcome, 1)).toBeNull()
    expect(discoveryReaction(bakeInto(first.save, [FLOUR, VANILLA]).outcome, 1)).toBeNull()
    const noLevelUp = { ...first.save, progression: { crumbs: 0, xp: 0 } }
    expect(discoveryReaction(bakeInto(noLevelUp, [FLOUR, SUGAR, BUTTER, EGG]).outcome, 2)).toBeNull()
  })

  it('greets the very first card, a first of each rarer tier, and a new level', () => {
    const first = bakeInto(makeNewKitchen(), [FLOUR, SUGAR, BUTTER])
    expect(discoveryReaction(first.outcome, 1)?.line).toMatch(/first card/)
    const uncommon = bakeInto(first.save, [FLOUR, SUGAR, BUTTER, EGG, VANILLA])
    expect(discoveryReaction(uncommon.outcome, 2)).toEqual({ expression: 'excited', line: 'Uncommon! Now we’re getting somewhere.' })
    const levelled = bakeInto({ ...first.save, progression: { crumbs: 0, xp: 30 } }, [FLOUR, SUGAR, BUTTER, EGG])
    expect(discoveryReaction(levelled.outcome, 2)?.line).toBe('A new level! Look at you go.')
  })

  it('describes a level-up with what it opens up, once, however many levels', () => {
    expect(describeLevelUp({ from: 1, to: 3, newlyAvailable: [CHOCOLATE_CHIPS, OATS] })).toBe(
      'Baker Level 3! Chocolate chips and oats can go in the pantry now.',
    )
    expect(describeLevelUp({ from: 7, to: 8, newlyAvailable: [] })).toBe('Baker Level 8!')
  })

  it('cheers a new ingredient, and more so with a level', () => {
    expect(unlockReaction(CHOCOLATE_CHIPS, null)).toEqual({ expression: 'proud', line: 'Chocolate chips, on the shelf for good. I wonder what it goes with.' })
    expect(unlockReaction(CHOCOLATE_CHIPS, { from: 2, to: 3, newlyAvailable: [] }).expression).toBe('celebrate')
  })
})

describe('Marmalade’s Interval 6 milestones', () => {
  const stocked = () => makeSave()

  it('is starstruck for the first Mythic, above everything else', () => {
    const { outcome } = bakeInto(stocked(), [FLOUR, BUTTER, BROWN_SUGAR, SEA_SALT, CHOCOLATE_CHIPS])
    expect(discoveryReaction(outcome, 1)).toMatchObject({ expression: 'starstruck', line: expect.stringMatching(/^A Mythic\. In this kitchen\./) })
  })

  it('whispers about the first secret, even when it’s also a first of its rarity', () => {
    const { outcome } = bakeInto(stocked(), [FLOUR, BUTTER, PISTACHIO, HONEY, CINNAMON])
    expect(outcome).toMatchObject({ firstSecret: true, firstOfRarity: true })
    expect(discoveryReaction(outcome, 1)).toEqual({
      expression: 'surprised',
      line: 'Now that one isn’t written in any book I know. A secret! Let’s keep it between us.',
    })
  })

  it('cheers the first Legendary with its own line when it isn’t a secret', () => {
    const { outcome } = bakeInto(stocked(), [OATS, BUTTER, HONEY])
    expect(discoveryReaction(outcome, 1)).toEqual({ expression: 'celebrate', line: 'Legendary. Write that one down twice.' })
  })

  it('marks the first finished family, but not the next one', () => {
    const fruity = (ids: string[]) => ({ ...stocked(), discoveredRecipes: ids.map((recipeId) => ({ recipeId, discoveredAt: '2026-09-01T00:00:00Z' })) }) as GameSave
    const first = bakeInto(fruity(['recipe_jam-thumbprint', 'recipe_lemon-shortbread', 'recipe_vanilla-kiss']), [FLOUR, SUGAR, BUTTER, EGG, LEMON])
    expect(discoveryReaction(first.outcome, 4)?.line).toBe('Every Fruity card, back in the box. That’s a whole divider done.')
  })

  it('says something special for the very first pantry addition only', () => {
    expect(unlockReaction(STRAWBERRY_JAM, null, true).line).toBe('Strawberry jam! Your first addition. The shelf’s starting to look like yours.')
    expect(unlockReaction(STRAWBERRY_JAM, null, false).line).toBe('Strawberry jam, on the shelf for good. I wonder what it goes with.')
  })
})
