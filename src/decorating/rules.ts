import type { DecorationId } from '../domain/ids'
import { completedFamilies } from '../domain/recipeBook'
import { findRecipeById } from '../domain/recipes'
import type { GameSave } from '../domain/types'
import { findChapter } from '../story/chapters'
import { isChapterComplete } from '../story/progress'
import { CUPBOARD_CHAPTER_ID, DECORATION_THEMES, DECORATIONS, findDecoration, themeDecorations } from './catalog'
import type { DecorationSlot } from './slots'
import type { DecorationDefinition, DecorationThemeId, DecorationUnlockRule } from './types'

/**
 * Decorating rules. Pure functions over the save and the static catalog;
 * the UI asks these and never decides anything itself.
 *
 * The rules this file keeps:
 * - Decorating is cosmetic. These functions only ever touch
 *   `save.decorating` and, for a purchase, `progression.crumbs`. Nothing in
 *   baking, rewards, levels or ingredients reads a decoration.
 * - The cupboard opens when the story's fifth chapter ends (the brass key).
 *   However the player got there, and whenever: an older save that had
 *   already finished it finds the cupboard open straight away.
 * - Earned decorations arrive once, for good, the first time they're looked
 *   for after their milestone (a bake, a story scene, loading the game),
 *   including anything earned before the cupboard opened. Granting again
 *   changes nothing. Nothing earned is ever taken away.
 * - Owned and out are separate: a player owns many things and puts at most
 *   one out in each spot. Only owned things can go out, and only in their
 *   own spot.
 * - A purchase checks, charges and hands over in one next save.
 */

// ---------------------------------------------------------------- the cupboard

/** Whether the old cupboard is open: the brass key's chapter is finished. */
export function decoratingOpen(save: GameSave): boolean {
  const chapter = findChapter(CUPBOARD_CHAPTER_ID)
  return chapter !== undefined && isChapterComplete(save, chapter)
}

// ---------------------------------------------------------------- ownership

export function ownsDecoration(save: GameSave, id: DecorationId): boolean {
  return save.decorating.ownedDecorationIds.includes(id)
}

/** Owned decorations the catalog knows, in the order they arrived. Unknown ids stay in the save but aren't shown. */
export function ownedDecorations(save: GameSave): DecorationDefinition[] {
  return save.decorating.ownedDecorationIds.map(findDecoration).filter((found): found is DecorationDefinition => found !== undefined)
}

/** Whether the kitchen has done what an earning rule asks. Purchases are never earned. Reads the save alone. */
export function meetsUnlockRule(save: GameSave, rule: DecorationUnlockRule): boolean {
  switch (rule.type) {
    case 'chapter-complete': {
      const chapter = findChapter(rule.chapterId)
      return chapter !== undefined && isChapterComplete(save, chapter)
    }
    case 'family-complete':
      return completedFamilies(save).includes(rule.familyId)
    case 'first-rarity':
      return save.discoveredRecipes.some((entry) => findRecipeById(entry.recipeId)?.rarity === rule.rarity)
    case 'first-secret':
      return save.discoveredRecipes.some((entry) => findRecipeById(entry.recipeId)?.isSecret)
    case 'crumbs':
      return false
  }
}

export type DecorGrant = {
  save: GameSave
  /** What just arrived, in catalog order. Empty (and the same save back) when there was nothing new. */
  granted: DecorationDefinition[]
}

/**
 * Hands over every earned decoration the player doesn't have yet: the
 * starter set when the cupboard opens, and any keepsake whose milestone has
 * been reached, including ones reached long ago. Nothing until the cupboard
 * is open. Deterministic and idempotent: call it as often as you like.
 */
export function grantEarnedDecorations(save: GameSave): DecorGrant {
  if (!decoratingOpen(save)) return { save, granted: [] }
  const granted = DECORATIONS.filter((decoration) => !ownsDecoration(save, decoration.id) && meetsUnlockRule(save, decoration.unlock))
  if (granted.length === 0) return { save, granted }
  const ownedDecorationIds = [...save.decorating.ownedDecorationIds, ...granted.map((decoration) => decoration.id)]
  return { save: { ...save, decorating: { ...save.decorating, ownedDecorationIds } }, granted }
}

export type DecorationStatus =
  | { kind: 'owned' }
  | { kind: 'for-sale'; price: number; affordable: boolean; short: number }
  /** Earned, not bought, and the milestone isn't reached yet. */
  | { kind: 'not-yet'; rule: Exclude<DecorationUnlockRule, { type: 'crumbs' }> }

/** Where a decoration stands for this player. */
export function decorationStatus(save: GameSave, decoration: DecorationDefinition): DecorationStatus {
  if (ownsDecoration(save, decoration.id)) return { kind: 'owned' }
  const { unlock } = decoration
  if (unlock.type === 'crumbs') {
    const short = Math.max(0, unlock.price - save.progression.crumbs)
    return { kind: 'for-sale', price: unlock.price, affordable: short === 0, short }
  }
  return { kind: 'not-yet', rule: unlock }
}

export type PurchaseResult =
  | { ok: true; save: GameSave; decoration: DecorationDefinition; spent: number }
  | { ok: false; reason: 'closed' | 'unknown' | 'owned' | 'not-for-sale' | 'crumbs' }

/**
 * Buys a decoration: checks the cupboard is open, that it's for sale and
 * not already owned, and that there are enough Crumbs; then takes the
 * Crumbs and hands it over, in one next save. Refuses, changing nothing,
 * otherwise. Costs Crumbs only: never XP, never an ingredient.
 */
