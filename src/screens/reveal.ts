import type { KitchenBake } from '../app/gameContext'
import type { SoundCue } from '../audio/cues'
import { discoverySound } from '../audio/sounds'
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

/** A named mastery stage's sound on a rebake, and a keepsake's stamp after it. */
export const REBAKE_MASTERY_MS = 700
export const REBAKE_KEEPSAKE_MS = 700
/** After the chime: a level's ta-da, then anything for the cupboard, then a keepsake's stamp. */
export const LEVEL_AFTER_CHIME_MS = 1100
export const DECOR_AFTER_MS = 1100
export const KEEPSAKE_AFTER_DECOR_MS = 1000

/**
 * Every sound a bake makes once it's out of the oven, and when, as data. The
 * timer dings straight away. A rebake gets no chime; a named mastery stage
 * and any keepsake each get one small sound, never more. A first discovery
 * gets its rarity's chime as the stamp lands (a secret's hush first), then a
 * new level's ta-da, then anything for the cupboard, and a keepsake's stamp
 * last of all: one stamp however many arrived. Never repeats a sound.
 */
export function bakeSoundCues(outcome: KitchenBake, reducedMotion: boolean): SoundCue[] {
  const cues: SoundCue[] = [{ id: 'ding', at: 0 }]
  const keepsake = outcome.keepsakes.earned.length > 0
  if (!outcome.reward) {
    if (outcome.masteryUp) cues.push({ id: 'mastery-up', at: REBAKE_MASTERY_MS })
    if (keepsake) cues.push({ id: 'achievement-unlock', at: outcome.masteryUp ? REBAKE_MASTERY_MS + REBAKE_KEEPSAKE_MS : REBAKE_KEEPSAKE_MS })
    return cues
  }
  const { rarity } = outcome.reward
  const secret = outcome.newDiscovery && outcome.result.kind === 'recipe' && outcome.result.recipe.isSecret
  const chime = discoverySoundDelay(rarity, reducedMotion, secret)
  if (secret) cues.push({ id: 'discover-secret', at: secretSoundDelay(rarity, reducedMotion) })
  cues.push({ id: discoverySound(rarity), at: chime })
  if (outcome.levelUp) cues.push({ id: 'level-up', at: chime + LEVEL_AFTER_CHIME_MS })
  const afterLevel = chime + (outcome.levelUp ? 2 * LEVEL_AFTER_CHIME_MS : DECOR_AFTER_MS)
  if (outcome.decor.length > 0) cues.push({ id: 'decor-unlock', at: afterLevel })
  if (keepsake) cues.push({ id: 'achievement-unlock', at: afterLevel + (outcome.decor.length > 0 ? KEEPSAKE_AFTER_DECOR_MS : 0) })
  return cues
}
