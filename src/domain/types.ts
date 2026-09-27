import type { CreationId, IngredientId, PlayerId, RecipeId } from './ids'

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
export type IngredientForm = 'powder' | 'granules' | 'block' | 'eggs' | 'liquid' | 'chips'
export type IngredientSwatch = 'wheat' | 'white' | 'butter' | 'shell' | 'amber' | 'chocolate' | 'cocoa' | 'cinnamon'

/** Hand-authored, static catalog data. Saves refer to ingredients only by id. */
export type Ingredient = {
  id: IngredientId
  name: string
  description: string
  category: IngredientCategory
  art: { form: IngredientForm; swatch: IngredientSwatch }
}

export type DoughTone = 'pale' | 'golden' | 'spiced' | 'cocoa' | 'dark'
export type CookieTopping = 'none' | 'sugar' | 'vanilla-flecks' | 'chips' | 'cinnamon-sugar' | 'crinkle'
export type CookieShape = 'round' | 'square' | 'wobbly'

/** Enough to draw a cookie; used by recipes and by experiments. */
export type CookieLook = {
  dough: DoughTone
  topping: CookieTopping
  shape: CookieShape
}

/** Hand-authored, static catalog data. A recipe is an exact set of ingredients. */
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
}

/** A recipe the player has baked at least once. */
export type DiscoveredRecipe = {
  recipeId: RecipeId
  discoveredAt: string
}

/**
 * Something the player actually baked. Not stored yet: nothing reads past
 * batches, and keeping every one would grow saves without a use. See README.
 */
export type CookieCreation = {
  id: CreationId
  recipeId: RecipeId | null
  ingredientIds: IngredientId[]
  bakedAt: string
}

export type GameSave = {
  /** Save schema version. Bump it and add a migration when the shape changes. */
  version: number
  profile: PlayerProfile
  /** Ingredients on the player's shelves. Catalog details live in domain/ingredients. */
  pantryIngredientIds: IngredientId[]
  /** In the order they were found. Each recipe appears at most once. */
  discoveredRecipes: DiscoveredRecipe[]
  settings: GameSettings
  /** ISO-8601 timestamps. */
  createdAt: string
  updatedAt: string
}
