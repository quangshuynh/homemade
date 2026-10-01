import { describe, expect, it } from 'vitest'
import { makeNewKitchen, makeSave } from '../test/fixtures'
import { bake, recordBake, type Bowl } from './baking'
import { defineId, type CreationId, type IngredientId } from './ids'
import {
  BUTTER,
  CHOCOLATE_CHIPS,
  CINNAMON,
  COCOA,
  EGG,
  FLOUR,
  HONEY,
  INGREDIENTS,
  OATS,
  PEANUT_BUTTER,
  STARTER_PANTRY,
  SUGAR,
  VANILLA,
} from './ingredients'
import {
  discoveryReward,
  findUnlock,
  INGREDIENT_UNLOCK_XP,
  INGREDIENT_UNLOCKS,
  LEVEL_THRESHOLDS,
  levelForXp,
  levelProgress,
  levelUpBetween,
  MAX_LEVEL,
  nextUnlock,
  RARITIES,
  RARITY_REWARDS,
  unlockIngredient,
  unlockStatus,
} from './progression'
import { findRecipeById, RECIPES } from './recipes'
import { endTutorial, tutorialPending } from './save'
import type { GameSave } from './types'

const NOW = new Date('2026-05-01T12:00:00.000Z')
const creation = (n: number) => `creation_${n}` as CreationId
const SHORTBREAD: Bowl = [FLOUR, SUGAR, BUTTER]

function bakeInto(save: GameSave, bowl: Bowl, n = 1) {
  return recordBake(save, bake(bowl), NOW, creation(n))
}

describe('rarity', () => {
  it('gives every recipe a known rarity', () => {
    for (const recipe of RECIPES) expect(RARITIES, recipe.name).toContain(recipe.rarity)
  })

  it('keeps high rarities genuinely uncommon', () => {
    const count = (rarity: string) => RECIPES.filter((recipe) => recipe.rarity === rarity).length
    expect(count('common')).toBeGreaterThanOrEqual(count('uncommon'))
    expect(count('uncommon')).toBeGreaterThanOrEqual(count('rare'))
    expect(count('epic')).toBeLessThanOrEqual(2)
    expect(count('legendary')).toBeLessThanOrEqual(1)
    expect(count('mythic')).toBeLessThanOrEqual(1)
  })

  it('makes the tutorial recipe and the rest of the starter pantry grounded', () => {
    expect(findRecipeById(defineId('recipe', 'shortbread'))?.rarity).toBe('common')
    const fromStarter = RECIPES.filter((recipe) => recipe.ingredientIds.every((id) => STARTER_PANTRY.includes(id)))
    expect(fromStarter.length).toBeGreaterThanOrEqual(2)
    for (const recipe of fromStarter) expect(['common', 'uncommon']).toContain(recipe.rarity)
  })

  it('is part of the recipe: the same recipe is the same rarity every bake', () => {
    const first = bakeInto(makeSave(), SHORTBREAD, 1)
    const again = bakeInto(first.save, [BUTTER, SUGAR, FLOUR], 2)
    expect(first.outcome.result.kind === 'recipe' && first.outcome.result.recipe.rarity).toBe('common')
    expect(again.outcome.result.kind === 'recipe' && again.outcome.result.recipe.rarity).toBe('common')
  })

  it('has a reward for every rarity, rising with rarity', () => {
    for (let index = 1; index < RARITIES.length; index++) {
      const lower = RARITY_REWARDS[RARITIES[index - 1]!]
      const higher = RARITY_REWARDS[RARITIES[index]!]
      expect(higher.crumbs).toBeGreaterThan(lower.crumbs)
      expect(higher.xp).toBeGreaterThan(lower.xp)
    }
  })
})

