import type { CreationId, IngredientId, PlayerId, RecipeId, StorySceneId } from './ids'

/**
 * Core domain models. These are intentionally small: they name the concepts
 * later intervals will build on without committing to mechanics that do not
 * exist yet. Add fields when a feature needs them, not before.
 */

export type PlayerProfile = {
  id: PlayerId
  /** What the kitchen calls the player. */
  name: string
  /** The name painted over the kitchen door. */
  bakeryName: string
}

export type MotionPreference = 'system' | 'reduced' | 'full'

export type GameSettings = {
  /** Stored now so the choice survives until audio exists. */
  soundEnabled: boolean
  motion: MotionPreference
}

export type IngredientCategory = 'basic' | 'flavouring'

/** How an ingredient looks in its jar. Presentation reads these; rules never do. */
export type IngredientForm = 'powder' | 'granules' | 'block' | 'eggs' | 'liquid' | 'chips' | 'flakes' | 'spread' | 'fruit' | 'nuts'
export type IngredientSwatch =
  | 'wheat'
  | 'white'
  | 'butter'
  | 'shell'
  | 'amber'
  | 'chocolate'
  | 'cocoa'
  | 'cinnamon'
  | 'oat'
  | 'peanut'
  | 'honey'
  | 'brown-sugar'
  | 'lemon'
  | 'jam'
  | 'salt'
  | 'white-chocolate'
  | 'maple'
  | 'pistachio'

/** Hand-authored, static catalog data. Saves refer to ingredients only by id. */
export type Ingredient = {
  id: IngredientId
  name: string
  description: string
  category: IngredientCategory
  art: { form: IngredientForm; swatch: IngredientSwatch }
}

export type DoughTone = 'pale' | 'golden' | 'spiced' | 'nutty' | 'cocoa' | 'dark' | 'caramel' | 'lemon' | 'snow'
export type CookieTopping =
  | 'none'
  | 'sugar'
  | 'vanilla-flecks'
  | 'chips'
  | 'cinnamon-sugar'
  | 'crinkle'
  | 'oats'
  | 'coconut'
  | 'fork-marks'
  | 'jam-dot'
  | 'zest'
  | 'bubbles'
  | 'white-chips'
  | 'pistachio'
  | 'salt-flakes'
  | 'swirl'
  | 'drizzle'
export type CookieShape = 'round' | 'square' | 'wobbly'

/** Enough to draw a cookie; used by recipes and by experiments. */
export type CookieLook = {
  dough: DoughTone
  topping: CookieTopping
  shape: CookieShape
}

/**
 * How special a recipe is. Authored once per recipe and never rolled: the
 * same recipe is always the same rarity. Ordered from most to least common.
 */
export type CookieRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

/**
 * Which divider a recipe is filed behind in the Recipe Book. Thematic only:
 * a family never decides whether a bake matches, and it says nothing about
 * rarity or secrecy.
 */
export type RecipeFamily = 'classics' | 'chocolate' | 'warm-spiced' | 'nutty' | 'fruity' | 'sweet-sticky' | 'curious'

/**
 * Hand-authored, static catalog data. A recipe is an exact set of ingredients.
 *
 * Three separate dimensions, never derived from each other: `family` (its
 * theme), `rarity` (how special a find it is) and `isSecret` (whether the
 * book admits it exists before it's found).
 */
export type Recipe = {
  id: RecipeId
  name: string
  /** The exact ingredient set that makes this recipe. Order carries no meaning. */
  ingredientIds: readonly IngredientId[]
  description: string
  /** Short flavour/texture words, e.g. "crisp", "buttery". */
  descriptors: readonly string[]
  look: CookieLook
  /** Written on the card the first time the player bakes it. */
  discoveryText: string
  rarity: CookieRarity
  family: RecipeFamily
  /**
   * A secret recipe has no card, count or clue until it's baked: the book
   * doesn't admit it exists. It's still found the ordinary way, by baking
   * exactly its ingredients.
   */
  isSecret: boolean
  /**
   * Marmalade's scribbled hint for an undiscovered card: a feeling, never an
   * ingredient. Null for secrets, which get no clues.
   */
  clue: string | null
}

/** A recipe the player has baked at least once. */
export type DiscoveredRecipe = {
  recipeId: RecipeId
  discoveredAt: string
}

/**
 * One batch the player actually baked: a known recipe or a Kitchen
 * Experiment. Stores ids and a time only; names, descriptions and looks are
 * read from the catalogs when shown, so they can never go stale.
 */
export type CookieCreation = {
  id: CreationId
  /** Normalized (unique, sorted), exactly as it went into the oven. */
  ingredientIds: IngredientId[]
  /** The recipe it matched when baked, or null for a Kitchen Experiment. */
  recipeId: RecipeId | null
  bakedAt: string
}

/**
 * What the player has earned. Only ever grows, except Crumbs, which go down
 * only when the player spends them. The Baker Level is derived from `xp`
 * (see domain/progression), never stored, so the two can't disagree.
 */
export type Progression = {
  crumbs: number
  xp: number
}

export type TutorialState = {
  /** Finished at least once (or arrived from an older save, which never needed it). */
  completed: boolean
  /** Turned down the first time. Either flag means it never starts by itself again. */
  skipped: boolean
}

/**
 * How far the player is through the recipe box's story. Only the scenes
 * they've seen (read to the end or skipped), in the order they saw them.
 * Chapters, notes, clues and what's available next are all worked out from
 * this and the static story content (see story/), so nothing can disagree.
 */
export type StoryState = {
  seenSceneIds: StorySceneId[]
}

export type GameSave = {
  /** Save schema version. Bump it and add a migration when the shape changes. */
  version: number
  profile: PlayerProfile
  /**
   * Ingredients the player owns, in the order they arrived. Owned for good:
   * nothing ever takes one away. Catalog details live in domain/ingredients.
   */
  pantryIngredientIds: IngredientId[]
  /** In the order they were found. Each recipe appears at most once. */
  discoveredRecipes: DiscoveredRecipe[]
  /**
   * Recent bakes, oldest first and newest last, never more than
   * MAX_BAKED_CREATIONS. Separate from discoveries: trimming never touches those.
   */
  bakedCreations: CookieCreation[]
  progression: Progression
  tutorial: TutorialState
  story: StoryState
  settings: GameSettings
  /** ISO-8601 timestamps. */
  createdAt: string
  updatedAt: string
}
