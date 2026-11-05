import { describe, expect, it } from 'vitest'
import { DECORATIONS } from '../decorating/catalog'
import { decoratingOpen, equipDecoration, grantEarnedDecorations } from '../decorating/rules'
import { bake, recordBake } from '../domain/baking'
import type { CreationId, DecorationId, RecipeId, StorySceneId } from '../domain/ids'
import { findRecipeById } from '../domain/recipes'
import type { GameSave } from '../domain/types'
import { settleSave } from '../keepsakes/settle'
import { makeSave } from '../test/fixtures'
import { isArcEnd, STORY_CHAPTERS, STORY_RECIPES, STORY_SCENES } from './chapters'
import { STORY_NOTES } from './notes'
import { availableScene, chapterViews, nextScene, readyScenes, seeScene, unlockedNotes } from './progress'

/**
 * Arc 2 (Interval 10): the tin behind the cupboard. The rules are the
 * first arc's; these tests pin down what this arc adds: when each chapter
 * opens, what each one reveals and when, and that nothing in it can be
 * farmed, skipped into a loss, or read out of order.
 */

const DAY = '2026-11-01T10:00:00.000Z'
const scene = (slug: string) => `scene_${slug}` as StorySceneId
const ARC_1 = STORY_SCENES.filter((placed) => placed.chapter.arc === 1).map((placed) => placed.scene.id)
const ARC_2 = STORY_SCENES.filter((placed) => placed.chapter.arc === 2).map((placed) => placed.scene.id)
const TOWEL = 'decoration_gingham-towel' as DecorationId

let creation = 0
function bakeRecipe(save: GameSave, recipeId: RecipeId): GameSave {
  const recipe = findRecipeById(recipeId)!
  return recordBake(save, bake(recipe.ingredientIds), new Date(DAY), `creation_arc${creation++}` as CreationId).save
}

/** Reads every scene that's ready, as a player would, and says which. */
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

/** A kitchen that has just finished the first arc: the cupboard open, its starter set handed over, nothing out yet. */
function endOfArc1(overrides: Partial<GameSave> = {}): GameSave {
  return grantEarnedDecorations(
    makeSave({
      discoveredRecipes: [{ recipeId: 'recipe_millionaires-shortbread' as RecipeId, discoveredAt: DAY }],
      progression: { crumbs: 0, xp: 3000 },
      story: { seenSceneIds: [...ARC_1] },
      ...overrides,
    }),
  ).save
}

function putTowelOut(save: GameSave): GameSave {
  const result = equipDecoration(save, 'textile', TOWEL)
  if (!result.ok) throw new Error(result.reason)
  return result.save
}

/** Arc 1 done, a towel out, and Chapter 7 read: the tin is open on the counter. */
const tinOpen = () => readAll(putTowelOut(endOfArc1())).save

const noteIds = (save: GameSave) => unlockedNotes(save).map((note) => note.id)

describe('when Arc 2 opens', () => {
  it('starts only after the first arc is finished, however much else the kitchen has done', () => {
    // Everything Arc 2 asks for, but the old cupboard's epilogue not read yet.
    const early = putTowelOut(endOfArc1())
    const unread = { ...early, story: { seenSceneIds: ARC_1.slice(0, -1) } }
    expect(availableScene(unread)?.scene.id).toBe(scene('old-cupboard'))
    expect(readyScenes(unread).map((placed) => placed.scene.id)).toEqual([scene('old-cupboard'), scene('behind-cupboard')])
  })

  it('waits behind the cupboard until something is out in the kitchen, and never asks for Crumbs', () => {
    const save = endOfArc1()
    expect(decoratingOpen(save)).toBe(true)
    expect(nextScene(save)?.scene.id).toBe(scene('behind-cupboard'))
    expect(availableScene(save)).toBeNull()
    // The free starter set is enough: a kitchen with no Crumbs at all can open it.
    expect(save.progression.crumbs).toBe(0)
    expect(save.decorating.ownedDecorationIds).toContain(TOWEL)
    expect(availableScene(putTowelOut(save))?.scene.id).toBe(scene('behind-cupboard'))
  })

  it('counts only a real piece in its own spot, not a leftover id', () => {
    const save = endOfArc1()
    const odd = { ...save, decorating: { ...save.decorating, equippedBySlot: { textile: 'decoration_retired-thing' as DecorationId } } }
    expect(availableScene(odd)).toBeNull()
    const wrongSpot = { ...save, decorating: { ...save.decorating, equippedBySlot: { wall: TOWEL } } }
    expect(availableScene(wrongSpot)).toBeNull()
  })

  it('reveals nothing of the second arc to a kitchen still in the first', () => {
    const save = endOfArc1()
    expect(chapterViews(save).map((view) => view.chapter.arc)).not.toContain(2)
    const arc2Notes = STORY_NOTES.filter((note) => STORY_CHAPTERS.find((chapter) => chapter.id === note.chapterId)?.arc === 2).map((note) => note.id)
    expect(arc2Notes).toHaveLength(10)
    for (const id of arc2Notes) expect(noteIds(save)).not.toContain(id)
  })
})

