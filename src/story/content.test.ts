import { describe, expect, it } from 'vitest'
import { INGREDIENTS } from '../domain/ingredients'
import { findRecipeById, RECIPES } from '../domain/recipes'
import { RECIPE_FAMILIES } from '../domain/recipeBook'
import { STORY_CHAPTERS, STORY_SCENES } from './chapters'
import { STORY_NOTES } from './notes'
import type { StoryRequirement } from './types'

/**
 * Checks on the story content itself, like the recipe catalog's: the kind of
 * mistake that's easy to write and hard to spot in play.
 */

const beats = STORY_SCENES.flatMap((placed) => placed.scene.beats.map((beat) => ({ placed, beat })))

function flatten(requirement: StoryRequirement): StoryRequirement[] {
  return requirement.type === 'any' ? requirement.of.flatMap(flatten) : [requirement]
}

describe('story content', () => {
  it('uses unique ids everywhere', () => {
    const ids = [...STORY_CHAPTERS.map((chapter) => chapter.id), ...STORY_SCENES.map((placed) => placed.scene.id), ...STORY_NOTES.map((note) => note.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('numbers chapters 1 to 5 in order, each with at least one scene', () => {
    expect(STORY_CHAPTERS.map((chapter) => chapter.number)).toEqual([1, 2, 3, 4, 5])
    for (const chapter of STORY_CHAPTERS) expect(chapter.scenes.length, chapter.title).toBeGreaterThan(0)
  })

  it('keeps scenes short: a handful of beats, each a line or two', () => {
    for (const placed of STORY_SCENES) {
      expect(placed.scene.beats.length, placed.scene.id).toBeGreaterThanOrEqual(3)
      expect(placed.scene.beats.length, placed.scene.id).toBeLessThanOrEqual(7)
    }
    for (const { placed, beat } of beats) {
      if (beat.speaker === 'marmalade') expect(beat.line.length, `${placed.scene.id}: ${beat.line}`).toBeLessThanOrEqual(160)
    }
    for (const note of STORY_NOTES) expect(note.text.length, note.id).toBeLessThanOrEqual(180)
  })

  it('has Marmalade in every scene', () => {
    for (const placed of STORY_SCENES) expect(placed.scene.beats.some((beat) => beat.speaker === 'marmalade'), placed.scene.id).toBe(true)
  })

  it('reads every note out in exactly one scene, in the chapter it says it belongs to', () => {
    const noteBeats = beats.flatMap(({ placed, beat }) => (beat.speaker === 'note' ? [{ placed, noteId: beat.noteId }] : []))
    expect(noteBeats.map((entry) => entry.noteId).sort()).toEqual(STORY_NOTES.map((note) => note.id).sort())
    for (const { placed, noteId } of noteBeats) {
      expect(STORY_NOTES.find((note) => note.id === noteId)?.chapterId, noteId).toBe(placed.chapter.id)
    }
  })

  it('gives every secret recipe exactly one clue, and points clues only at secrets', () => {
    const clues = STORY_NOTES.filter((note) => note.secretRecipeId)
    for (const note of clues) expect(findRecipeById(note.secretRecipeId!)?.isSecret, note.id).toBe(true)
    expect(clues.map((note) => note.secretRecipeId).sort()).toEqual(
      RECIPES.filter((recipe) => recipe.isSecret)
        .map((recipe) => recipe.id)
        .sort(),
    )
  })

  it('never names an ingredient or a secret in a note: notes hint, they don’t solve', () => {
    const words = [
      ...INGREDIENTS.flatMap((ingredient) => [ingredient.name.toLowerCase(), ingredient.id.replace(/^ingredient_/, '').replace(/-/g, ' ')]),
      ...RECIPES.filter((recipe) => recipe.isSecret).map((recipe) => recipe.name.toLowerCase()),
      // Common nicknames that would give a secret clue away just as surely.
      'chocolate',
      'peanut',
      'pistachio',
      'coconut',
      'jam',
      'honey',
      'baklava',
    ]
    for (const note of STORY_NOTES) {
      const text = `${note.title} ${note.text}`.toLowerCase()
      for (const word of words) expect(text, `${note.id} names "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`))
    }
  })

  it('only asks for things that exist and can be done', () => {
    const families = RECIPE_FAMILIES.map((family) => family.id)
    for (const placed of STORY_SCENES) {
      for (const requirement of flatten(placed.scene.requirement)) {
        if (requirement.type === 'recipe-discovered') expect(findRecipeById(requirement.recipeId), placed.scene.id).toBeDefined()
        if (requirement.type === 'family-discovered') expect(families, placed.scene.id).toContain(requirement.familyId)
        if ('count' in requirement) expect(requirement.count, placed.scene.id).toBeGreaterThan(0)
      }
    }
  })

  it('never names a secret recipe as a requirement: the story can’t wait on one', () => {
    for (const placed of STORY_SCENES) {
      for (const requirement of flatten(placed.scene.requirement)) {
        if (requirement.type === 'recipe-discovered') expect(findRecipeById(requirement.recipeId)?.isSecret, placed.scene.id).toBe(false)
      }
    }
  })

  it('keeps rewards small and one-time: Crumbs only, never more than 25 a chapter', () => {
    for (const chapter of STORY_CHAPTERS) {
      if (chapter.reward) {
        expect(Object.keys(chapter.reward)).toEqual(['crumbs'])
        expect(chapter.reward.crumbs).toBeLessThanOrEqual(25)
      }
    }
  })

  it('gives every scene a short nudge to leave where the player already is', () => {
    for (const placed of STORY_SCENES) {
      expect(placed.scene.nudge.length, placed.scene.id).toBeGreaterThan(0)
      expect(placed.scene.nudge.length, placed.scene.id).toBeLessThanOrEqual(80)
    }
  })
})
