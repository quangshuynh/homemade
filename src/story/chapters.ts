import { defineId, type StoryChapterId, type StorySceneId } from '../domain/ids'
import {
  BEHIND_CUPBOARD,
  EDIES_HAND,
  FADED_BOX,
  FOR_M,
  HIDDEN_RECIPES,
  LAST_CARD,
  MARGINS,
  MARGINS_SPICE,
  OLD_CUPBOARD,
  PHOTOGRAPH,
  RS_LUNCHBOX,
  SECOND_SHELF,
} from './scenes'
import type { StoryChapter, StoryScene } from './types'

/** The cards that Arc 2 is about. Ordinary recipes in the catalog; named here so the story can wait on them. */
export const STORY_RECIPES = {
  ediesOatCrisp: defineId('recipe', 'edies-oat-crisp'),
  lunchboxWindow: defineId('recipe', 'lunchbox-window'),
  fairDayParkin: defineId('recipe', 'fair-day-parkin'),
} as const

/**
 * The recipe box's story, read in one fixed order. The first arc is five
 * short chapters and a short epilogue (Intervals 7 and 8); the second is
 * five chapters about the tin behind the cupboard (Interval 10). Each scene waits for every scene before it, and for something the
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
    arc: 1,
    title: 'The Faded Recipe Box',
    reward: null,
    scenes: [{ id: defineId('scene', 'faded-box'), requirement: { type: 'tutorial-complete' }, ...FADED_BOX }],
  },
  {
    id: defineId('chapter', 'margins'),
    number: 2,
    arc: 1,
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
    arc: 1,
    title: 'The Second Shelf',
    reward: { crumbs: 15 },
    scenes: [{ id: defineId('scene', 'second-shelf'), requirement: { type: 'ingredient-unlocks', count: 3 }, ...SECOND_SHELF }],
  },
  {
    id: defineId('chapter', 'hidden-recipes'),
    number: 4,
    arc: 1,
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
    arc: 1,
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
  // Interval 8: a short epilogue, not a new arc. The brass key finally fits
  // something. The cupboard opens as soon as Chapter 5 ends (see decorating/);
  // this scene is what's found inside, read here or the first time the
  // cupboard is opened in the kitchen. Its reward is the cupboard itself.
  {
    id: defineId('chapter', 'old-cupboard'),
    number: 6,
    arc: 1,
    title: 'The Old Cupboard',
    reward: null,
    scenes: [{ id: defineId('scene', 'old-cupboard'), requirement: { type: 'straight-after' }, ...OLD_CUPBOARD }],
  },

  // ---- Arc 2 (Interval 10): the tin behind the cupboard. The same rules as
  // the first arc: each scene waits for the one before it and for one thing
  // done in the kitchen. The three story cards (domain/recipes.ts) are
  // ordinary recipes, each hinted at in the chapter before the one it opens.
  // Only one step asks for a recipe more than once, and never past Familiar.
  {
    id: defineId('chapter', 'behind-cupboard'),
    number: 7,
    arc: 2,
    title: 'Behind the Cupboard',
    reward: { crumbs: 10 },
    // Taking something out of the cupboard is what shows its back board. The starter set is free, so this never costs Crumbs.
    scenes: [{ id: defineId('scene', 'behind-cupboard'), requirement: { type: 'decoration-out' }, ...BEHIND_CUPBOARD }],
  },
  {
    id: defineId('chapter', 'edies-hand'),
    number: 8,
    arc: 2,
    title: 'E.’s Handwriting',
    reward: { crumbs: 15 },
    scenes: [{ id: defineId('scene', 'edies-hand'), requirement: { type: 'recipe-discovered', recipeId: STORY_RECIPES.ediesOatCrisp }, ...EDIES_HAND }],
  },
  {
    id: defineId('chapter', 'rs-lunchbox'),
    number: 9,
    arc: 2,
    title: 'R.’s Lunchbox',
    reward: { crumbs: 15 },
    scenes: [{ id: defineId('scene', 'rs-lunchbox'), requirement: { type: 'recipe-discovered', recipeId: STORY_RECIPES.lunchboxWindow }, ...RS_LUNCHBOX }],
  },
  {
    id: defineId('chapter', 'photograph'),
    number: 10,
    arc: 2,
    title: 'The Photograph',
    reward: { crumbs: 20 },
    // Two more bakes of R.'s lunchbox biscuit (three in all) are what jog Marmalade's memory. The story's only mastery step.
    scenes: [
      {
        id: defineId('scene', 'photograph'),
        requirement: { type: 'mastery-stage', recipeId: STORY_RECIPES.lunchboxWindow, stage: 'familiar' },
        ...PHOTOGRAPH,
      },
    ],
  },
  {
    id: defineId('chapter', 'for-m'),
    number: 11,
    arc: 2,
    title: 'For M.',
    // Its reward is the framed photograph, through its keepsake (keepsakes/catalog.ts).
    reward: null,
    scenes: [{ id: defineId('scene', 'for-m'), requirement: { type: 'recipe-discovered', recipeId: STORY_RECIPES.fairDayParkin }, ...FOR_M }],
  },
]

/** Whether this chapter is the last of its arc, so finishing it can be marked (and heard) as the end of something. */
export function isArcEnd(chapter: StoryChapter): boolean {
  return STORY_CHAPTERS.filter((entry) => entry.arc === chapter.arc).at(-1)?.id === chapter.id
}

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
