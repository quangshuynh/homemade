import { describe, expect, it } from 'vitest'
import { DECORATIONS, findDecoration } from '../decorating/catalog'
import { equipDecoration, grantEarnedDecorations } from '../decorating/rules'
import { DECORATION_SLOTS } from '../decorating/slots'
import { bake, prepareBowl, recordBake } from '../domain/baking'
import type { CreationId, RecipeId, StorySceneId } from '../domain/ids'
import { bakeCount, crossedStage, masteryStage, MASTERY_STAGES, nextStage, stageForCount, TOP_MASTERY_BAKES } from '../domain/mastery'
import { VISIBLE_RECIPES } from '../domain/recipeBook'
import { findRecipeById, RECIPES } from '../domain/recipes'
import type { GameSave } from '../domain/types'
import { makeSave } from '../test/fixtures'
import { STORY_SCENES } from '../story/chapters'
import { ACHIEVEMENTS, findAchievement } from './catalog'
import { evaluateAchievements, favouriteRecipes, grantEarnedAchievements, keepsakeCounts, keepsakeGroups, kitchenGoal, qualifiesFor, setFavourite } from './rules'
import { settleSave } from './settle'

const DAY = '2026-10-01T10:00:00.000Z'
const id = (slug: string) => `recipe_${slug}` as RecipeId
const found = (...slugs: string[]): GameSave['discoveredRecipes'] => slugs.map((slug) => ({ recipeId: id(slug), discoveredAt: DAY }))
const ids = (list: readonly { id: string }[]) => list.map((entry) => entry.id)
const ALL_SCENES = { seenSceneIds: STORY_SCENES.map((placed) => placed.scene.id) as StorySceneId[] }

let creation = 0
/** Bakes a recipe (or any bowl) through the real rules, as the game does. */
function bakeRecipe(save: GameSave, slug: string): ReturnType<typeof recordBake> {
  const recipe = findRecipeById(id(slug))!
  return recordBake(save, bake(recipe.ingredientIds), new Date(DAY), `creation_t${creation++}` as CreationId)
}
function bakeTimes(save: GameSave, slug: string, times: number): GameSave {
  let next = save
  for (let i = 0; i < times; i++) next = bakeRecipe(next, slug).save
  return next
}

describe('the keepsake catalog', () => {
  it('is curated: 12–18 keepsakes with unique ids and names, in known categories', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(12)
    expect(ACHIEVEMENTS.length).toBeLessThanOrEqual(18)
    expect(new Set(ids(ACHIEVEMENTS)).size).toBe(ACHIEVEMENTS.length)
    expect(new Set(ACHIEVEMENTS.map((entry) => entry.name)).size).toBe(ACHIEVEMENTS.length)
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.id).toMatch(/^achievement_[a-z0-9-]+$/)
      expect(achievement.name.length, achievement.id).toBeGreaterThan(0)
      expect(achievement.description.length, achievement.id).toBeGreaterThan(0)
      expect(findAchievement(achievement.id)).toBe(achievement)
    }
  })

  it('rewards only with decorations, each a real one that is earned by exactly that keepsake', () => {
    const rewarded = ACHIEVEMENTS.filter((entry) => entry.reward)
    expect(rewarded.length).toBeGreaterThanOrEqual(4)
    for (const achievement of rewarded) {
      const piece = findDecoration(achievement.reward!.decorationId)
      expect(piece, achievement.id).toBeDefined()
      expect(piece!.unlock).toEqual({ type: 'achievement', achievementId: achievement.id })
    }
    // And every keepsake-earned decoration names a keepsake that exists.
    for (const piece of DECORATIONS.filter((entry) => entry.unlock.type === 'achievement')) {
      const rule = piece.unlock as { achievementId: string }
      expect(findAchievement(rule.achievementId as never)?.reward?.decorationId, piece.id).toBe(piece.id)
    }
  })

  it('never asks for more than ten bakes of anything, and never pays Crumbs or XP', () => {
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.requirement.type === 'mastery') expect(MASTERY_STAGES.find((stage) => stage.id === (achievement.requirement as { stage: string }).stage)!.bakes).toBeLessThanOrEqual(10)
      expect(Object.keys(achievement.reward ?? {}).sort()).toEqual(achievement.reward ? ['decorationId', 'type'] : [])
    }
  })

  it('hides the ones that would spoil a secret or a Mythic, and those never come with a decoration', () => {
    const hidden = ACHIEVEMENTS.filter((entry) => entry.hidden)
    expect(ids(hidden)).toEqual(['achievement_secret-ingredient', 'achievement_written-in-gold'])
    for (const achievement of hidden) expect(achievement.reward).toBeUndefined()
  })
})

