import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useSound } from './soundContext'
import type { SoundId } from './sounds'

/**
 * A sound that should ring a little after something happens: the rarity's
 * chime as the stamp lands, a level's ta-da once that has rung. `at` is in
 * milliseconds after the moment itself; 0 rings straight away.
 *
 * Screens work out *which* sounds ring and *when* as plain data (see
 * screens/reveal for the oven's), and hand the list to `useSoundCues`, which
 * is the only thing that touches timers. That keeps the timing in one place
 * and lets tests swap the clock for one they control.
 */
export type SoundCue = { id: SoundId; at: number }

/** Plays cues through `play`; returns a function that cancels any still waiting. */
export type CueScheduler = (cues: readonly SoundCue[], play: (id: SoundId) => void) => () => void

/** The real one: each cue on its own timer. Anything due at 0 rings at once, in the order given. */
export const timedCues: CueScheduler = (cues, play) => {
  const timers: number[] = []
  for (const cue of cues) {
    if (cue.at <= 0) play(cue.id)
    else timers.push(window.setTimeout(() => play(cue.id), cue.at))
  }
  return () => timers.forEach((timer) => window.clearTimeout(timer))
}

/** The app uses `timedCues`. Tests can provide their own clock. */
export const CueSchedulerContext = createContext<CueScheduler>(timedCues)

/**
 * `ring(cues)`: plays a cue sheet, governed by the sound setting at the
 * moment each cue rings (so muting silences anything still to come).
 * Returns a cancel function, for effects that should stop their sounds
 * when what they celebrate goes away; anything still waiting is cancelled
 * when the screen unmounts, so no sound outlives its screen.
 */
export function useSoundCues(): (cues: readonly SoundCue[]) => () => void {
  const schedule = useContext(CueSchedulerContext)
  const playSound = useSound()
  const latest = useRef(playSound)
  useEffect(() => {
    latest.current = playSound
  })
  const pending = useRef(new Set<() => void>())
  useEffect(() => {
    const waiting = pending.current
    return () => {
      for (const cancel of waiting) cancel()
      waiting.clear()
    }
  }, [])

  return useCallback(
    (cues: readonly SoundCue[]) => {
      const cancelSchedule = schedule(cues, (id) => latest.current(id))
      const cancel = () => {
        cancelSchedule()
        pending.current.delete(cancel)
      }
      pending.current.add(cancel)
      return cancel
    },
    [schedule],
  )
}