export function purchaseDecoration(save: GameSave, id: DecorationId): PurchaseResult {
  if (!decoratingOpen(save)) return { ok: false, reason: 'closed' }
  const decoration = findDecoration(id)
  if (!decoration) return { ok: false, reason: 'unknown' }
  if (ownsDecoration(save, id)) return { ok: false, reason: 'owned' }
  if (decoration.unlock.type !== 'crumbs') return { ok: false, reason: 'not-for-sale' }
  const price = decoration.unlock.price
  if (save.progression.crumbs < price) return { ok: false, reason: 'crumbs' }
  return {
    ok: true,
    decoration,
    spent: price,
    save: {
      ...save,
      progression: { ...save.progression, crumbs: save.progression.crumbs - price },
      decorating: { ...save.decorating, ownedDecorationIds: [...save.decorating.ownedDecorationIds, id] },
    },
  }
}

// ---------------------------------------------------------------- what's out

/** What's out in a spot, if anything the catalog knows and that belongs there. */
export function equippedIn(save: GameSave, slot: DecorationSlot): DecorationDefinition | null {
  const id = save.decorating.equippedBySlot[slot]
  const decoration = id ? findDecoration(id) : undefined
  return decoration && decoration.slot === slot ? decoration : null
}

/** Owned decorations that can go in a spot, in catalog order. */
export function ownedForSlot(save: GameSave, slot: DecorationSlot): DecorationDefinition[] {
  return DECORATIONS.filter((decoration) => decoration.slot === slot && ownsDecoration(save, decoration.id))
}

/**
 * Marmalade's one-time decorating remarks. Each is said at most once per
 * kitchen, ever: the first thing put out, the first time a whole theme is
 * out together, and the framed scrap from the recipe box going on the shelf.
 */
export type DecorMoment = { id: 'first-equip' } | { id: 'first-set'; theme: DecorationThemeId } | { id: 'scrap-frame' }

export type EquipResult =
  | {
      ok: true
      save: GameSave
      decoration: DecorationDefinition
      /** What was in the spot before, if anything. */
      replaced: DecorationDefinition | null
      /** A remark Marmalade hasn't made yet, if this earned one. Already noted in `save`. */
      moment: DecorMoment | null
    }
  | { ok: false; reason: 'closed' | 'unknown' | 'not-owned' | 'wrong-slot' | 'already-out' }

const SCRAP_FRAME = 'decoration_recipe-scrap-frame'

/** Themes whose every piece is out at once. */
export function themesOut(save: GameSave): DecorationThemeId[] {
  return DECORATION_THEMES.filter((theme) => {
    const pieces = themeDecorations(theme.id)
    return pieces.length > 0 && pieces.every((piece) => save.decorating.equippedBySlot[piece.slot] === piece.id)
  }).map((theme) => theme.id)
}

/** The biggest remark this change earns that hasn't been made yet: a whole set, then the scrap, then the first thing out. */
function momentFor(after: GameSave, decoration: DecorationDefinition): DecorMoment | null {
  const noticed = after.decorating.noticedMomentIds
  const theme = decoration.theme
  if (!noticed.includes('first-set') && theme && themesOut(after).includes(theme)) return { id: 'first-set', theme }
  if (!noticed.includes('scrap-frame') && decoration.id === SCRAP_FRAME) return { id: 'scrap-frame' }
  if (!noticed.includes('first-equip')) return { id: 'first-equip' }
  return null
}

/**
 * Puts an owned decoration out in its spot, replacing whatever was there
 * (which goes back in the cupboard, still owned). The spot is named
 * explicitly, so a decoration can never land somewhere it doesn't belong.
 * Any one-time remark this earns is noted in the same next save.
 */
export function equipDecoration(save: GameSave, slot: DecorationSlot, id: DecorationId): EquipResult {
  if (!decoratingOpen(save)) return { ok: false, reason: 'closed' }
  const decoration = findDecoration(id)
  if (!decoration) return { ok: false, reason: 'unknown' }
  if (!ownsDecoration(save, id)) return { ok: false, reason: 'not-owned' }
  if (decoration.slot !== slot) return { ok: false, reason: 'wrong-slot' }
  if (save.decorating.equippedBySlot[slot] === id) return { ok: false, reason: 'already-out' }

  const replaced = equippedIn(save, slot)
  const equipped: GameSave = {
    ...save,
    decorating: { ...save.decorating, equippedBySlot: { ...save.decorating.equippedBySlot, [slot]: id } },
  }
  const moment = momentFor(equipped, decoration)
  const next = moment
    ? { ...equipped, decorating: { ...equipped.decorating, noticedMomentIds: [...equipped.decorating.noticedMomentIds, moment.id] } }
    : equipped
  return { ok: true, save: next, decoration, replaced, moment }
}

/** Takes whatever is out in a spot back to the cupboard (still owned). The same save back if the spot was already empty. */
export function clearSlot(save: GameSave, slot: DecorationSlot): { save: GameSave; cleared: DecorationDefinition | null } {
  if (save.decorating.equippedBySlot[slot] === undefined) return { save, cleared: null }
  const cleared = equippedIn(save, slot)
  const equippedBySlot = { ...save.decorating.equippedBySlot }
  delete equippedBySlot[slot]
  return { save: { ...save, decorating: { ...save.decorating, equippedBySlot } }, cleared }
}