describe('discovery rewards', () => {
  it('pays Crumbs and XP for a first discovery, matching its rarity', () => {
    const { save, outcome } = bakeInto(makeNewKitchen(), SHORTBREAD)
    expect(outcome.reward).toEqual({ rarity: 'common', ...RARITY_REWARDS.common })
    expect(save.progression).toEqual({ crumbs: RARITY_REWARDS.common.crumbs, xp: RARITY_REWARDS.common.xp })
  })

  it('pays nothing for baking the same recipe again', () => {
    const first = bakeInto(makeNewKitchen(), SHORTBREAD, 1)
    const again = bakeInto(first.save, SHORTBREAD, 2)
    expect(again.outcome.reward).toBeNull()
    expect(again.outcome.levelUp).toBeNull()
    expect(again.save.progression).toEqual(first.save.progression)
    // The rebake is still remembered.
    expect(again.save.bakedCreations).toHaveLength(2)
  })

  it('pays nothing for a Kitchen Experiment', () => {
    const { save, outcome } = bakeInto(makeNewKitchen(), [FLOUR, VANILLA])
    expect(outcome.result.kind).toBe('experiment')
    expect(outcome.reward).toBeNull()
    expect(save.progression).toEqual({ crumbs: 0, xp: 0 })
    expect(save.bakedCreations).toHaveLength(1)
  })

  it('pays each recipe’s reward from the domain, for every recipe', () => {
    for (const recipe of RECIPES) {
      const { outcome } = bakeInto(makeSave(), recipe.ingredientIds)
      expect(outcome.reward, recipe.name).toEqual(discoveryReward(recipe))
    }
  })

  it('notices the first recipe of each rarity, and only the first', () => {
    const first = bakeInto(makeNewKitchen(), SHORTBREAD, 1)
    expect(first.outcome.firstOfRarity).toBe(true)
    const secondCommon = bakeInto(first.save, [FLOUR, SUGAR, BUTTER, EGG], 2)
    expect(secondCommon.outcome.firstOfRarity).toBe(false)
    const firstUncommon = bakeInto(secondCommon.save, [FLOUR, SUGAR, BUTTER, EGG, VANILLA], 3)
    expect(firstUncommon.outcome.firstOfRarity).toBe(true)
  })

  it('reports a level-up when a discovery crosses a level, naming what it opens up', () => {
    let save = makeNewKitchen()
    save = bakeInto(save, SHORTBREAD, 1).save // 20 XP
    const { outcome } = bakeInto(save, [FLOUR, SUGAR, BUTTER, EGG], 2) // 40 XP: Level 2
    expect(outcome.levelUp).toEqual({ from: 1, to: 2, newlyAvailable: [CHOCOLATE_CHIPS, CINNAMON] })
  })
})

describe('Baker Levels', () => {
  it('starts at Level 1 and tops out at Level 10', () => {
    expect(levelForXp(0)).toBe(1)
    expect(MAX_LEVEL).toBe(10)
    expect(levelForXp(1_000_000)).toBe(MAX_LEVEL)
  })

  it('has hand-authored thresholds that strictly rise from zero', () => {
    expect(LEVEL_THRESHOLDS[0]).toBe(0)
    for (let index = 1; index < LEVEL_THRESHOLDS.length; index++) {
      expect(LEVEL_THRESHOLDS[index]!).toBeGreaterThan(LEVEL_THRESHOLDS[index - 1]!)
    }
  })

  it('levels up exactly on the boundary, not a point before', () => {
    LEVEL_THRESHOLDS.forEach((threshold, index) => {
      expect(levelForXp(threshold)).toBe(index + 1)
      if (threshold > 0) expect(levelForXp(threshold - 1)).toBe(index)
    })
  })

  it('reports a jump across several levels as one level-up', () => {
    expect(levelUpBetween(0, LEVEL_THRESHOLDS[3]!, STARTER_PANTRY)).toEqual({
      from: 1,
      to: 4,
      newlyAvailable: INGREDIENT_UNLOCKS.filter((unlock) => unlock.level <= 4).map((unlock) => unlock.ingredientId),
    })
    expect(levelUpBetween(50, 60, STARTER_PANTRY)).toBeNull()
  })

  it('leaves owned ingredients out of what a level-up announces', () => {
    expect(levelUpBetween(0, 40, [...STARTER_PANTRY, CHOCOLATE_CHIPS])?.newlyAvailable).toEqual([CINNAMON])
  })

  it('derives level and progress from saved XP alone', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xp: 0, nextLevelXp: 40, fraction: 0 })
    expect(levelProgress(70)).toEqual({ level: 2, xp: 70, nextLevelXp: 100, fraction: 0.5 })
    expect(levelProgress(LEVEL_THRESHOLDS.at(-1)! + 5)).toMatchObject({ level: MAX_LEVEL, nextLevelXp: null, fraction: 1 })
  })

  it('never goes down: no bake or unlock lowers XP', () => {
    let save = makeNewKitchen()
    const levels: number[] = []
    for (const [n, bowl] of [SHORTBREAD, [FLOUR, VANILLA], SHORTBREAD, [FLOUR, SUGAR, BUTTER, EGG]].entries()) {
      save = bakeInto(save, bowl as Bowl, n).save
      levels.push(levelForXp(save.progression.xp))
    }
    const unlocked = unlockIngredient(save, CHOCOLATE_CHIPS)
    if (unlocked.ok) levels.push(levelForXp(unlocked.save.progression.xp))
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })
})