describe('earning keepsakes', () => {
  it('starts a new kitchen with none', () => {
    const save = makeSave()
    expect(grantEarnedAchievements(save)).toEqual({ save, earned: [] })
  })

  it('stamps a first experiment, once', () => {
    const { save: baked } = recordBake(makeSave(), bake(['ingredient_egg', 'ingredient_vanilla'] as never), new Date(DAY), 'creation_x' as CreationId)
    const first = grantEarnedAchievements(baked)
    expect(ids(first.earned)).toEqual(['achievement_happy-accident'])
    expect(first.save.achievementIds).toEqual(['achievement_happy-accident'])
    // One-time: looking again, or making another experiment, adds nothing.
    expect(grantEarnedAchievements(first.save)).toEqual({ save: first.save, earned: [] })
  })

  it('is deterministic: the same save always earns the same keepsakes, in catalog order', () => {
    const save = makeSave({ discoveredRecipes: found(...VISIBLE_RECIPES.map((recipe) => recipe.id.slice('recipe_'.length))) })
    const a = grantEarnedAchievements(save)
    const b = grantEarnedAchievements(structuredClone(save))
    expect(a).toEqual(b)
    const order = ids(ACHIEVEMENTS)
    expect(ids(a.earned)).toEqual([...ids(a.earned)].sort((x, y) => order.indexOf(x) - order.indexOf(y)))
    expect(ids(a.earned)).toEqual(
      expect.arrayContaining(['achievement_recipe-keeper', 'achievement_half-full', 'achievement_every-card', 'achievement_something-special', 'achievement_written-in-gold', 'achievement_family-recipe', 'achievement_full-shelf']),
    )
  })

  it('counts half and every card from the cards the book admits to, never secrets', () => {
    const half = Math.ceil(VISIBLE_RECIPES.length / 2)
    const slugs = VISIBLE_RECIPES.map((recipe) => recipe.id.slice('recipe_'.length))
    const half1 = makeSave({ discoveredRecipes: found(...slugs.slice(0, half - 1), 'snowball', 'baklava-bite') })
    expect(qualifiesFor(half1, findAchievement('achievement_half-full' as never)!)).toBe(false)
    expect(qualifiesFor(makeSave({ discoveredRecipes: found(...slugs.slice(0, half)) }), findAchievement('achievement_half-full' as never)!)).toBe(true)
  })

  it('gives existing kitchens what they already earned, without repeating anything', () => {
    // A kitchen with a finished family, ten cards, a Legendary and a secret.
    const save = makeSave({
      discoveredRecipes: found('shortbread', 'sugar-cookie', 'vanilla-kiss', 'oatmeal-cookie', 'blondie', 'chocolate-chip', 'snickerdoodle', 'honey-flapjack', 'jam-thumbprint', 'snowball'),
    })
    expect(ids(grantEarnedAchievements(save).earned)).toEqual([
      'achievement_recipe-keeper',
      'achievement_something-special',
      'achievement_secret-ingredient',
      'achievement_family-recipe',
    ])
  })

  it('keeps an earned keepsake for good, even if what earned it is undone', () => {
    let save = makeSave({ achievementIds: ['achievement_make-it-yours' as never], decorating: { ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] } })
    save = grantEarnedAchievements(save).save
    expect(save.achievementIds).toContain('achievement_make-it-yours')
  })

  it('keeps ids the catalog doesn’t know, and doesn’t show them', () => {
    const save = makeSave({ achievementIds: ['achievement_retired' as never] })
    expect(grantEarnedAchievements(save).save.achievementIds).toContain('achievement_retired')
    expect(keepsakeGroups(save).flatMap((group) => group.entries).some((entry) => entry.achievement.id === ('achievement_retired' as never))).toBe(false)
    expect(keepsakeCounts(save).earned).toBe(0)
  })

  it('reports what a change earned, in the order it arrived', () => {
    const before = makeSave()
    const after = grantEarnedAchievements(bakeTimes(makeSave(), 'shortbread', 3)).save
    expect(ids(evaluateAchievements(before, after))).toEqual(['achievement_getting-familiar'])
    expect(evaluateAchievements(after, after)).toEqual([])
  })

  it('stamps the whole story, and the decorating ones, only when they really happen', () => {
    expect(ids(grantEarnedAchievements(makeSave({ story: ALL_SCENES })).earned)).toContain('achievement_last-page')
    // The cupboard opens at the end of the story; put the gingham towel out, then fill every spot.
    let save = grantEarnedDecorations(makeSave({ story: ALL_SCENES })).save
    const result = equipDecoration(save, 'textile', 'decoration_gingham-towel' as never)
    if (!result.ok) throw new Error(result.reason)
    save = result.save
    expect(ids(grantEarnedAchievements(save).earned)).toEqual(['achievement_make-it-yours', 'achievement_last-page'])
    expect(ids(grantEarnedAchievements(save).earned)).not.toContain('achievement_lived-in')
  })
})

