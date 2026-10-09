import type { DecorationId, StoryChapterId } from '../domain/ids'
import type { CookieRarity, RecipeFamily } from '../domain/types'
import type { DecorationSlot } from './slots'

/**
 * A light grouping of decorations that go together. It helps the cupboard
 * sort itself and gives Marmalade something to notice; it never has to be
 * put out as a whole, and nothing is better for matching.
 */
export type DecorationThemeId = 'cottage' | 'warm-bakery' | 'garden-kitchen'

/**
 * How a decoration arrives. Every one of these is something already done
 * in the game (earned once, for good) or a plain price in Crumbs. Never
 * chance, never a timer, never both: anything that can be earned can't
 * also be bought.
 */
export type DecorationUnlockRule =
  /** The story has reached the end of this chapter. */
  | { type: 'chapter-complete'; chapterId: StoryChapterId }
  /** Every card in this family that isn't secret has been found. */
  | { type: 'family-complete'; familyId: RecipeFamily }
  /** A recipe of this rarity is in the book. */
  | { type: 'first-rarity'; rarity: CookieRarity }
  /** A secret recipe is in the book. */
  | { type: 'first-secret' }
  /** Bought from the cupboard, once, for this many Crumbs. Purely cosmetic. */
  | { type: 'crumbs'; price: number }

/** How a decoration is drawn: which reusable illustration, and its variant. Presentation reads these; rules never do. */
export type DecorationLook =
  | { kind: 'towel'; pattern: 'gingham' | 'fruit' | 'stripe' }
  | { kind: 'frame'; picture: 'recipe-card' | 'gold-seal' | 'botanical' | 'bakery-sign'; moulding: 'wood' | 'gilt' | 'painted' }
  | { kind: 'scrap-frame' }
  | { kind: 'curtains' }
  | { kind: 'herb-bundle' }
  | { kind: 'pot-plant'; plant: 'thyme' | 'lemon-tree' }
  | { kind: 'jar'; glaze: 'cream' | 'green' }
  | { kind: 'crock'; material: 'stoneware' | 'copper' }
  | { kind: 'rolling-pin' }
  | { kind: 'bread-board' }

/**
 * Hand-authored, static catalog data. Saves store only the id, so a name,
 * description or drawing can change here without touching anyone's save.
 */
export type DecorationDefinition = {
  id: DecorationId
  name: string
  description: string
  slot: DecorationSlot
  theme?: DecorationThemeId
  unlock: DecorationUnlockRule
  visual: DecorationLook
}

export type DecorationTheme = { id: DecorationThemeId; name: string }
