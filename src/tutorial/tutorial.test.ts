import { describe, expect, it } from 'vitest'
import { bake, recordBake } from '../domain/baking'
import type { CreationId } from '../domain/ids'
import { BUTTER, EGG, FLOUR, SUGAR } from '../domain/ingredients'
import { makeNewKitchen } from '../test/fixtures'
import { tutorialLine } from './lines'
import { advance, isTutorialBowl, START, STEP_DEFINITIONS, TUTORIAL_BOWL, TUTORIAL_STEPS, type TutorialRun } from './tutorial'

const at = (step: TutorialRun['step']): TutorialRun => ({ step, outcome: null })
const outcome = () => recordBake(makeNewKitchen(), bake(TUTORIAL_BOWL), new Date('2026-05-01T00:00:00Z'), 'creation_t' as CreationId).outcome

describe('tutorial steps', () => {
  it('is short: nine cards, starting in the kitchen and finishing in the pantry', () => {
    expect(TUTORIAL_STEPS).toHaveLength(9)
    expect(STEP_DEFINITIONS[TUTORIAL_STEPS[0]!].route).toBe('kitchen')
    expect(STEP_DEFINITIONS[TUTORIAL_STEPS.at(-1)!].route).toBe('pantry')
  })

  it('moves past talking cards on Next and ends after the last', () => {
    expect(advance(START, { type: 'next' })).toEqual(at('story'))
    expect(advance(at('finish'), { type: 'next' })).toBeNull()
  })

  it('ignores Next on cards that wait for the player', () => {
    for (const step of ['pick', 'mix', 'bake'] as const) expect(advance(at(step), { type: 'next' })).toEqual(at(step))
  })

  it('waits for exactly flour, sugar and butter, in any order, then for mixing', () => {
    expect(advance(at('pick'), { type: 'bowl', bowl: [FLOUR, SUGAR], mixed: false })).toEqual(at('pick'))
    expect(advance(at('pick'), { type: 'bowl', bowl: [BUTTER, FLOUR, SUGAR], mixed: false })).toEqual(at('mix'))
    expect(advance(at('mix'), { type: 'bowl', bowl: [BUTTER, FLOUR, SUGAR], mixed: true })).toEqual(at('bake'))
    // Changing the bowl goes back a step.
    expect(advance(at('bake'), { type: 'bowl', bowl: [BUTTER, FLOUR, SUGAR, EGG], mixed: false })).toEqual(at('pick'))
    expect(isTutorialBowl([SUGAR, BUTTER, FLOUR])).toBe(true)
  })

  it('moves on to the discovery only from the oven step, keeping what came out', () => {
    const baked = outcome()
    expect(advance(at('bake'), { type: 'baked', outcome: baked })).toEqual({ step: 'discovered', outcome: baked })
    expect(advance(at('welcome'), { type: 'baked', outcome: baked })).toEqual(at('welcome'))
  })

  it('ignores the bowl outside the baking steps', () => {
    expect(advance(at('book'), { type: 'bowl', bowl: [FLOUR], mixed: false })).toEqual(at('book'))
  })
})

describe('what Marmalade says', () => {
  it('keeps every card to a couple of sentences', () => {
    const save = makeNewKitchen()
    for (const step of TUTORIAL_STEPS) {
      const line = tutorialLine({ step, outcome: step === 'discovered' ? outcome() : null }, save)
      expect(line.length, step).toBeLessThanOrEqual(200)
      expect(line.split(/[.!?](?:\s|$)/).filter((part) => part.trim().length > 1).length, step).toBeLessThanOrEqual(4)
    }
  })

  it('reads the reward from the bake, and admits when a replay earned nothing', () => {
    const save = makeNewKitchen()
    expect(tutorialLine({ step: 'discovered', outcome: outcome() }, save)).toContain('15 Crumbs and 20 XP')
    const replay = { ...outcome(), newDiscovery: false, reward: null }
    expect(tutorialLine({ step: 'discovered', outcome: replay }, save)).toContain('no new Crumbs')
  })
})
