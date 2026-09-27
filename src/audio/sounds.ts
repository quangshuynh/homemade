import ding from '../assets/sounds/ding.wav'
import discover from '../assets/sounds/discover.wav'
import mix from '../assets/sounds/mix.wav'
import pick from '../assets/sounds/pick.wav'
import remove from '../assets/sounds/remove.wav'

/**
 * The kitchen's sound effects, by what they mean. Screens ask for a meaning
 * (`playSound('mix')`); only this file knows where the audio lives.
 * All of them are synthesised by `scripts/make-sounds.mjs`.
 */
export type SoundId = 'pick' | 'remove' | 'mix' | 'ding' | 'discover'

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
  discover: { url: discover, volume: 0.4 },
}
