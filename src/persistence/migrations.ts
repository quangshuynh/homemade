/**
 * Save migrations, keyed by the version each one upgrades *from*.
 *
 * Rules for writing one:
 * - Upgrade exactly one version: return data shaped for `from + 1`, with `version` set.
 * - Never read the live catalogs or constants: a migration describes the past
 *   and must keep doing the same thing forever. Write values out literally.
 * - Throw if the data isn't what that version should contain. `readSave`
 *   turns the throw into a "migration-failed" result; nothing is discarded.
 * - Don't touch `updatedAt`: an upgrade is not something the player did.
 *
 * Then bump CURRENT_SAVE_VERSION and update `findSaveProblem` for the new shape.
 */

export type RawRecord = Record<string, unknown>

/** Upgrades a save written at `from` into the shape of `from + 1`. */
export type Migration = (raw: RawRecord) => RawRecord

/** Every ingredient that existed when version 2 was introduced (Interval 2). */
const V2_STARTER_PANTRY = [
  'ingredient_flour',
  'ingredient_sugar',
  'ingredient_butter',
  'ingredient_egg',
  'ingredient_chocolate-chips',
  'ingredient_vanilla',
  'ingredient_cocoa',
  'ingredient_cinnamon',
]

/**
 * v1 → v2 (Interval 2, first baking loop):
 * - adds `pantryIngredientIds`, stocked with the starter ingredients;
 * - replaces `discoveredRecipeIds` with `discoveredRecipes`, which also
 *   records when each was found. v1 had no recipes to discover, but any ids
 *   present are kept (deduplicated), dated to the save's last update.
 */
export function migrateV1ToV2(raw: RawRecord): RawRecord {
  const { discoveredRecipeIds, ...rest } = raw
  if (!Array.isArray(discoveredRecipeIds)) {
    throw new Error('version 1 save has no discoveredRecipeIds list')
  }
  if (typeof raw.updatedAt !== 'string') {
    throw new Error('version 1 save has no updatedAt')
  }
  const discoveredAt = raw.updatedAt
  return {
    ...rest,
    version: 2,
    pantryIngredientIds: [...V2_STARTER_PANTRY],
    discoveredRecipes: [...new Set(discoveredRecipeIds)].map((recipeId) => ({ recipeId, discoveredAt })),
  }
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1ToV2,
}
