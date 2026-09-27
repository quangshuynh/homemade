import type { BakeResult } from './baking'
import { createId, type CreationId } from './ids'
import type { CookieCreation, GameSave } from './types'

/**
 * Baking memories: every completed bake is remembered as a CookieCreation.
 *
 * - One bake, one creation: recipes, rebakes and experiments alike.
 * - The history is bounded. Past MAX_BAKED_CREATIONS the oldest are let go.
 * - It never affects discovery: trimming touches only `bakedCreations`.
 * - It stores ids and a time. What a creation is called and looks like is
 *   read from the catalogs when shown.
 */

/** How many recent bakes the kitchen remembers. */
export const MAX_BAKED_CREATIONS = 50

export function newCreationId(): CreationId {
  return createId('creation')
}

export function makeCreation(result: BakeResult, now: Date, id: CreationId): CookieCreation {
  return {
    id,
    ingredientIds: [...result.ingredientIds],
    recipeId: result.kind === 'recipe' ? result.recipe.id : null,
    bakedAt: now.toISOString(),
  }
}

/** Appends the newest creation and lets go of the oldest beyond the cap. */
export function addCreation(
  history: readonly CookieCreation[],
  creation: CookieCreation,
  limit: number = MAX_BAKED_CREATIONS,
): CookieCreation[] {
  const next = [...history, creation]
  return next.length > limit ? next.slice(next.length - limit) : next
}

/**
 * Newest first. Order comes from the order things were baked (the save keeps
 * them oldest first), not from clock times, so it is deterministic even if
 * the device clock ever jumped backwards.
 */
export function recentCreations(save: GameSave, count: number = MAX_BAKED_CREATIONS): CookieCreation[] {
  return save.bakedCreations.slice(-count).reverse()
}