describe('Lived In and its reward', () => {
  it('arrives once every spot has something out, with the figurine in the same settle', () => {
    let save = makeSave({ story: ALL_SCENES, discoveredRecipes: found('snowball') })
    save = settleSave(save).save
    for (const slot of DECORATION_SLOTS) {
      const piece = DECORATIONS.find((entry) => entry.slot === slot && save.decorating.ownedDecorationIds.includes(entry.id))!
      expect(piece, slot).toBeDefined()
      const result = equipDecoration(save, slot, piece.id)
      if (!result.ok) throw new Error(result.reason)
      save = result.save
    }
    const settled = settleSave(save)
    expect(ids(settled.achievements)).toContain('achievement_lived-in')
    expect(ids(settled.decor)).toContain('decoration_marmalade-figurine')
    // No duplicate reward, however often it's looked at.
    const again = settleSave(settled.save)
    expect(again).toEqual({ save: settled.save, achievements: [], decor: [] })
    expect(settled.save.decorating.ownedDecorationIds.filter((piece) => piece === 'decoration_marmalade-figurine')).toHaveLength(1)
  })

  it('keeps keepsake decorations waiting until the cupboard opens, then hands them over once', () => {
    const early = settleSave(makeSave({ discoveredRecipes: found('shortbread', 'sugar-cookie', 'vanilla-kiss', 'oatmeal-cookie', 'blondie', 'chocolate-chip', 'snickerdoodle', 'jam-thumbprint', 'lemon-shortbread', 'honeycomb') }))
    expect(ids(early.achievements)).toContain('achievement_recipe-keeper')
    expect(early.decor).toEqual([])
    const opened = settleSave({ ...early.save, story: ALL_SCENES })
    expect(ids(opened.decor)).toContain('decoration_cookie-tin')
    expect(settleSave(opened.save).decor).toEqual([])
  })
})

