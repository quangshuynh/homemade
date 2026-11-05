import { describe, expect, it } from 'vitest'
import type { KitchenBake } from '../app/gameContext'
import { bake, recordBake } from '../domain/baking'
import type { CreationId, RecipeId } from '../domain/ids'
import { BROWN_SUGAR, BUTTER, CHOCOLATE_CHIPS, COCONUT, EGG, FLOUR, SEA_SALT, SUGAR, WHITE_CHOCOLATE } from '../domain/ingredients'
import type { DecorationDefinition } from '../decorating/types'
import type { AchievementDefinition } from '../keepsakes/types'
import { makeSave } from '../test/fixtures'
import { bakeSoundCues, discoverySoundDelay, LEVEL_AFTER_CHIME_MS } from './reveal'

const NOW = new Date('2026-11-05T12:00:00.000Z')

function kitchenBake(bowl: Parameters<typeof bake>[0], extras: Partial<KitchenBake> = {}, found: string[] = [], counts = {}): KitchenBake {
  const save = makeSave({
    discoveredRecipes: found.map((id) => ({ recipeId: id as RecipeId, discoveredAt: NOW.toISOString() })),
    recipeBakeCounts: counts,
    progression: { crumbs: 0, xp: 1200 },
  })
  const { outcome } = recordBake(save, bake(bowl), NOW, 'creation_1' as CreationId)
  return { ...outcome, story: null, decor: [], keepsakes: { earned: [], first: false }, ...extras }
}

const keepsake = { earned: [{} as AchievementDefinition], first: false }
const ids = (cues: { id: string }[]) => cues.map((cue) => cue.id)

describe('the oven’s cue sheet', () => {
  it('only dings for an experiment or a plain rebake', () => {
    expect(bakeSoundCues(kitchenBake([FLOUR, EGG]), true)).toEqual([{ id: 'ding', at: 0 }])
    expect(bakeSoundCues(kitchenBake([FLOUR, SUGAR, BUTTER], {}, ['recipe_shortbread']), true)).toEqual([{ id: 'ding', at: 0 }])
  })

  it('rings a mastery stage on a rebake, and a keepsake after it', () => {
    const outcome = kitchenBake([FLOUR, SUGAR, BUTTER], { keepsakes: keepsake }, ['recipe_shortbread'], { recipe_shortbread: 2 })
    expect(outcome.masteryUp).toBe('familiar')
    expect(bakeSoundCues(outcome, false)).toEqual([
      { id: 'ding', at: 0 },
      { id: 'mastery-up', at: 700 },
      { id: 'achievement-unlock', at: 1400 },
    ])
  })

  it('chimes a first discovery’s rarity as the stamp lands, sooner with motion reduced', () => {
    const outcome = kitchenBake([FLOUR, SUGAR, BUTTER])
    expect(bakeSoundCues(outcome, false)).toEqual([
      { id: 'ding', at: 0 },
      { id: 'discover-common', at: discoverySoundDelay('common', false) },
    ])
    expect(bakeSoundCues(outcome, true)[1]).toEqual({ id: 'discover-common', at: 350 })
  })

  it('hushes a secret before its chime', () => {
    const cues = bakeSoundCues(kitchenBake([COCONUT, SUGAR, EGG, WHITE_CHOCOLATE]), false)
    expect(ids(cues)).toEqual(['ding', 'discover-secret', 'discover-rare'])
    expect(cues[1]!.at).toBeLessThan(cues[2]!.at)
  })

  it('orders a level, then the cupboard, then a keepsake, after the chime, each once', () => {
    const outcome = kitchenBake([FLOUR, BUTTER, BROWN_SUGAR, SEA_SALT, CHOCOLATE_CHIPS], {
      levelUp: { from: 10, to: 11, newlyAvailable: [] },
      decor: [{} as DecorationDefinition],
      keepsakes: keepsake,
    })
    const cues = bakeSoundCues(outcome, true)
    expect(ids(cues)).toEqual(['ding', 'discover-mythic', 'level-up', 'decor-unlock', 'achievement-unlock'])
    expect(cues.map((cue) => cue.at)).toEqual([...cues.map((cue) => cue.at)].sort((a, b) => a - b))
    expect(cues[2]!.at - cues[1]!.at).toBe(LEVEL_AFTER_CHIME_MS)
    expect(new Set(ids(cues)).size).toBe(cues.length)
  })
})
