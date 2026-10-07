import type { MascotExpression } from '../components/Mascot'
import type { RecipeId, StoryChapterId, StoryNoteId, StorySceneId } from '../domain/ids'
import type { RecipeFamily } from '../domain/types'

/**
 * The recipe box's story, as static content. Saves only ever hold the ids of
 * scenes the player has seen; everything here is read from source, so a
 * line can be rewritten without touching anyone's save.
 */

/**
 * What has to be true of a kitchen before a scene can be read. Always
 * something the player has already done in the game itself: never a
 * number of bakes, a wait, a login streak or money spent, and never chance.
 */
export type StoryRequirement =
  /** The first-time tutorial is behind them, finished or skipped. */
  | { type: 'tutorial-complete' }
  /** Recipes found, secrets included. */
  | { type: 'recipes-discovered'; count: number }
  /** Recipes found in one family, secrets included. */
  | { type: 'family-discovered'; familyId: RecipeFamily; count: number }
  | { type: 'secret-recipes-discovered'; count: number }
  | { type: 'level'; level: number }
  /** Ingredients on the shelf beyond the starter pantry, however they got there. */
  | { type: 'ingredient-unlocks'; count: number }
  | { type: 'recipe-discovered'; recipeId: RecipeId }
  /** Any one of these: lets a chapter about secrets open without depending on one. */
  | { type: 'any'; of: readonly StoryRequirement[] }

/**
 * How a note looks in the box: a pencilled line beside a recipe (`margin`),
 * a whole index card (`card`), a torn scrap (`scrap`) or a shelf or tin
 * label (`label`). Presentation only.
 */
export type StoryNoteKind = 'margin' | 'card' | 'scrap' | 'label'

/**
 * Something written down that the player finds in the kitchen. Notes are in
 * someone else's hand, not Marmalade's; that contrast is deliberate.
 */
export type StoryNote = {
  id: StoryNoteId
  chapterId: StoryChapterId
  kind: StoryNoteKind
  /** Where it was found, as a short heading: "Pencilled beside the shortbread". */
  title: string
  text: string
  /**
   * Set when the note is a clue to a secret recipe. Never shown: the note
   * has to stand on its own. Once the secret is baked, the box says so.
   */
  secretRecipeId?: RecipeId
}

/** One step of a scene: Marmalade says something, or a note is read out. */
export type StoryBeat =
  | { speaker: 'marmalade'; expression: MascotExpression; line: string }
  | { speaker: 'note'; noteId: StoryNoteId }

export type StoryScene = {
  id: StorySceneId
  /** Must also be met before the scene can be read, on top of every earlier scene being seen. */
  requirement: StoryRequirement
  /** A handful at most, each a line or two. */
  beats: readonly StoryBeat[]
  /** What the kitchen says when this scene turns up, without opening it. */
  nudge: string
}

export type StoryChapter = {
  id: StoryChapterId
  /** 1-based, in reading order. */
  number: number
  title: string
  /** Read in order. The chapter is complete once its last scene has been seen. */
  scenes: readonly StoryScene[]
  /** A small one-time thank-you, paid when the chapter is first completed. Never on a replay. */
  reward: { crumbs: number } | null
}
