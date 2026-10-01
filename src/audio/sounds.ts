import type { CookieRarity } from '../domain/types'
import ding from '../assets/sounds/ding.wav'
import discoverCommon from '../assets/sounds/discover-common.wav'
import discoverEpic from '../assets/sounds/discover-epic.wav'
import discoverLegendary from '../assets/sounds/discover-legendary.wav'
import discoverMythic from '../assets/sounds/discover-mythic.wav'
import discoverRare from '../assets/sounds/discover-rare.wav'
import discoverUncommon from '../assets/sounds/discover-uncommon.wav'
import ingredientUnlock from '../assets/sounds/ingredient-unlock.wav'
import levelUp from '../assets/sounds/level-up.wav'
import mix from '../assets/sounds/mix.wav'
import pick from '../assets/sounds/pick.wav'
import remove from '../assets/sounds/remove.wav'
import tutorialNext from '../assets/sounds/tutorial-next.wav'

/**
 * The kitchen's sound effects, by what they mean. Screens ask for a meaning
 * (`playSound('mix')`); only this file knows where the audio lives.
 * All of them are synthesised by `scripts/make-sounds.mjs`.
 */
export type SoundId =
  | 'pick'
  | 'remove'
  | 'mix'
  | 'ding'
  | `discover-${CookieRarity}`
  | 'level-up'
  | 'ingredient-unlock'
  | 'tutorial-next'

export type SoundDefinition = {
  url: string
  /** 0–1. Kept low: these sit under the game, never over it. */
  volume: number
}

export const SOUNDS: Record<SoundId, SoundDefinition> = {
  pick: { url: pick, volume: 0.35 },
  remove: { url: remove, volume: 0.3 },
  mix: { url: mix, volume: 0.4 },
  ding: { url: ding, volume: 0.4 },
  // Rarer finds are longer and fuller, never louder.
  'discover-common': { url: discoverCommon, volume: 0.4 },
  'discover-uncommon': { url: discoverUncommon, volume: 0.4 },
  'discover-rare': { url: discoverRare, volume: 0.4 },
  'discover-epic': { url: discoverEpic, volume: 0.4 },
  'discover-legendary': { url: discoverLegendary, volume: 0.4 },
  'discover-mythic': { url: discoverMythic, volume: 0.4 },
  'level-up': { url: levelUp, volume: 0.35 },
  'ingredient-unlock': { url: ingredientUnlock, volume: 0.4 },
  'tutorial-next': { url: tutorialNext, volume: 0.3 },
}

export function discoverySound(rarity: CookieRarity): SoundId {
  return `discover-${rarity}`
}
