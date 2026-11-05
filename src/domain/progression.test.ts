import { describe, expect, it } from 'vitest'
import { makeNewKitchen, makeSave } from '../test/fixtures'
import { bake, recordBake, type Bowl } from './baking'
import { defineId, type CreationId, type IngredientId } from './ids'
import {
  BROWN_SUGAR,
  BUTTER,
  CHOCOLATE_CHIPS,
  CINNAMON,
  COCOA,
  COCONUT,
  EGG,
  ESPRESSO,
  FLOUR,
  GINGER,
  HONEY,
  INGREDIENTS,
  MARSHMALLOW,
  OATS,
  ORANGE,
  PEANUT_BUTTER,
  PECAN,
  PISTACHIO,
  SEA_SALT,
  STARTER_PANTRY,
  STRAWBERRY_JAM,
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
    // Interval 11 added two Epics and no Legendary; the top three tiers stay under a fifth of the book.
    expect(count('epic')).toBeLessThanOrEqual(6)
    expect(count('legendary')).toBeLessThanOrEqual(2)
    expect((count('epic') + count('legendary') + count('mythic')) / RECIPES.length).toBeLessThan(0.2)
    expect(count('mythic')).toBe(1)
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

  it('never pays twice for any recipe in the catalog, whatever order it’s baked in', () => {
    for (const recipe of RECIPES) {
      const first = bakeInto(makeSave(), recipe.ingredientIds, 1)
      const again = bakeInto(first.save, [...recipe.ingredientIds].reverse(), 2)
      expect(again.outcome.reward, recipe.name).toBeNull()
      expect(again.outcome.levelUp, recipe.name).toBeNull()
      expect(again.save.progression, recipe.name).toEqual(first.save.progression)
    }
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
  it('starts at Level 1 and tops out at Level 11', () => {
    expect(levelForXp(0)).toBe(1)
    expect(MAX_LEVEL).toBe(11)
    expect(levelForXp(1_000_000)).toBe(MAX_LEVEL)
  })

  it('keeps Interval 5’s first ten levels exactly, so nobody’s level moves', () => {
    expect(LEVEL_THRESHOLDS.slice(0, 10)).toEqual([0, 40, 100, 170, 250, 340, 440, 560, 700, 850])
  })

  it('only adds levels that open something: Level 11 is for sea salt', () => {
    for (let level = 11; level <= MAX_LEVEL; level++) {
      expect(INGREDIENT_UNLOCKS.some((unlock) => unlock.level === level), `Level ${level}`).toBe(true)
    }
    expect(findUnlock(SEA_SALT)!.level).toBe(MAX_LEVEL)
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
    expect(result.levelUp).toEqual({ from: 2, to: 3, newlyAvailable: [STRAWBERRY_JAM, OATS, COCOA] })
  })

  it('points at the next thing to aim for', () => {
    expect(nextUnlock(makeNewKitchen())?.ingredientId).toBe(CHOCOLATE_CHIPS)
    expect(nextUnlock(makeSave())).toBeNull()
  })

  it('makes nothing available before its level, and everything at it', () => {
    for (const unlock of INGREDIENT_UNLOCKS) {
      const threshold = LEVEL_THRESHOLDS[unlock.level - 1]!
      expect(unlockStatus(withProgress(9999, threshold - 1), unlock.ingredientId).kind, unlock.ingredientId).toBe('needs-level')
      expect(unlockStatus(withProgress(9999, threshold), unlock.ingredientId).kind, unlock.ingredientId).toBe('available')
    }
  })

  it('never takes away anything an older kitchen already owned', () => {
    // An established kitchen owns everything, at level 1 with no Crumbs: nothing is locked for it.
    const veteran = makeSave({ progression: { crumbs: 0, xp: 0 } })
    for (const unlock of INGREDIENT_UNLOCKS) expect(unlockStatus(veteran, unlock.ingredientId)).toEqual({ kind: 'owned' })
  })
})

describe('balance', () => {
  /** Everything the catalog had through Interval 4: what an upgraded kitchen already owns. */
  const INTERVAL_4_PANTRY = INGREDIENTS.slice(0, 12).map((ingredient) => ingredient.id)
  const INTERVAL_4_RECIPES = RECIPES.slice(0, 12)

  /** The cards Interval 11 added. */
  const INTERVAL_11_RECIPE_IDS = new Set(
    [
      'gingersnap',
      'pecan-sandie',
      'chocolate-orange',
      'orange-ginger-thin',
      'mocha-crinkle',
      'coffee-kiss',
      'maple-pecan',
      'salted-peanut-butter',
      'orange-biscotti',
      'marshmallow-puff',
      'campfire-smore',
      'salted-pecan-turtle',
      'rocky-road',
    ].map((slug) => defineId('recipe', slug)),
  )

  const NEW_KITCHEN = makeNewKitchen()
  /**
   * The hardest place to start from: a kitchen upgraded from Interval 4 with
   * its whole book already found. It owns the old twelve ingredients, its XP
   * is that book's worth, and the upgrade gave it no Crumbs (back then it
   * had nothing to buy).
   */
  const VETERAN = makeNewKitchen({
    pantryIngredientIds: INTERVAL_4_PANTRY,
    discoveredRecipes: INTERVAL_4_RECIPES.map((recipe) => ({ recipeId: recipe.id, discoveredAt: NOW.toISOString() })),
    progression: { crumbs: 0, xp: INTERVAL_4_RECIPES.reduce((total, recipe) => total + discoveryReward(recipe).xp, 0) },
    tutorial: { completed: true, skipped: false },
  })

  /**
   * The best a player can be doing from `start` with a given set of pantry
   * additions: every recipe those ingredients allow discovered, every
   * addition paid for. Secrets are left out on purpose: progression must
   * never depend on finding one. Discovering is always possible once the
   * ingredients are owned, so if this state has no affordable next step, a
   * player could truly be stuck.
   */
  function bestCase(start: GameSave, added: readonly IngredientId[]): GameSave {
    let save = start
    for (const id of added) {
      const unlock = findUnlock(id)!
      save = {
        ...save,
        pantryIngredientIds: [...save.pantryIngredientIds, id],
        progression: { crumbs: save.progression.crumbs - unlock.crumbs, xp: save.progression.xp + INGREDIENT_UNLOCK_XP },
      }
    }
    const found = new Set(save.discoveredRecipes.map((entry) => entry.recipeId))
    for (const recipe of RECIPES) {
      if (recipe.isSecret || found.has(recipe.id)) continue
      if (recipe.ingredientIds.every((id) => save.pantryIngredientIds.includes(id))) {
        const reward = discoveryReward(recipe)
        save = { ...save, progression: { crumbs: save.progression.crumbs + reward.crumbs, xp: save.progression.xp + reward.xp } }
      }
    }
    return save
  }

  /**
   * Every pantry reachable from `start`, in every order of additions, and any
   * with no way forward. Where a player stands depends only on *which*
   * additions they've made, never the order (bestCase sums them), so each
   * set is worked out once, as a bitmask over the additions still to make.
   * That keeps the search exhaustive at nineteen additions (up to 2^19 sets)
   * without walking every one of the orders that lead to each.
   */
  function explore(start: GameSave) {
    const all = INGREDIENT_UNLOCKS.filter((unlock) => !start.pantryIngredientIds.includes(unlock.ingredientId))
    const bit = new Map(all.map((unlock, index) => [unlock.ingredientId, 1 << index]))
    const found = new Set(start.discoveredRecipes.map((entry) => entry.recipeId))
    // Each recipe that could still pay out, with the additions it waits on.
    const payable = RECIPES.filter((recipe) => !recipe.isSecret && !found.has(recipe.id))
      .filter((recipe) => recipe.ingredientIds.every((id) => start.pantryIngredientIds.includes(id) || bit.has(id)))
      .map((recipe) => ({ needs: recipe.ingredientIds.reduce((mask, id) => mask | (bit.get(id) ?? 0), 0), reward: discoveryReward(recipe) }))

    const standing = (mask: number) => {
      let { crumbs, xp } = start.progression
      all.forEach((unlock, index) => {
        if (mask & (1 << index)) {
          crumbs -= unlock.crumbs
          xp += INGREDIENT_UNLOCK_XP
        }
      })
      for (const recipe of payable) {
        if ((recipe.needs & mask) === recipe.needs) {
          crumbs += recipe.reward.crumbs
          xp += recipe.reward.xp
        }
      }
      return { crumbs, xp }
    }
    const nameOf = (mask: number) =>
      all
        .filter((_, index) => mask & (1 << index))
        .map((unlock) => unlock.ingredientId)
        .sort()
        .join()

    const full = (1 << all.length) - 1
    const seen = new Uint8Array(full + 1)
    const queue = [0]
    seen[0] = 1
    const stuck: string[] = []
    let visited = 0
    for (let head = 0; head < queue.length; head++) {
      const mask = queue[head]!
      visited++
      const { crumbs, xp } = standing(mask)
      const level = levelForXp(xp)
      let moves = 0
      all.forEach((unlock, index) => {
        const next = mask | (1 << index)
        if (next === mask || level < unlock.level || crumbs < unlock.crumbs) return
        moves++
        if (!seen[next]) {
          seen[next] = 1
          queue.push(next)
        }
      })
      if (mask !== full && moves === 0) stuck.push(`${nameOf(mask)} (${crumbs} Crumbs, ${xp} XP)`)
    }
    return { visited, stuck, reachedEverything: seen[full] === 1, standing, bit }
  }

  /**
   * The newest hard case: an Interval 10 kitchen that owns all nineteen of
   * the old ingredients and has found every card they make, but spent every
   * Crumb (on the cupboard, say). The Interval 11 jars are new to it.
   */
  const INTERVAL_10_PANTRY = INGREDIENTS.slice(0, 19).map((ingredient) => ingredient.id)
  const INTERVAL_10_RECIPES = RECIPES.filter(
    (recipe) => !recipe.isSecret && recipe.ingredientIds.every((id) => INTERVAL_10_PANTRY.includes(id)) && !INTERVAL_11_RECIPE_IDS.has(recipe.id),
  )
  const INTERVAL_10_KITCHEN = makeNewKitchen({
    pantryIngredientIds: INTERVAL_10_PANTRY,
    discoveredRecipes: INTERVAL_10_RECIPES.map((recipe) => ({ recipeId: recipe.id, discoveredAt: NOW.toISOString() })),
    progression: { crumbs: 0, xp: INTERVAL_10_RECIPES.reduce((total, recipe) => total + discoveryReward(recipe).xp, 0) },
    tutorial: { completed: true, skipped: false },
  })

  it.each([
    ['a brand-new kitchen', NEW_KITCHEN],
    ['an upgraded Interval 4 kitchen with no Crumbs', VETERAN],
    ['a finished Interval 10 kitchen with no Crumbs', INTERVAL_10_KITCHEN],
  ])('can never leave %s stuck, whatever order ingredients are added in', (_, start) => {
    const { stuck, reachedEverything } = explore(start)
    expect(stuck).toEqual([])
    // And the whole pantry is reachable.
    expect(reachedEverything).toBe(true)
  })

  it('really does try a great many orders', () => {
    expect(explore(NEW_KITCHEN).visited).toBeGreaterThan(10_000)
  })

  it('works each pantry out exactly as the game’s own rules would', () => {
    // The fast search must agree with bestCase and unlockStatus, which use the real save and rules.
    for (const start of [NEW_KITCHEN, VETERAN, INTERVAL_10_KITCHEN]) {
      const { standing, bit } = explore(start)
      const ids = [...bit.keys()]
      for (let sample = 0; sample < 200; sample++) {
        const added = ids.filter((_, index) => ((sample * 2654435761) >>> index) % 3 === 0)
        const mask = added.reduce((total, id) => total | bit.get(id)!, 0)
        expect(standing(mask)).toEqual(bestCase(start, added).progression)
      }
    }
  })

  it('reaches the top level by filling the pantry and finding every recipe that isn’t secret', () => {
    const complete = bestCase(NEW_KITCHEN, INGREDIENT_UNLOCKS.map((unlock) => unlock.ingredientId))
    expect(levelForXp(complete.progression.xp)).toBe(MAX_LEVEL)
    expect(complete.progression.crumbs).toBeGreaterThanOrEqual(0)
  })

  it('opens the last ingredient without needing any recipe that uses it', () => {
    for (const start of [NEW_KITCHEN, VETERAN]) {
      const allButSalt = INGREDIENT_UNLOCKS.map((unlock) => unlock.ingredientId).filter(
        (id) => id !== SEA_SALT && !start.pantryIngredientIds.includes(id),
      )
      expect(unlockStatus(bestCase(start, allButSalt), SEA_SALT).kind).toBe('available')
    }
  })

  it('lets the starter pantry alone reach Level 2 and the first additions', () => {
    const starter = bestCase(NEW_KITCHEN, [])
    expect(levelForXp(starter.progression.xp)).toBeGreaterThanOrEqual(2)
    expect(unlockStatus(starter, CHOCOLATE_CHIPS).kind).toBe('available')
  })

  it('gives an upgraded kitchen something new to find with what it already owns, so it can buy its way in', () => {
    const fromOldShelf = RECIPES.filter(
      (recipe) =>
        !recipe.isSecret && !INTERVAL_4_RECIPES.includes(recipe) && recipe.ingredientIds.every((id) => INTERVAL_4_PANTRY.includes(id)),
    )
    expect(fromOldShelf.map((recipe) => recipe.name)).toEqual(['Meringue Kiss', 'Honeycomb Crunch', 'Chocolate Haystack', 'Spiced Cocoa Square', 'Honey Madeleine', 'Edie’s Oat Crisps'])
    const newAdditions = INGREDIENT_UNLOCKS.filter((unlock) => !INTERVAL_4_PANTRY.includes(unlock.ingredientId))
    const cheapest = Math.min(...newAdditions.map((unlock) => unlock.crumbs))
    expect(bestCase(VETERAN, []).progression.crumbs).toBeGreaterThanOrEqual(cheapest)
  })

  it('keeps the late ingredients late', () => {
    expect(findUnlock(HONEY)!.level).toBeGreaterThan(findUnlock(PEANUT_BUTTER)!.level)
    expect(findUnlock(PEANUT_BUTTER)!.level).toBeGreaterThan(findUnlock(CHOCOLATE_CHIPS)!.level)
    expect(findUnlock(PISTACHIO)!.level).toBeGreaterThan(findUnlock(BROWN_SUGAR)!.level)
    // Sea salt, which the Mythic needs, comes last of all.
    for (const unlock of INGREDIENT_UNLOCKS) expect(unlock.level).toBeLessThanOrEqual(findUnlock(SEA_SALT)!.level)
  })

  it('puts Interval 11’s jars at existing levels: no new levels, nothing past sea salt', () => {
    const added = INGREDIENT_UNLOCKS.filter((unlock) => [ORANGE, GINGER, ESPRESSO, PECAN, MARSHMALLOW].includes(unlock.ingredientId))
    expect(added.map(({ ingredientId, level, crumbs }) => [ingredientId, level, crumbs])).toEqual([
      [ORANGE, 4, 25],
      [GINGER, 5, 15],
      [ESPRESSO, 6, 25],
      [PECAN, 7, 15],
      [MARSHMALLOW, 10, 15],
    ])
    expect(MAX_LEVEL).toBe(11)
  })

  it('makes every Interval 11 jar pay for itself from the starter shelf, so adding one never leaves a kitchen worse off', () => {
    // This is what keeps the search above clean: a jar that can't earn its price back on its
    // own can drain a kitchen that skipped the cheap early jars. Each of these has a card
    // made from the starter pantry and that jar alone, worth at least what the jar costs.
    for (const id of [ORANGE, GINGER, ESPRESSO, PECAN, MARSHMALLOW]) {
      const shelf = [...STARTER_PANTRY, id]
      const ownCards = RECIPES.filter((recipe) => !recipe.isSecret && recipe.ingredientIds.includes(id) && recipe.ingredientIds.every((need) => shelf.includes(need)))
      const earned = ownCards.reduce((total, recipe) => total + discoveryReward(recipe).crumbs, 0)
      expect(ownCards.length, id).toBeGreaterThan(0)
      expect(earned, id).toBeGreaterThanOrEqual(findUnlock(id)!.crumbs)
    }
  })

  it('keeps Interval 5’s pantry additions at the same level and price', () => {
    const old = INGREDIENT_UNLOCKS.filter((unlock) => INTERVAL_4_PANTRY.includes(unlock.ingredientId))
    expect(old.map(({ ingredientId, level, crumbs }) => [ingredientId, level, crumbs])).toEqual([
      [CHOCOLATE_CHIPS, 2, 20],
      [CINNAMON, 2, 20],
      [OATS, 3, 25],
      [COCOA, 3, 30],
      [COCONUT, 4, 40],
      [PEANUT_BUTTER, 5, 60],
      [HONEY, 6, 100],
    ])
  })
})

describe('the first Mythic', () => {
  const MILLIONAIRES = findRecipeById(defineId('recipe', 'millionaires-shortbread'))!

  it('is Millionaire’s Shortbread: a shortbread base, salted caramel and chocolate', () => {
    expect(MILLIONAIRES.rarity).toBe('mythic')
    expect(MILLIONAIRES.isSecret).toBe(false)
    expect(new Set(MILLIONAIRES.ingredientIds)).toEqual(new Set([FLOUR, BUTTER, BROWN_SUGAR, SEA_SALT, CHOCOLATE_CHIPS]))
  })

  it('pays the Mythic reward exactly once, in any order', () => {
    const first = bakeInto(makeSave(), [CHOCOLATE_CHIPS, SEA_SALT, BROWN_SUGAR, BUTTER, FLOUR], 1)
    expect(first.outcome.reward).toEqual({ rarity: 'mythic', crumbs: 300, xp: 320 })
    expect(first.outcome.firstOfRarity).toBe(true)
    expect(first.save.progression).toEqual({ crumbs: 300, xp: 320 })
    const again = bakeInto(first.save, MILLIONAIRES.ingredientIds, 2)
    expect(again.outcome.reward).toBeNull()
    expect(again.save.progression).toEqual(first.save.progression)
  })

  it('stays an experiment one ingredient off', () => {
    expect(bake([FLOUR, BUTTER, SUGAR, SEA_SALT, CHOCOLATE_CHIPS]).kind).toBe('experiment')
    expect(bake([FLOUR, BUTTER, BROWN_SUGAR, CHOCOLATE_CHIPS]).kind).toBe('experiment')
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