describe('E.: who wrote the notes', () => {
  it('opens Chapter 8 with Edie’s own card, baked back in, and not before', () => {
    const save = tinOpen()
    expect(nextScene(save)?.scene.id).toBe(scene('edies-hand'))
    expect(availableScene(save)).toBeNull()
    const baked = bakeRecipe(save, STORY_RECIPES.ediesOatCrisp)
    expect(availableScene(baked)?.scene.id).toBe(scene('edies-hand'))
  })

  it('never names Edie before Chapter 8: not in a note, a line or a nudge', () => {
    const before = STORY_SCENES.slice(0, STORY_SCENES.findIndex((placed) => placed.scene.id === scene('edies-hand')))
    for (const placed of before) {
      expect(placed.scene.nudge, placed.scene.id).not.toMatch(/Edie/)
      for (const beat of placed.scene.beats) {
        const words = beat.speaker === 'marmalade' ? beat.line : `${STORY_NOTES.find((note) => note.id === beat.noteId)!.title} ${STORY_NOTES.find((note) => note.id === beat.noteId)!.text}`
        expect(words, placed.scene.id).not.toMatch(/Edie/)
      }
    }
    // Chapter 8 says it outright, and its signed card is hers.
    const eight = STORY_SCENES.find((placed) => placed.scene.id === scene('edies-hand'))!
    expect(eight.scene.beats.some((beat) => beat.speaker === 'marmalade' && beat.line.includes('So E. was Edie'))).toBe(true)
    expect(STORY_NOTES.find((note) => note.id === 'note_signed-card')!.text).toMatch(/— Edie$/)
  })
})

describe('R.: whose lunchbox it was', () => {
  it('opens Chapter 9 with R.’s Wednesday biscuit, and Chapter 10 only once it’s Familiar (three bakes)', () => {
    let save = readAll(bakeRecipe(tinOpen(), STORY_RECIPES.ediesOatCrisp)).save
    expect(nextScene(save)?.scene.id).toBe(scene('rs-lunchbox'))
    save = bakeRecipe(save, STORY_RECIPES.lunchboxWindow)
    expect(availableScene(save)?.scene.id).toBe(scene('rs-lunchbox'))
    save = readAll(save).save
    expect(nextScene(save)?.scene.id).toBe(scene('photograph'))
    save = bakeRecipe(save, STORY_RECIPES.lunchboxWindow)
    expect(availableScene(save)).toBeNull()
    save = bakeRecipe(save, STORY_RECIPES.lunchboxWindow)
    expect(availableScene(save)?.scene.id).toBe(scene('photograph'))
  })

  it('makes R. a person, Edie’s son, in Chapter 9 and not before', () => {
    const before = readAll(bakeRecipe(tinOpen(), STORY_RECIPES.ediesOatCrisp)).save
    expect(noteIds(before)).toContain('note_lunch-bag')
    expect(noteIds(before)).not.toContain('note_thank-you')
    const after = readAll(bakeRecipe(before, STORY_RECIPES.lunchboxWindow)).save
    expect(noteIds(after)).toEqual(expect.arrayContaining(['note_thank-you', 'note_school-week']))
    expect(STORY_NOTES.find((note) => note.id === 'note_thank-you')!.text).toMatch(/Thank you Mum/)
  })
})

describe('M.: still open', () => {
  /** Every chapter of Arc 2 up to the photograph read. */
  const atPhotograph = () => {
    let save = readAll(bakeRecipe(tinOpen(), STORY_RECIPES.ediesOatCrisp)).save
    for (let i = 0; i < 3; i++) save = bakeRecipe(save, STORY_RECIPES.lunchboxWindow)
    return readAll(save).save
  }

  it('opens the last chapter only with the fair-day parkin the photograph describes', () => {
    const save = atPhotograph()
    expect(nextScene(save)?.scene.id).toBe(scene('for-m'))
    expect(availableScene(save)).toBeNull()
    expect(availableScene(bakeRecipe(save, STORY_RECIPES.fairDayParkin))?.scene.id).toBe(scene('for-m'))
  })

  it('keeps the returned letter out of sight until then, and never says who M. is', () => {
    const save = atPhotograph()
    expect(noteIds(save)).not.toContain('note_returned-envelope')
    const done = readAll(bakeRecipe(save, STORY_RECIPES.fairDayParkin)).save
    expect(noteIds(done)).toEqual(expect.arrayContaining(['note_returned-envelope', 'note_envelope-flap']))
    // E. and R. both knew; the letter is still sealed; M. has no name.
    const lines = [...STORY_NOTES.map((note) => note.text), ...STORY_SCENES.flatMap((placed) => placed.scene.beats.flatMap((beat) => (beat.speaker === 'marmalade' ? [beat.line] : [])))]
    expect(lines.some((line) => /Never opened/.test(line))).toBe(true)
    // Each line on its own: "M." is never followed by a name ("M. Something").
    for (const line of lines) expect(line).not.toMatch(/\bM\.\s?[A-Z][a-z]+/)
  })

  it('ends the arc with For M., and the story with nothing left waiting', () => {
    const forM = STORY_CHAPTERS.find((chapter) => chapter.id === 'chapter_for-m')!
    expect(isArcEnd(forM)).toBe(true)
    expect(STORY_CHAPTERS.filter(isArcEnd).map((chapter) => chapter.id)).toEqual(['chapter_old-cupboard', 'chapter_for-m'])
    const done = readAll(bakeRecipe(atPhotograph(), STORY_RECIPES.fairDayParkin)).save
    expect(nextScene(done)).toBeNull()
    expect(ARC_2.every((id) => done.story.seenSceneIds.includes(id))).toBe(true)
  })
})

