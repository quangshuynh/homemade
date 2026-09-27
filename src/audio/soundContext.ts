import { createContext, useCallback, useContext, useEffect } from 'react'
import { useSave } from '../app/gameContext'
import { createAudioPlayer, type AudioPlayer } from './audioPlayer'
import type { SoundId } from './sounds'

/** The app's one player. Tests (and anything else) can provide their own. */
export const SoundPlayerContext = createContext<AudioPlayer>(createAudioPlayer())

/**
 * `playSound('mix')`, governed centrally by the player's sound setting.
 * Screens never check the setting themselves. Separate from motion: turning
 * motion off doesn't silence anything, and turning sound off moves nothing.
 */
export function useSound(): (id: SoundId) => void {
  const player = useContext(SoundPlayerContext)
  const { soundEnabled } = useSave().settings

  return useCallback(
    (id: SoundId) => {
      if (!soundEnabled) return
      try {
        player.play(id)
      } catch {
        // A sound going wrong must never interrupt the game.
      }
    },
    [soundEnabled, player],
  )
}

/** Used once, by the app shell: turning sound off also cuts short anything still ringing. */
export function useStopSoundsWhenMuted(): void {
  const player = useContext(SoundPlayerContext)
  const { soundEnabled } = useSave().settings
  useEffect(() => {
    if (soundEnabled) return
    try {
      player.stopAll()
    } catch {
      // Nothing to stop, or nothing that can be.
    }
  }, [soundEnabled, player])
}