describe('ingredient unlocks', () => {
  const withProgress = (crumbs: number, xp: number) => makeNewKitchen({ progression: { crumbs, xp } })

  it('starts a new kitchen with exactly the starter pantry', () => {
    expect(makeNewKitchen().pantryIngredientIds).toEqual([FLOUR, SUGAR, BUTTER, EGG, VANILLA])
  })

  it('covers every ingredient: each is either a starter or a pantry addition, never both', () => {
    for (const ingredient of INGREDIENTS) {
      const starter = STARTER_PANTRY.includes(ingredient.id)
      expect(starter !== Boolean(findUnlock(ingredient.id)), ingredient.name).toBe(true)
    }
  })

  it('needs the right level', () => {
    const save = withProgress(500, 0)
    expect(unlockStatus(save, CHOCOLATE_CHIPS)).toMatchObject({ kind: 'needs-level', level: 1, unlock: { level: 2 } })
    expect(unlockIngredient(save, CHOCOLATE_CHIPS)).toEqual({ ok: false, reason: 'level' })
  })

  it('needs enough Crumbs, and says how many more', () => {
    const save = withProgress(5, 40)
    expect(unlockStatus(save, CHOCOLATE_CHIPS)).toMatchObject({ kind: 'needs-crumbs', short: 15 })
    expect(unlockIngredient(save, CHOCOLATE_CHIPS)).toEqual({ ok: false, reason: 'crumbs' })
  })

  it('takes the Crumbs once, adds the ingredient for good and gives the small XP thank-you, in one save', () => {
    const save = withProgress(50, 40)
    const result = unlockIngredient(save, CHOCOLATE_CHIPS)
    if (!result.ok) throw new Error(result.reason)

    expect(result.save.pantryIngredientIds).toEqual([...STARTER_PANTRY, CHOCOLATE_CHIPS])
    expect(result.save.progression).toEqual({ crumbs: 30, xp: 40 + INGREDIENT_UNLOCK_XP })
    expect(result).toMatchObject({ spent: 20, xp: INGREDIENT_UNLOCK_XP })
    // The original is untouched: nothing was half-applied.
    expect(save.pantryIngredientIds).toEqual([...STARTER_PANTRY])
    expect(save.progression).toEqual({ crumbs: 50, xp: 40 })
  })

  it('can’t be bought twice', () => {
    const once = unlockIngredient(withProgress(100, 40), CHOCOLATE_CHIPS)
    if (!once.ok) throw new Error(once.reason)
    expect(unlockIngredient(once.save, CHOCOLATE_CHIPS)).toEqual({ ok: false, reason: 'owned' })
    expect(once.save.pantryIngredientIds.filter((id) => id === CHOCOLATE_CHIPS)).toHaveLength(1)
  })

  it('refuses starter and unknown ingredients', () => {
    expect(unlockIngredient(withProgress(999, 999), FLOUR)).toEqual({ ok: false, reason: 'owned' })
    expect(unlockIngredient(withProgress(999, 999), defineId('ingredient', 'saffron'))).toEqual({ ok: false, reason: 'not-for-sale' })
  })

  it('stays owned through any amount of baking afterwards', () => {
    const result = unlockIngredient(withProgress(100, 40), CHOCOLATE_CHIPS)
    if (!result.ok) throw new Error(result.reason)
    let save = result.save
    for (let n = 0; n < 60; n++) save = bakeInto(save, [FLOUR, CHOCOLATE_CHIPS], n).save
    expect(save.pantryIngredientIds).toContain(CHOCOLATE_CHIPS)
  })

  it('reports a level-up when the unlock’s XP crosses a level', () => {
    const result = unlockIngredient(withProgress(100, 95), CHOCOLATE_CHIPS)
    if (!result.ok) throw new Error(result.reason)
    expect(result.levelUp).toEqual({ from: 2, to: 3, newlyAvailable: [OATS, COCOA] })
  })

  it('points at the next thing to aim for', () => {
    expect(nextUnlock(makeNewKitchen())?.ingredientId).toBe(CHOCOLATE_CHIPS)
    expect(nextUnlock(makeSave())).toBeNull()
  })

  it('never takes away anything an older kitchen already owned', () => {
    // An established kitchen owns everything, at level 1 with no Crumbs: nothing is locked for it.
    const veteran = makeSave({ progression: { crumbs: 0, xp: 0 } })
    for (const unlock of INGREDIENT_UNLOCKS) expect(unlockStatus(veteran, unlock.ingredientId)).toEqual({ kind: 'owned' })
  })
})