describe('recipe mastery', () => {
  it('has small stages: 1, 3, 5 and 10 bakes, and nothing past ten', () => {
    expect(MASTERY_STAGES.map((stage) => [stage.id, stage.bakes])).toEqual([
      ['discovered', 1],
      ['familiar', 3],
      ['well-loved', 5],
      ['house-favourite', 10],
    ])
    expect(TOP_MASTERY_BAKES).toBe(10)
    expect(nextStage(10)).toBeNull()
    expect(nextStage(25)).toBeNull()
  })

  it('crosses each stage exactly on its boundary', () => {
    expect([0, 1, 2, 3, 4, 5, 9, 10, 11].map(stageForCount)).toEqual([null, 'discovered', 'discovered', 'familiar', 'familiar', 'well-loved', 'well-loved', 'house-favourite', 'house-favourite'])
    expect([crossedStage(0, 1), crossedStage(1, 2), crossedStage(2, 3), crossedStage(3, 4), crossedStage(4, 5), crossedStage(9, 10), crossedStage(10, 11)]).toEqual([
      null,
      null,
      'familiar',
      null,
      'well-loved',
      'house-favourite',
      null,
    ])
    expect(nextStage(3)).toMatchObject({ stage: { id: 'well-loved' }, more: 2 })
  })

  it('counts the first bake and every rebake, and says when a stage is reached', () => {
    let save = makeSave()
    const steps: (string | null)[] = []
    for (let i = 0; i < 10; i++) {
      const { save: next, outcome } = bakeRecipe(save, 'shortbread')
      steps.push(outcome.masteryUp)
      expect(outcome.bakeCount).toBe(i + 1)
      save = next
    }
    expect(steps).toEqual([null, null, 'familiar', null, 'well-loved', null, null, null, null, 'house-favourite'])
    expect(bakeCount(save, id('shortbread'))).toBe(10)
    expect(masteryStage(save, id('shortbread'))).toBe('house-favourite')
  })

  it('never counts a Kitchen Experiment, and earns no Crumbs or XP for a rebake', () => {
    const { save, outcome } = recordBake(makeSave(), bake(['ingredient_egg', 'ingredient_vanilla'] as never), new Date(DAY), 'creation_e' as CreationId)
    expect(save.recipeBakeCounts).toEqual({})
    expect(outcome.bakeCount).toBe(0)
    expect(outcome.masteryUp).toBeNull()
    const once = bakeRecipe(makeSave(), 'shortbread').save
    const twice = bakeRecipe(once, 'shortbread')
    expect(twice.save.progression).toEqual(once.progression)
    expect(twice.outcome.reward).toBeNull()
  })

  it('lays a bowl out with Bake again without counting anything', () => {
    const save = bakeRecipe(makeSave(), 'shortbread').save
    expect(prepareBowl(save, id('shortbread'))).not.toBeNull()
    expect(save.recipeBakeCounts).toEqual({ recipe_shortbread: 1 })
  })

  it('counts from the proven first bake when a found recipe has no count yet', () => {
    const save = makeSave({ discoveredRecipes: found('shortbread') })
    expect(bakeRecipe(save, 'shortbread').outcome.bakeCount).toBe(2)
  })

  it('outlives the 50-bake history', () => {
    const save = bakeTimes(makeSave(), 'shortbread', 55)
    expect(save.bakedCreations).toHaveLength(50)
    expect(bakeCount(save, id('shortbread'))).toBe(55)
  })

  it('earns Something for Everyone only across three families', () => {
    let save = bakeTimes(bakeTimes(bakeTimes(makeSave(), 'shortbread', 3), 'sugar-cookie', 3), 'blondie', 3)
    expect(ids(grantEarnedAchievements(save).earned)).not.toContain('achievement_something-for-everyone')
    save = bakeTimes(bakeTimes(save, 'chocolate-chip', 3), 'jam-thumbprint', 3)
    expect(ids(grantEarnedAchievements(save).earned)).toContain('achievement_something-for-everyone')
  })
})

describe('favourites', () => {
  const book = makeSave({ discoveredRecipes: found('shortbread', 'blondie') })

  it('marks and unmarks a found recipe, and nothing else', () => {
    const marked = setFavourite(book, id('blondie'), true)
    expect(marked.favoriteRecipeIds).toEqual(['recipe_blondie'])
    expect(favouriteRecipes(marked).map((recipe) => recipe.id)).toEqual(['recipe_blondie'])
    const { favoriteRecipeIds: _a, ...restMarked } = marked
    const { favoriteRecipeIds: _b, ...restBook } = book
    expect(restMarked).toEqual(restBook)
    expect(setFavourite(marked, id('blondie'), true)).toBe(marked)
    expect(setFavourite(marked, id('blondie'), false).favoriteRecipeIds).toEqual([])
  })

  it('refuses a recipe that isn’t in the book', () => {
    expect(setFavourite(book, id('honey-flapjack'), true)).toBe(book)
    expect(setFavourite(book, id('snowball'), true)).toBe(book)
  })

  it('changes nothing about baking, rewards, mastery or keepsakes', () => {
    const plain = bakeRecipe(book, 'blondie')
    const loved = bakeRecipe(setFavourite(book, id('blondie'), true), 'blondie')
    expect(loved.outcome).toEqual({ ...plain.outcome, creation: loved.outcome.creation })
    expect(loved.save.progression).toEqual(plain.save.progression)
    expect(loved.save.recipeBakeCounts).toEqual(plain.save.recipeBakeCounts)
    expect(grantEarnedAchievements(loved.save).earned).toEqual(grantEarnedAchievements(plain.save).earned)
  })
})

