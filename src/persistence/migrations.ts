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

/**
 * The Baker XP each recipe was worth when version 4 introduced rarity
 * (Interval 5). Written out literally: if a recipe's rarity or the reward
 * table is ever rebalanced, saves that were already upgraded must not shift.
 */
const V4_DISCOVERY_XP: Readonly<Record<string, number>> = {
  recipe_shortbread: 20,
  'recipe_sugar-cookie': 20,
  'recipe_vanilla-kiss': 40,
  'recipe_chocolate-chip': 20,
  recipe_snickerdoodle: 40,
  'recipe_cocoa-crinkle': 40,
  'recipe_double-chocolate': 120,
  'recipe_oatmeal-cookie': 20,
  'recipe_peanut-butter-cookie': 70,
  'recipe_peanut-butter-chocolate': 120,
  'recipe_honey-flapjack': 200,
  'recipe_coconut-macaroon': 70,
}

/**
 * v3 → v4 (Interval 5, progression):
 * - keeps `pantryIngredientIds` exactly. Earlier kitchens held the whole
 *   catalog, and nothing a player already owned is ever taken back, so a
 *   returning player keeps every ingredient even though new kitchens now
 *   start with five.
 * - adds `progression`. Crumbs start at 0: there's nothing for an existing
 *   kitchen to buy, since it already owns every ingredient. XP is the sum of
 *   what each recipe already in the book is worth, counted once per recipe,
 *   so the Baker Level matches the book. Ids not in the table count for 0.
 *   Those recipes stay discovered, so baking them again earns nothing more.
 * - adds `tutorial`, marked completed: a returning player is never sent
 *   through the first-time tutorial. It can be replayed from Settings.
 */
export function migrateV3ToV4(raw: RawRecord): RawRecord {
  if (!Array.isArray(raw.pantryIngredientIds)) {
    throw new Error('version 3 save has no pantryIngredientIds list')
  }
  const discovered = raw.discoveredRecipes
  if (!Array.isArray(discovered)) {
    throw new Error('version 3 save has no discoveredRecipes list')
  }
  const recipeIds = new Set<string>()
  for (const entry of discovered) {
    if (typeof entry === 'object' && entry !== null && typeof (entry as RawRecord).recipeId === 'string') {
      recipeIds.add((entry as RawRecord).recipeId as string)
    }
  }
  const xp = [...recipeIds].reduce((total, id) => total + (Object.hasOwn(V4_DISCOVERY_XP, id) ? V4_DISCOVERY_XP[id]! : 0), 0)
  return {
    ...raw,
    version: 4,
    progression: { crumbs: 0, xp },
    tutorial: { completed: true, skipped: false },
  }
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
}