describe('the queue', () => {
  it('lines up every ready Arc 2 scene in one order, one at a time, for a kitchen that has done it all already', () => {
    let save = putTowelOut(endOfArc1())
    for (const id of [STORY_RECIPES.ediesOatCrisp, STORY_RECIPES.lunchboxWindow, STORY_RECIPES.lunchboxWindow, STORY_RECIPES.lunchboxWindow, STORY_RECIPES.fairDayParkin]) {
      save = bakeRecipe(save, id)
    }
    expect(readyScenes(save).map((placed) => placed.scene.id)).toEqual(ARC_2)
    expect(availableScene(save)?.scene.id).toBe(scene('behind-cupboard'))
    // Later scenes can't be read out of turn.
    expect(seeScene(save, scene('for-m'))).toEqual({ ok: false, reason: 'not-available' })
    expect(readAll(save).read).toEqual(ARC_2)
  })
})

describe('rewards, replays and rebakes', () => {
  /** A kitchen ready to read all of Arc 2, settled the way the game settles one. */
  const ready = () => {
    let save = putTowelOut(endOfArc1())
    for (const id of [STORY_RECIPES.ediesOatCrisp, STORY_RECIPES.lunchboxWindow, STORY_RECIPES.lunchboxWindow, STORY_RECIPES.lunchboxWindow, STORY_RECIPES.fairDayParkin]) {
      save = bakeRecipe(save, id)
    }
    return settleSave(save).save
  }

  it('pays 60 Crumbs across the arc once, then the keepsake and the framed photograph once', () => {
    const start = ready()
    expect(start.achievementIds).not.toContain('achievement_kept-in-the-tin')
    let save = start
    for (let open = availableScene(save); open; open = availableScene(save)) {
      const result = seeScene(save, open.scene.id)
      if (!result.ok) throw new Error(result.reason)
      save = settleSave(result.save).save
    }
    expect(save.progression.crumbs - start.progression.crumbs).toBe(60)
    expect(save.progression.xp).toBe(start.progression.xp)
    expect(save.achievementIds.filter((id) => id === 'achievement_kept-in-the-tin')).toHaveLength(1)
    expect(save.decorating.ownedDecorationIds.filter((id) => id === 'decoration_fair-day-photograph')).toHaveLength(1)
    // Settling again, and replaying every scene, changes nothing at all.
    expect(settleSave(save).save).toBe(save)
    for (const id of ARC_2) {
      const again = seeScene(save, id)
      expect(again).toEqual({ ok: true, save, firstTime: false, completedChapter: null, reward: null })
    }
  })

  it('pays a skipped scene exactly as a read one: skipping is the same call', () => {
    // The UI skips by seeing the scene; there is no separate path that could lose anything.
    const save = putTowelOut(endOfArc1())
    const result = seeScene(save, scene('behind-cupboard'))
    if (!result.ok) throw new Error(result.reason)
    expect(result.reward).toEqual({ crumbs: 10 })
    expect(noteIds(result.save)).toEqual(expect.arrayContaining(['note_back-board', 'note_tin-card']))
  })

  it('pays a story recipe’s discovery once; baking it again only counts towards mastery', () => {
    const save = tinOpen()
    const first = bakeRecipe(save, STORY_RECIPES.ediesOatCrisp)
    expect(first.progression.crumbs).toBeGreaterThan(save.progression.crumbs)
    const second = bakeRecipe(first, STORY_RECIPES.ediesOatCrisp)
    expect(second.progression).toEqual(first.progression)
    expect(second.discoveredRecipes).toHaveLength(first.discoveredRecipes.length)
    expect(second.recipeBakeCounts[STORY_RECIPES.ediesOatCrisp]).toBe(2)
  })

  it('gives an older kitchen that already finished Arc 2 (an imported save, say) its keepsake on the first settle', () => {
    const imported = makeSave({ story: { seenSceneIds: [...ARC_1, ...ARC_2] } })
    const { save, achievements, decor } = settleSave(imported)
    expect(achievements.map((entry) => entry.id)).toContain('achievement_kept-in-the-tin')
    expect(decor.map((entry) => entry.id)).toContain('decoration_fair-day-photograph')
    expect(settleSave(save).achievements).toEqual([])
  })

  it('never makes the story depend on buying a decoration', () => {
    const starter = DECORATIONS.filter((entry) => entry.unlock.type === 'chapter-complete')
    expect(starter.length).toBeGreaterThan(0)
    for (const entry of starter) expect(entry.unlock.type).not.toBe('crumbs')
  })
})
