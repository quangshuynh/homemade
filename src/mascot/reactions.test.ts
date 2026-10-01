import { describe, expect, it } from 'vitest'
import { bake, recordBake, type Bowl } from '../domain/baking'
import type { CreationId } from '../domain/ids'
import { BUTTER, CHOCOLATE_CHIPS, EGG, FLOUR, OATS, SUGAR, VANILLA } from '../domain/ingredients'
import type { GameSave } from '../domain/types'
import { makeNewKitchen } from '../test/fixtures'
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
