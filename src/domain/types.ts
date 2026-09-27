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

/** Not used by gameplay yet; shapes are placeholders for later intervals. */
export type Ingredient = {
  id: IngredientId
  name: string
}

/** Not used by gameplay yet; shapes are placeholders for later intervals. */
export type Recipe = {
  id: RecipeId
  name: string
  ingredientIds: IngredientId[]
}

/** Something the player actually baked. Not used by gameplay yet. */
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
  discoveredRecipeIds: RecipeId[]
  settings: GameSettings
  /** ISO-8601 timestamps. */
  createdAt: string
  updatedAt: string
}
