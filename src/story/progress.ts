import type { StorySceneId } from '../domain/ids'
import { addReward } from '../domain/progression'
import type { GameSave } from '../domain/types'
import { STORY_CHAPTERS, STORY_SCENES, findScene, type PlacedScene } from './chapters'
import { getNote } from './notes'
import { meetsRequirement } from './requirements'
import type { StoryChapter, StoryNote } from './types'

/**
 * Story progress, worked out from the save's list of seen scenes and the
 * static story. The UI asks these questions and never answers them itself.
 *
 * The rules this file keeps:
 * - Scenes are read in one fixed order. Only the first unseen scene can be
 *   open, and only once its requirement is met. If several requirements are
 *   met at once, the rest wait their turn behind it: a queue, not a stack
 *   of pop-ups, and the same queue for everyone.
 * - A scene counts as seen when the player reaches its end or skips it.
 *   Skipping takes nothing away: the notes, clues and reward still arrive.
 * - A chapter is complete once every one of its scenes has been seen, never
 *   just because its requirements are met.
 * - Notes (and the secret clues among them) are unlocked by seeing the scene
 *   they're read out in. Nothing about them is saved.
 * - A chapter's reward is paid once, as its last scene is first seen.
 *   Replaying a scene changes nothing at all.
 */

export function hasSeenScene(save: GameSave, id: StorySceneId): boolean {
  return save.story.seenSceneIds.includes(id)
}

/** The first scene in reading order the player hasn't seen, whether or not it's ready. */
export function nextScene(save: GameSave): PlacedScene | null {
  return STORY_SCENES.find((placed) => !hasSeenScene(save, placed.scene.id)) ?? null
}

/** The scene waiting to be read right now, if there is one. At most one at a time. */
export function availableScene(save: GameSave): PlacedScene | null {
  const next = nextScene(save)
  return next && meetsRequirement(save, next.scene.requirement) ? next : null
}

/** How many scenes are ready to read back to back, starting with the available one. For tests and the catch-up policy. */
export function readyScenes(save: GameSave): PlacedScene[] {
  const ready: PlacedScene[] = []
  for (const placed of STORY_SCENES) {
    if (hasSeenScene(save, placed.scene.id)) continue
    if (!meetsRequirement(save, placed.scene.requirement)) break
    ready.push(placed)
  }
  return ready
}

export function isChapterComplete(save: GameSave, chapter: StoryChapter): boolean {
  return chapter.scenes.every((scene) => hasSeenScene(save, scene.id))
}

/** Chapters finished, in reading order. */
export function completedChapters(save: GameSave): StoryChapter[] {
  return STORY_CHAPTERS.filter((chapter) => isChapterComplete(save, chapter))
}

/** The chapter the player is in: the first one not complete, or null once the arc is finished. */
export function currentChapter(save: GameSave): StoryChapter | null {
  return STORY_CHAPTERS.find((chapter) => !isChapterComplete(save, chapter)) ?? null
}

function notesIn(placed: PlacedScene): StoryNote[] {
  return placed.scene.beats.flatMap((beat) => (beat.speaker === 'note' ? [getNote(beat.noteId)] : []))
}

/** Every note the player has found, in the order the story reads them out. */
export function unlockedNotes(save: GameSave): StoryNote[] {
  return STORY_SCENES.filter((placed) => hasSeenScene(save, placed.scene.id)).flatMap(notesIn)
}

/** Notes that point at a secret, once found. The only secret clues there are. */
export function unlockedSecretClues(save: GameSave): StoryNote[] {
  return unlockedNotes(save).filter((note) => note.secretRecipeId !== undefined)
}

export type ChapterView = {
  chapter: StoryChapter
  complete: boolean
  /** Scenes seen so far, in order: the ones that can be replayed. */
  seenScenes: PlacedScene[]
  notes: StoryNote[]
}

/**
 * What the Recipe Box Notes can show: chapters with at least one scene seen.
 * Chapters still to come aren't listed at all, so not even a title gives
 * the story away.
 */
export function chapterViews(save: GameSave): ChapterView[] {
  return STORY_CHAPTERS.flatMap((chapter) => {
    const seenScenes = STORY_SCENES.filter((placed) => placed.chapter.id === chapter.id && hasSeenScene(save, placed.scene.id))
    if (seenScenes.length === 0) return []
    return [{ chapter, complete: isChapterComplete(save, chapter), seenScenes, notes: seenScenes.flatMap(notesIn) }]
  })
}

export type SeeSceneResult =
  | {
      ok: true
      save: GameSave
      /** False for a scene already seen: a replay, which changes nothing. */
      firstTime: boolean
      /** The chapter this finished, if it did. */
      completedChapter: StoryChapter | null
      /** What finishing the chapter paid, if anything. */
      reward: { crumbs: number } | null
    }
  | { ok: false; reason: 'unknown-scene' | 'not-available' }

/**
 * Records that the player has seen a scene, by reading to the end or by
 * skipping it. A scene already seen is a replay: the same save comes back,
 * untouched. A scene that isn't open yet is refused, changing nothing.
 */
export function seeScene(save: GameSave, id: StorySceneId): SeeSceneResult {
  const placed = findScene(id)
  if (!placed) return { ok: false, reason: 'unknown-scene' }
  if (hasSeenScene(save, id)) return { ok: true, save, firstTime: false, completedChapter: null, reward: null }
  if (availableScene(save)?.scene.id !== id) return { ok: false, reason: 'not-available' }

  const seen: GameSave = { ...save, story: { ...save.story, seenSceneIds: [...save.story.seenSceneIds, id] } }
  const completedChapter = isChapterComplete(seen, placed.chapter) ? placed.chapter : null
  const reward = completedChapter?.reward ?? null
  const next = reward ? { ...seen, progression: addReward(seen.progression, { crumbs: reward.crumbs, xp: 0 }) } : seen
  return { ok: true, save: next, firstTime: true, completedChapter, reward }
}

/** Something new in the recipe box, said quietly where the player already is. */
export type StoryNews = {
  scene: PlacedScene
  /** "A new note turned up…": the scene's own nudge. */
  nudge: string
}

/**
 * The one place that decides whether something the player just did (a bake,
 * a new ingredient, a level, finishing the tutorial) opened the story up.
 * Given the save before and after, returns the scene that has just become
 * readable, or null. However many milestones one action crosses, there is
 * at most one piece of news: the next scene in the queue.
 */
export function evaluateStoryProgress(before: GameSave, after: GameSave): StoryNews | null {
  const now = availableScene(after)
  if (!now || availableScene(before)?.scene.id === now.scene.id) return null
  return { scene: now, nudge: now.scene.nudge }
}
