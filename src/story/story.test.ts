import { describe, expect, it } from 'vitest'
import { bake, recordBake } from '../domain/baking'
import type { CreationId, RecipeId, StorySceneId } from '../domain/ids'
import { CINNAMON, EGG, FLOUR, BUTTER, SUGAR, STARTER_PANTRY, VANILLA } from '../domain/ingredients'
import { RECIPES } from '../domain/recipes'
import type { GameSave } from '../domain/types'
import { FIXED_NOW, makeNewKitchen, makeSave } from '../test/fixtures'
import { STORY_CHAPTERS, STORY_SCENES } from './chapters'
import {
  availableScene,
  chapterViews,
  completedChapters,
  currentChapter,
  evaluateStoryProgress,
  hasSeenScene,
  nextScene,
  readyScenes,
  seeScene,
  unlockedNotes,
  unlockedSecretClues,
} from './progress'
import { meetsRequirement } from './requirements'

const scene = (slug: string) => `scene_${slug}` as StorySceneId
const found = (...ids: string[]) => ids.map((id) => ({ recipeId: id as RecipeId, discoveredAt: '2026-09-01T10:00:00.000Z' }))
const visibleIds = RECIPES.filter((recipe) => !recipe.isSecret).map((recipe) => recipe.id)
const secretIds = RECIPES.filter((recipe) => recipe.isSecret).map((recipe) => recipe.id)

/** A brand-new kitchen that has just finished the tutorial. */
const afterTutorial = (overrides: Partial<GameSave> = {}) => makeNewKitchen({ tutorial: { completed: true, skipped: false }, ...overrides })

/** Reads every scene that's ready, in order, as a player would. */
function readAll(save: GameSave): { save: GameSave; read: StorySceneId[] } {
  const read: StorySceneId[] = []
  let current = save
  for (let open = availableScene(current); open; open = availableScene(current)) {
    const result = seeScene(current, open.scene.id)
    if (!result.ok) throw new Error(result.reason)
    current = result.save
    read.push(open.scene.id)
  }
  return { save: current, read }
}

/** A late kitchen that has done everything the first arc asks, without a single secret. */
const everythingButSecrets = () =>
  makeSave({ discoveredRecipes: found(...visibleIds), progression: { crumbs: 0, xp: 5000 } })