describe('balance', () => {
  /**
   * The best a player can be doing with a given set of pantry additions:
   * every recipe those ingredients allow discovered, every addition paid for.
   * Discovering is always possible once the ingredients are owned, so if
   * this state has no affordable next step, a player could truly be stuck.
   */
  function bestCase(added: readonly IngredientId[]): GameSave {
    let save = makeNewKitchen()
    for (const id of added) {
      const unlock = findUnlock(id)!
      save = {
        ...save,
        pantryIngredientIds: [...save.pantryIngredientIds, id],
        progression: { crumbs: save.progression.crumbs - unlock.crumbs, xp: save.progression.xp + INGREDIENT_UNLOCK_XP },
      }
    }
    for (const recipe of RECIPES) {
      if (recipe.ingredientIds.every((id) => save.pantryIngredientIds.includes(id))) {
        const reward = discoveryReward(recipe)
        save = { ...save, progression: { crumbs: save.progression.crumbs + reward.crumbs, xp: save.progression.xp + reward.xp } }
      }
    }
    return save
  }

  it('can never leave a player stuck, whatever order they add ingredients in', () => {
    const all = INGREDIENT_UNLOCKS.map((unlock) => unlock.ingredientId)
    const seen = new Set<string>()
    const queue: IngredientId[][] = [[]]
    const stuck: string[] = []
    while (queue.length > 0) {
      const added = queue.shift()!
      const key = [...added].sort().join()
      if (seen.has(key)) continue
      seen.add(key)
      const save = bestCase(added)
      const next = all.filter((id) => unlockStatus(save, id).kind === 'available')
      if (added.length < all.length && next.length === 0) stuck.push(key)
      for (const id of next) queue.push([...added, id])
    }
    expect(stuck).toEqual([])
    // And the whole pantry is reachable.
    expect(seen.has([...all].sort().join())).toBe(true)
  })

  it('reaches the top level exactly by finding every recipe and filling the pantry', () => {
    const complete = bestCase(INGREDIENT_UNLOCKS.map((unlock) => unlock.ingredientId))
    expect(levelForXp(complete.progression.xp)).toBe(MAX_LEVEL)
    expect(complete.progression.crumbs).toBeGreaterThanOrEqual(0)
  })

  it('lets the starter pantry alone reach Level 2 and the first additions', () => {
    const starter = bestCase([])
    expect(levelForXp(starter.progression.xp)).toBeGreaterThanOrEqual(2)
    expect(unlockStatus(starter, CHOCOLATE_CHIPS).kind).toBe('available')
  })

  it('keeps the late ingredients late', () => {
    expect(findUnlock(HONEY)!.level).toBeGreaterThan(findUnlock(PEANUT_BUTTER)!.level)
    expect(findUnlock(PEANUT_BUTTER)!.level).toBeGreaterThan(findUnlock(CHOCOLATE_CHIPS)!.level)
  })
})

describe('tutorial state', () => {
  it('is pending for a brand-new kitchen and not for an established one', () => {
    expect(tutorialPending(makeNewKitchen())).toBe(true)
    expect(tutorialPending(makeSave())).toBe(false)
  })

  it('finishing or skipping stops it starting again, and changes nothing else', () => {
    const fresh = makeNewKitchen()
    const finished = endTutorial(fresh, 'finished')
    const skipped = endTutorial(fresh, 'skipped')
    expect(finished.tutorial).toEqual({ completed: true, skipped: false })
    expect(skipped.tutorial).toEqual({ completed: false, skipped: true })
    for (const save of [finished, skipped]) {
      expect(tutorialPending(save)).toBe(false)
      expect(save.progression).toEqual(fresh.progression)
      expect(save.pantryIngredientIds).toEqual(fresh.pantryIngredientIds)
    }
  })

  it('a skipped replay never un-completes it', () => {
    const done = endTutorial(makeNewKitchen(), 'finished')
    expect(endTutorial(done, 'skipped').tutorial.completed).toBe(true)
    expect(endTutorial(done, 'finished')).toBe(done)
  })
})
