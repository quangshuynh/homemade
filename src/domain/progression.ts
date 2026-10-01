import type { IngredientId } from './ids'
import {
  BROWN_SUGAR,
  CHOCOLATE_CHIPS,
  CINNAMON,
  COCOA,
  COCONUT,
  findIngredient,
  HONEY,
  LEMON,
  MAPLE_SYRUP,
  OATS,
  PEANUT_BUTTER,
  PISTACHIO,
  SEA_SALT,
  STRAWBERRY_JAM,
  WHITE_CHOCOLATE,
} from './ingredients'
import type { CookieRarity, GameSave, Progression, Recipe } from './types'

/**
 * Progression: rarity rewards, Crumbs, Baker XP and levels, and the
 * ingredients that levels and Crumbs open up. Every number lives here, so the
 * game can be rebalanced in one place, and the UI never works a reward out
 * for itself.
 *
 * The rules this file keeps:
 * - Rewards come from first discoveries. Rebakes and experiments earn nothing.
 * - One currency, Crumbs. Earned, kept, spent only by the player; never
 *   bought, never decaying, never needed to bake.
 * - Levels open up ingredients. They never make baking faster, luckier or
 *   better: there are no stats.
 * - Everything is deterministic. Nothing is rolled.
 */

/** Most common first. */
export const RARITIES: readonly CookieRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

export const RARITY_LABELS: Record<CookieRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
}

export type DiscoveryReward = {
  rarity: CookieRarity
  crumbs: number
  xp: number
}

/** What a first discovery of each rarity is worth. */
export const RARITY_REWARDS: Record<CookieRarity, { crumbs: number; xp: number }> = {
  common: { crumbs: 15, xp: 20 },
  uncommon: { crumbs: 25, xp: 40 },
  rare: { crumbs: 40, xp: 70 },
  epic: { crumbs: 75, xp: 120 },
  legendary: { crumbs: 150, xp: 200 },
  mythic: { crumbs: 300, xp: 320 },
}

/** A small, one-time thank-you for each ingredient added to the pantry. */
export const INGREDIENT_UNLOCK_XP = 10

/**
 * Total XP needed for each Baker Level: index 0 is Level 1. Finite on
 * purpose, and only ever extended at the end, so nobody's level moves.
 *
 * Levels 1–10 are unchanged from Interval 5. Level 11 (Interval 6) exists
 * for one reason: it opens sea salt, the last ingredient the first Mythic
 * needs. It sits where a player has found most of what the other
 * ingredients allow, and well short of everything, so it never depends on
 * secrets. Later content extends the curve again.
 */
export const LEVEL_THRESHOLDS: readonly number[] = [0, 40, 100, 170, 250, 340, 440, 560, 700, 850, 1100]

export const MAX_LEVEL = LEVEL_THRESHOLDS.length

export type IngredientUnlock = {
  ingredientId: IngredientId
  /** The Baker Level that makes it available. */
  level: number
  /** What it costs, once. */
  crumbs: number
}

/**
 * Everything not in the starter pantry, and what it takes to add it. Ordered
 * as the pantry lists them: by level, then cost. Balanced so no order of
 * choices can leave a player stuck, whether they started fresh or arrived
 * from an older save, and without ever counting on a secret
 * (progression.test checks every reachable pantry).
 *
 * Interval 5's seven keep their levels and costs. The Interval 6 additions
 * are cheaper than their level suggests on purpose: a kitchen upgraded from
 * Interval 4 owns the old twelve but started Interval 5 with no Crumbs, and
 * must still be able to buy its way in. Most of them also make something
 * with just the starter pantry, so adding one is never a dead end.
 */
export const INGREDIENT_UNLOCKS: readonly IngredientUnlock[] = [
  { ingredientId: CHOCOLATE_CHIPS, level: 2, crumbs: 20 },
  { ingredientId: CINNAMON, level: 2, crumbs: 20 },
  { ingredientId: STRAWBERRY_JAM, level: 3, crumbs: 20 },
  { ingredientId: OATS, level: 3, crumbs: 25 },
  { ingredientId: COCOA, level: 3, crumbs: 30 },
  { ingredientId: LEMON, level: 4, crumbs: 25 },
  { ingredientId: COCONUT, level: 4, crumbs: 40 },
  { ingredientId: BROWN_SUGAR, level: 5, crumbs: 25 },
  { ingredientId: PEANUT_BUTTER, level: 5, crumbs: 60 },
  { ingredientId: HONEY, level: 6, crumbs: 100 },
  { ingredientId: WHITE_CHOCOLATE, level: 7, crumbs: 35 },
  { ingredientId: MAPLE_SYRUP, level: 8, crumbs: 35 },
  { ingredientId: PISTACHIO, level: 9, crumbs: 40 },
  { ingredientId: SEA_SALT, level: 11, crumbs: 60 },
]

const unlocksById = new Map(INGREDIENT_UNLOCKS.map((unlock) => [unlock.ingredientId, unlock]))

export function findUnlock(id: IngredientId): IngredientUnlock | undefined {
  return unlocksById.get(id)
}

// ---------------------------------------------------------------- levels

