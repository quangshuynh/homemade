import { defineId, type StoryChapterId, type StorySceneId } from '../domain/ids'
import { FADED_BOX, HIDDEN_RECIPES, LAST_CARD, MARGINS, MARGINS_SPICE, SECOND_SHELF } from './scenes'
import type { StoryChapter, StoryScene } from './types'

/**
 * The first arc of the recipe box's story: five short chapters, read in
 * order. Each scene waits for every scene before it, and for something the
 * player has done in the kitchen (see requirements.ts). Nothing waits on
 * time, on how often they bake, or on chance.
 *
 * The milestones follow the game: the tutorial, a few cards back, a first
 * spiced card, a few jars added, a secret (or a well-filled box), the first
 * Mythic. None of them needs a secret, and none needs a family finished.
 *
 * Rewards are small and one-time: a bonus, never the reason to read, and
 * never needed for anything. Progression is balanced without them.
 *
 * Never reuse or rename an id once shipped; saves record seen scenes by id.
 */

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: defineId('chapter', 'faded-box'),
    number: 1,
    title: 'The Faded Recipe Box',
    reward: null,
    scenes: [{ id: defineId('scene', 'faded-box'), requirement: { type: 'tutorial-complete' }, ...FADED_BOX }],
  },
  {
    id: defineId('chapter', 'margins'),
    number: 2,
    title: 'Notes in the Margins',
    reward: { crumbs: 10 },
    scenes: [
      { id: defineId('scene', 'margins'), requirement: { type: 'recipes-discovered', count: 4 }, ...MARGINS },
      { id: defineId('scene', 'margins-spice'), requirement: { type: 'family-discovered', familyId: 'warm-spiced', count: 1 }, ...MARGINS_SPICE },
    ],
  },
  {
    id: defineId('chapter', 'second-shelf'),
    number: 3,
    title: 'The Second Shelf',
    reward: { crumbs: 15 },
    scenes: [{ id: defineId('scene', 'second-shelf'), requirement: { type: 'ingredient-unlocks', count: 3 }, ...SECOND_SHELF }],
  },
  {
    id: defineId('chapter', 'hidden-recipes'),
    number: 4,
    title: 'Recipes Someone Hid',
    reward: { crumbs: 20 },
    scenes: [
      {
        id: defineId('scene', 'hidden-recipes'),
        // A first secret opens it, but so does a well-filled box: the story never depends on a secret.
        requirement: {
          type: 'any',
          of: [
            { type: 'secret-recipes-discovered', count: 1 },
            { type: 'recipes-discovered', count: 12 },
          ],
        },
        ...HIDDEN_RECIPES,
      },
    ],
  },
  {
    id: defineId('chapter', 'last-card'),
    number: 5,
    title: 'The Last Card',
    reward: { crumbs: 25 },
    scenes: [
      {
        id: defineId('scene', 'last-card'),
        requirement: { type: 'recipe-discovered', recipeId: defineId('recipe', 'millionaires-shortbread') },
        ...LAST_CARD,
      },
    ],
  },
]

export type PlacedScene = { chapter: StoryChapter; scene: StoryScene; isLast: boolean }

/** Every scene in reading order, with its chapter. */
export const STORY_SCENES: readonly PlacedScene[] = STORY_CHAPTERS.flatMap((chapter) =>
  chapter.scenes.map((scene, index) => ({ chapter, scene, isLast: index === chapter.scenes.length - 1 })),
)

const chaptersById = new Map(STORY_CHAPTERS.map((chapter) => [chapter.id, chapter]))
const scenesById = new Map(STORY_SCENES.map((placed) => [placed.scene.id, placed]))

export function findChapter(id: StoryChapterId): StoryChapter | undefined {
  return chaptersById.get(id)
}

export function findScene(id: StorySceneId): PlacedScene | undefined {
  return scenesById.get(id)
}
