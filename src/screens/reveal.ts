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

/** The rarity stamp lands on beat 3; its chime is timed to that. */
export function discoverySoundDelay(rarity: CookieRarity, reducedMotion: boolean): number {
  return reducedMotion ? 350 : REVEAL_BEAT_MS[rarity] * 3 + 180
}