describe('chapter eligibility', () => {
  it('has a first arc of five chapters, in order', () => {
    expect(STORY_CHAPTERS.map((chapter) => [chapter.number, chapter.title])).toEqual([
      [1, 'The Faded Recipe Box'],
      [2, 'Notes in the Margins'],
      [3, 'The Second Shelf'],
      [4, 'Recipes Someone Hid'],
      [5, 'The Last Card'],
    ])
  })

  it('opens nothing while the first-time tutorial is still to come', () => {
    const save = makeNewKitchen()
    expect(nextScene(save)?.scene.id).toBe(scene('faded-box'))
    expect(availableScene(save)).toBeNull()
    expect(currentChapter(save)?.number).toBe(1)
  })

  it('opens the first chapter once the tutorial is behind them, finished or skipped', () => {
    expect(availableScene(afterTutorial())?.scene.id).toBe(scene('faded-box'))
    expect(availableScene(makeNewKitchen({ tutorial: { completed: false, skipped: true } }))?.scene.id).toBe(scene('faded-box'))
  })

  it('waits for real progress, never for time: each later scene names something done in the kitchen', () => {
    const save = seeScene(afterTutorial(), scene('faded-box'))
    if (!save.ok) throw new Error(save.reason)
    // Three recipes isn't enough for chapter 2; a fourth is.
    const three = { ...save.save, discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss') }
    expect(availableScene(three)).toBeNull()
    const four = { ...three, discoveredRecipes: [...three.discoveredRecipes, ...found('recipe_vanilla-kiss')] }
    expect(availableScene(four)?.scene.id).toBe(scene('margins'))
  })

  it('checks each kind of requirement against the save alone', () => {
    const save = makeSave({
      pantryIngredientIds: [...STARTER_PANTRY, CINNAMON],
      discoveredRecipes: found('recipe_snickerdoodle', 'recipe_snowball'),
      progression: { crumbs: 0, xp: 100 },
    })
    expect(meetsRequirement(save, { type: 'tutorial-complete' })).toBe(true)
    expect(meetsRequirement(save, { type: 'recipes-discovered', count: 2 })).toBe(true)
    expect(meetsRequirement(save, { type: 'recipes-discovered', count: 3 })).toBe(false)
    expect(meetsRequirement(save, { type: 'family-discovered', familyId: 'warm-spiced', count: 1 })).toBe(true)
    expect(meetsRequirement(save, { type: 'family-discovered', familyId: 'nutty', count: 1 })).toBe(false)
    expect(meetsRequirement(save, { type: 'secret-recipes-discovered', count: 1 })).toBe(true)
    expect(meetsRequirement(save, { type: 'level', level: 3 })).toBe(true)
    expect(meetsRequirement(save, { type: 'level', level: 4 })).toBe(false)
    expect(meetsRequirement(save, { type: 'ingredient-unlocks', count: 1 })).toBe(true)
    expect(meetsRequirement(save, { type: 'ingredient-unlocks', count: 2 })).toBe(false)
    expect(meetsRequirement(save, { type: 'recipe-discovered', recipeId: 'recipe_snowball' as RecipeId })).toBe(true)
    expect(
      meetsRequirement(save, {
        type: 'any',
        of: [
          { type: 'level', level: 9 },
          { type: 'recipes-discovered', count: 1 },
        ],
      }),
    ).toBe(true)
  })

  it('never depends on a secret: a kitchen with none can read the whole arc', () => {
    const { save, read } = readAll(everythingButSecrets())
    expect(read).toEqual(STORY_SCENES.map((placed) => placed.scene.id))
    expect(currentChapter(save)).toBeNull()
  })

  it('opens chapter 4 with a first secret, before the box is well filled', () => {
    const base = readAll(
      makeSave({ discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_vanilla-kiss', 'recipe_snickerdoodle') }),
    ).save
    expect(nextScene(base)?.scene.id).toBe(scene('hidden-recipes'))
    expect(availableScene(base)).toBeNull()
    expect(availableScene({ ...base, discoveredRecipes: [...base.discoveredRecipes, ...found(secretIds[0]!)] })?.scene.id).toBe(scene('hidden-recipes'))
  })
})

describe('ordering and the queue', () => {
  it('reads scenes in one fixed order, one at a time', () => {
    const { read } = readAll(everythingButSecrets())
    expect(read).toEqual([
      scene('faded-box'),
      scene('margins'),
      scene('margins-spice'),
      scene('second-shelf'),
      scene('hidden-recipes'),
      scene('last-card'),
    ])
  })

  it('keeps a later scene waiting behind an earlier one, even when its own requirement is met', () => {
    // The first Mythic is found, but the box hasn't been opened at all yet.
    const save = makeSave({ discoveredRecipes: found('recipe_millionaires-shortbread') })
    expect(availableScene(save)?.scene.id).toBe(scene('faded-box'))
    expect(seeScene(save, scene('last-card'))).toEqual({ ok: false, reason: 'not-available' })
  })

  it('queues several milestones crossed at once, and opens the next as soon as one is read', () => {
    const save = makeSave({
      pantryIngredientIds: [...STARTER_PANTRY, CINNAMON, 'ingredient_oats' as never, 'ingredient_cocoa' as never],
      discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_vanilla-kiss', 'recipe_snickerdoodle'),
    })
    expect(readyScenes(save).map((placed) => placed.scene.id)).toEqual([
      scene('faded-box'),
      scene('margins'),
      scene('margins-spice'),
      scene('second-shelf'),
    ])
    // Only the first is open now; the queue is the same for every kitchen.
    expect(availableScene(save)?.scene.id).toBe(scene('faded-box'))
    const first = seeScene(save, scene('faded-box'))
    if (!first.ok) throw new Error(first.reason)
    expect(availableScene(first.save)?.scene.id).toBe(scene('margins'))
  })

  it('says at most one thing when one bake crosses several milestones: the next scene in the queue', () => {
    // Three recipes found, the box read. Snickerdoodle is a fourth recipe *and* the first spiced card.
    const before = readAll(afterTutorial({ pantryIngredientIds: [...STARTER_PANTRY, CINNAMON], discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss') })).save
    expect(availableScene(before)).toBeNull()
    const { save: after } = recordBake(before, bake([FLOUR, SUGAR, BUTTER, EGG, CINNAMON]), FIXED_NOW, 'creation_x' as CreationId)

    const news = evaluateStoryProgress(before, after)
    expect(news?.scene.scene.id).toBe(scene('margins'))
    expect(news?.nudge).toBe('There’s pencil in the margin of one of your cards.')
    expect(readyScenes(after).map((placed) => placed.scene.id)).toEqual([scene('margins'), scene('margins-spice')])
  })

  it('has no news when nothing new opened, including for a scene that was already waiting', () => {
    const waiting = afterTutorial()
    const { save: after } = recordBake(waiting, bake([FLOUR, SUGAR, BUTTER]), FIXED_NOW, 'creation_y' as CreationId)
    expect(evaluateStoryProgress(waiting, after)).toBeNull()
    expect(evaluateStoryProgress(makeNewKitchen(), makeNewKitchen())).toBeNull()
  })

  it('reports the first chapter opening when the tutorial ends', () => {
    expect(evaluateStoryProgress(makeNewKitchen(), afterTutorial())?.scene.scene.id).toBe(scene('faded-box'))
  })
})

describe('seeing scenes and completing chapters', () => {
  it('records a scene as seen, and completes a one-scene chapter with it', () => {
    const result = seeScene(afterTutorial(), scene('faded-box'))
    if (!result.ok) throw new Error(result.reason)
    expect(result.firstTime).toBe(true)
    expect(result.completedChapter?.number).toBe(1)
    expect(result.save.story.seenSceneIds).toEqual([scene('faded-box')])
    expect(completedChapters(result.save).map((chapter) => chapter.number)).toEqual([1])
    expect(currentChapter(result.save)?.number).toBe(2)
  })

  it('never completes a chapter just because its requirements are met', () => {
    const save = everythingButSecrets()
    expect(completedChapters(save)).toEqual([])
    expect(chapterViews(save)).toEqual([])
  })

  it('completes a two-scene chapter only when its last scene is seen', () => {
    const save = readAll(afterTutorial({ pantryIngredientIds: [...STARTER_PANTRY, CINNAMON], discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss', 'recipe_vanilla-kiss') })).save
    expect(hasSeenScene(save, scene('margins'))).toBe(true)
    expect(completedChapters(save).map((chapter) => chapter.number)).toEqual([1])
    expect(chapterViews(save).map((view) => [view.chapter.number, view.complete])).toEqual([
      [1, true],
      [2, false],
    ])

    const spiced = { ...save, discoveredRecipes: [...save.discoveredRecipes, ...found('recipe_snickerdoodle')] }
    const result = seeScene(spiced, scene('margins-spice'))
    if (!result.ok) throw new Error(result.reason)
    expect(result.completedChapter?.number).toBe(2)
  })

  it('pays a chapter’s small reward once, as it completes, and no XP', () => {
    const save = readAll(afterTutorial({ discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss', 'recipe_vanilla-kiss') })).save
    const before = { ...save, discoveredRecipes: [...save.discoveredRecipes, ...found('recipe_snickerdoodle')], progression: { crumbs: 5, xp: 77 } }
    const result = seeScene(before, scene('margins-spice'))
    if (!result.ok) throw new Error(result.reason)
    expect(result.reward).toEqual({ crumbs: 10 })
    expect(result.save.progression).toEqual({ crumbs: 15, xp: 77 })
  })

  it('pays nothing for the first chapter or for a scene part-way through a chapter', () => {
    const first = seeScene(afterTutorial({ progression: { crumbs: 3, xp: 0 } }), scene('faded-box'))
    if (!first.ok) throw new Error(first.reason)
    expect(first.reward).toBeNull()
    expect(first.save.progression.crumbs).toBe(3)
  })

  it('adds the whole arc’s rewards up to a small bonus', () => {
    const start = everythingButSecrets()
    const { save } = readAll(start)
    expect(save.progression.crumbs - start.progression.crumbs).toBe(70)
    expect(save.progression.xp).toBe(start.progression.xp)
  })

  it('refuses scenes that aren’t open, and ones that don’t exist, changing nothing', () => {
    const save = makeNewKitchen()
    expect(seeScene(save, scene('faded-box'))).toEqual({ ok: false, reason: 'not-available' })
    expect(seeScene(save, scene('no-such-scene'))).toEqual({ ok: false, reason: 'unknown-scene' })
  })
})

describe('replay', () => {
  it('is idempotent: seeing a scene again returns the very same save', () => {
    const { save } = readAll(everythingButSecrets())
    for (const placed of STORY_SCENES) {
      const again = seeScene(save, placed.scene.id)
      expect(again).toEqual({ ok: true, save, firstTime: false, completedChapter: null, reward: null })
      if (again.ok) expect(again.save).toBe(save)
    }
  })
})

describe('notes and secret clues', () => {
  it('unlocks a scene’s notes when it is seen, skipped or read, and not before', () => {
    const waiting = afterTutorial()
    expect(unlockedNotes(waiting)).toEqual([])
    const result = seeScene(waiting, scene('faded-box'))
    if (!result.ok) throw new Error(result.reason)
    expect(unlockedNotes(result.save).map((note) => note.id)).toEqual(['note_box-lid'])
  })

  it('lists only chapters with a scene seen, so later chapters and their notes stay out of sight', () => {
    const save = readAll(afterTutorial()).save
    const views = chapterViews(save)
    expect(views.map((view) => view.chapter.number)).toEqual([1])
    expect(views[0]!.notes.map((note) => note.id)).toEqual(['note_box-lid'])
  })

  it('has no secret clue at the start, and one per secret by the end of chapter 4', () => {
    expect(unlockedSecretClues(afterTutorial())).toEqual([])
    const afterTwo = readAll(afterTutorial({ pantryIngredientIds: [...STARTER_PANTRY, CINNAMON], discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss', 'recipe_vanilla-kiss', 'recipe_snickerdoodle') })).save
    expect(unlockedSecretClues(afterTwo).map((note) => note.secretRecipeId)).toEqual(['recipe_snowball'])

    const { save } = readAll(everythingButSecrets())
    expect(unlockedSecretClues(save).map((note) => note.secretRecipeId).sort()).toEqual([...secretIds].sort())
  })

  it('never marks a secret found because its clue was read', () => {
    const { save } = readAll(everythingButSecrets())
    for (const id of secretIds) expect(save.discoveredRecipes.some((entry) => entry.recipeId === id)).toBe(false)
  })
})

describe('determinism', () => {
  it('gives the same answers for the same save, every time', () => {
    const save = makeSave({ discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_vanilla-kiss', 'recipe_snickerdoodle'), pantryIngredientIds: [...STARTER_PANTRY, VANILLA] })
    expect(readAll(save)).toEqual(readAll(structuredClone(save)))
    expect(readyScenes(save)).toEqual(readyScenes(structuredClone(save)))
  })
})
