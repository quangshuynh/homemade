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

/** The ingredients added to the catalog in Interval 3, when version 3 was introduced. */
const V3_NEW_INGREDIENTS = ['ingredient_oats', 'ingredient_peanut-butter', 'ingredient_honey', 'ingredient_coconut']

/**
 * v2 → v3 (Interval 3, baking memories):
 * - adds `bakedCreations`, empty. Past bakes were never recorded, so none
 *   are invented, not even from discoveries.
 * - puts the new Interval 3 ingredients on the shelf. Every pantry has
 *   always held the whole catalog and there's no other way to gain an
 *   ingredient, so without this a returning player could never bake the
 *   new recipes. Existing entries are kept exactly, in order.
 */
export function migrateV2ToV3(raw: RawRecord): RawRecord {
  const pantry = raw.pantryIngredientIds
  if (!Array.isArray(pantry)) {
    throw new Error('version 2 save has no pantryIngredientIds list')
  }
  if (!Array.isArray(raw.discoveredRecipes)) {
    throw new Error('version 2 save has no discoveredRecipes list')
  }
  return {
    ...raw,
    version: 3,
    pantryIngredientIds: [...pantry, ...V3_NEW_INGREDIENTS.filter((id) => !pantry.includes(id))],
    bakedCreations: [],
  }
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
}
