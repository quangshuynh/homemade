import type { CookieRarity } from '../domain/types'

/**
 * The discovery reveal moves in beats: name, then rarity, then the reward,
 * then the level and Marmalade. Rarer finds take slightly longer beats, so a
 * common card is quick and a mythic one gets a moment. Zero when motion is
 * reduced (the stylesheet multiplies by --motion-scale), so all of it shows at once.
 */
export const REVEAL_BEAT_MS: Record<CookieRarity, number> = {
  common: 110,
  uncommon: 150,
  rare: 200,
  epic: 260,
  legendary: 320,
  mythic: 400,
}

/**
 * A secret takes one beat more: "Something unexpected…" comes first, and
 * everything else follows a beat later (BakeScreen.css shifts the beats to match).
 */
export const SECRET_LEAD_BEATS = 1

/**
 * When the rarity's chime rings: as the stamp lands, on beat 3 (beat 4 for a
 * secret). With motion reduced everything is already on screen, so the
 * sounds simply follow the oven's ding in order.
 */
export function discoverySoundDelay(rarity: CookieRarity, reducedMotion: boolean, secret = false): number {
  if (reducedMotion) return secret ? 900 : 350
  return REVEAL_BEAT_MS[rarity] * (3 + (secret ? SECRET_LEAD_BEATS : 0)) + 180
}

/** A secret's hush plays with "Something unexpected…", before the rarity's chime. */
export function secretSoundDelay(rarity: CookieRarity, reducedMotion: boolean): number {
  return reducedMotion ? 250 : REVEAL_BEAT_MS[rarity] + 180
}