/** The level a total of XP has reached. Never below 1 or above MAX_LEVEL. */
export function levelForXp(xp: number): number {
  let level = 1
  for (let index = 1; index < LEVEL_THRESHOLDS.length; index++) {
    if (xp >= LEVEL_THRESHOLDS[index]!) level = index + 1
  }
  return level
}

export type LevelProgress = {
  level: number
  xp: number
  /** Total XP the next level needs, or null at the top of the curve. */
  nextLevelXp: number | null
  /** 0–1 through the current level; 1 at the top. */
  fraction: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp)
  if (level >= MAX_LEVEL) return { level, xp, nextLevelXp: null, fraction: 1 }
  const floor = LEVEL_THRESHOLDS[level - 1]!
  const next = LEVEL_THRESHOLDS[level]!
  return { level, xp, nextLevelXp: next, fraction: (xp - floor) / (next - floor) }
}

export function currentLevel(save: GameSave): number {
  return levelForXp(save.progression.xp)
}

export type LevelUp = {
  from: number
  to: number
  /** Ingredients that became available with these levels and aren't owned yet. */
  newlyAvailable: IngredientId[]
}

/** What changed between two XP totals, or null if the level didn't. One entry however many levels were crossed. */
export function levelUpBetween(beforeXp: number, afterXp: number, owned: readonly IngredientId[]): LevelUp | null {
  const from = levelForXp(beforeXp)
  const to = levelForXp(afterXp)
  if (to <= from) return null
  const newlyAvailable = INGREDIENT_UNLOCKS.filter(
    (unlock) => unlock.level > from && unlock.level <= to && !owned.includes(unlock.ingredientId),
  ).map((unlock) => unlock.ingredientId)
  return { from, to, newlyAvailable }
}

// ---------------------------------------------------------------- discovery rewards

export function discoveryReward(recipe: Recipe): DiscoveryReward {
  const { crumbs, xp } = RARITY_REWARDS[recipe.rarity]
  return { rarity: recipe.rarity, crumbs, xp }
}

export function addReward(progression: Progression, reward: { crumbs: number; xp: number }): Progression {
  return { crumbs: progression.crumbs + reward.crumbs, xp: progression.xp + reward.xp }
}

// ---------------------------------------------------------------- ingredient unlocks

export type UnlockBlocker = 'owned' | 'not-for-sale' | 'level' | 'crumbs'

export type UnlockStatus =
  | { kind: 'owned' }
  | { kind: 'not-for-sale' }
  | { kind: 'available'; unlock: IngredientUnlock }
  | { kind: 'needs-level'; unlock: IngredientUnlock; level: number }
  | { kind: 'needs-crumbs'; unlock: IngredientUnlock; short: number }

/** Where an ingredient stands for this player, and if it can't be added yet, exactly why. */
export function unlockStatus(save: GameSave, id: IngredientId): UnlockStatus {
  if (save.pantryIngredientIds.includes(id)) return { kind: 'owned' }
  const unlock = findUnlock(id)
  if (!unlock || !findIngredient(id)) return { kind: 'not-for-sale' }
  const level = currentLevel(save)
  if (level < unlock.level) return { kind: 'needs-level', unlock, level }
  if (save.progression.crumbs < unlock.crumbs) return { kind: 'needs-crumbs', unlock, short: unlock.crumbs - save.progression.crumbs }
  return { kind: 'available', unlock }
}

/** Ingredients the player doesn't have yet, in pantry order. */
export function lockedIngredients(save: GameSave): IngredientUnlock[] {
  return INGREDIENT_UNLOCKS.filter((unlock) => !save.pantryIngredientIds.includes(unlock.ingredientId))
}

/** The not-yet-owned ingredient with the lowest level requirement: the next thing to aim for. */
export function nextUnlock(save: GameSave): IngredientUnlock | null {
  return lockedIngredients(save).reduce<IngredientUnlock | null>((best, unlock) => (!best || unlock.level < best.level ? unlock : best), null)
}

export type UnlockResult =
  | { ok: true; save: GameSave; ingredientId: IngredientId; spent: number; xp: number; levelUp: LevelUp | null }
  | { ok: false; reason: UnlockBlocker }

/**
 * Adds an ingredient to the pantry for good: checks the level, takes the
 * Crumbs, gives the small XP thank-you, all in one next save. Refuses,
 * changing nothing, if anything isn't right.
 */
export function unlockIngredient(save: GameSave, id: IngredientId): UnlockResult {
  const status = unlockStatus(save, id)
  switch (status.kind) {
    case 'owned':
    case 'not-for-sale':
      return { ok: false, reason: status.kind }
    case 'needs-level':
      return { ok: false, reason: 'level' }
    case 'needs-crumbs':
      return { ok: false, reason: 'crumbs' }
    case 'available': {
      const { unlock } = status
      const pantry = [...save.pantryIngredientIds, id]
      const progression = { crumbs: save.progression.crumbs - unlock.crumbs, xp: save.progression.xp + INGREDIENT_UNLOCK_XP }
      return {
        ok: true,
        save: { ...save, pantryIngredientIds: pantry, progression },
        ingredientId: id,
        spent: unlock.crumbs,
        xp: INGREDIENT_UNLOCK_XP,
        levelUp: levelUpBetween(save.progression.xp, progression.xp, pantry),
      }
    }
  }
}