describe('the keepsake box and something to try', () => {
  it('never shows a hidden keepsake, its name or its count until it’s earned', () => {
    const fresh = keepsakeGroups(makeSave()).flatMap((group) => group.entries)
    expect(fresh.some((entry) => entry.achievement.hidden)).toBe(false)
    expect(keepsakeCounts(makeSave())).toEqual({ earned: 0, total: ACHIEVEMENTS.length - 2 })
    const withSecret = settleSave(makeSave({ discoveredRecipes: found('snowball') })).save
    const shown = keepsakeGroups(withSecret).flatMap((group) => group.entries)
    expect(shown.find((entry) => entry.achievement.id === ('achievement_secret-ingredient' as never))?.kind).toBe('earned')
    expect(keepsakeCounts(withSecret)).toEqual({ earned: 1, total: ACHIEVEMENTS.length - 1 })
  })

  it('suggests a favourite’s next stage first, then the nearest family, then anything new', () => {
    const loved = setFavourite(bakeTimes(makeSave(), 'shortbread', 4), id('shortbread'), true)
    expect(kitchenGoal(loved)).toEqual({ line: 'Bake Shortbread again. It’s one bake from Well-Loved.', recipeId: 'recipe_shortbread' })
    expect(kitchenGoal(makeSave({ discoveredRecipes: found('jam-thumbprint', 'lemon-shortbread', 'lemon-crinkle', 'jam-sandwich', 'shortbread') })).line).toBe('Find another Fruity recipe.')
    expect(kitchenGoal(makeSave()).line).toBe('Try a mix you haven’t baked before.')
    const everything = makeSave({ discoveredRecipes: found(...RECIPES.map((recipe) => recipe.id.slice('recipe_'.length))) })
    expect(kitchenGoal(everything).line).toBe('Bake one of your favourites, just because.')
  })
})

describe('carrying keepsakes between browsers', () => {
  it('exports and imports keepsakes, mastery counts, favourites and keepsake decorations exactly', async () => {
    const { exportSave, readSaveFile } = await import('../persistence/portable')
    let save = setFavourite(bakeTimes(makeSave({ story: ALL_SCENES }), 'shortbread', 3), id('shortbread'), true)
    save = settleSave(save).save
    expect(save.decorating.ownedDecorationIds).toContain('decoration_cookie-plate')
    const result = readSaveFile(exportSave(save).text)
    if (!result.ok) throw new Error(result.message)
    expect(result.save).toEqual(save)
    expect(settleSave(result.save).achievements).toEqual([])
  })
})

describe('Marmalade and keepsakes', async () => {
  const { keepsakeReaction } = await import('../mascot/reactions')
  const get = (...slugs: string[]) => slugs.map((slug) => findAchievement(`achievement_${slug}` as never)!)

  it('speaks up for the big moments only, the biggest first', () => {
    expect(keepsakeReaction({ earned: get('lived-in', 'make-it-yours'), first: false })?.line).toMatch(/every spot/)
    expect(keepsakeReaction({ earned: get('house-speciality'), first: false })?.line).toMatch(/House Favourite/)
    expect(keepsakeReaction({ earned: get('recipe-keeper', 'half-full', 'family-recipe'), first: false })?.line).toMatch(/^3 keepsakes at once/)
    expect(keepsakeReaction({ earned: get('happy-accident'), first: true })?.line).toMatch(/A keepsake for the recipe box/)
    // A routine keepsake, or nothing at all, gets no line.
    expect(keepsakeReaction({ earned: get('getting-familiar'), first: false })).toBeNull()
    expect(keepsakeReaction({ earned: [], first: false })).toBeNull()
  })
})
