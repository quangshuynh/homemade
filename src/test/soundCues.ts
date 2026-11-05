import type { CueScheduler, SoundCue } from '../audio/cues'
import type { SoundId } from '../audio/sounds'

/**
 * Clocks for sound cues in UI tests, so a test never waits on real time to
 * hear what a moment rings (see audio/cues). The order of the cue sheet is
 * kept; only the waiting goes.
 */

/** Everything rings at once, in the order it would have rung. Nothing is ever left waiting. */
export const immediateCues: CueScheduler = (cues, play) => {
  for (const cue of [...cues].sort((a, b) => a.at - b.at)) play(cue.id)
  return () => {}
}

/**
 * Nothing after 0 rings until the test says so. `ringAll()` plays whatever
 * is still waiting (cancelled cues never ring); `waiting()` lists it.
 */
export function createManualCues() {
  let queue: { cue: SoundCue; play: (id: SoundId) => void; cancelled: boolean }[] = []
  const schedule: CueScheduler = (cues, play) => {
    const entries = [...cues].sort((a, b) => a.at - b.at).map((cue) => ({ cue, play, cancelled: false }))
    for (const entry of entries) if (entry.cue.at <= 0) entry.play(entry.cue.id)
    const later = entries.filter((entry) => entry.cue.at > 0)
    queue.push(...later)
    return () => later.forEach((entry) => (entry.cancelled = true))
  }
  return {
    schedule,
    waiting: (): SoundId[] => queue.filter((entry) => !entry.cancelled).map((entry) => entry.cue.id),
    ringAll() {
      const due = queue.filter((entry) => !entry.cancelled).sort((a, b) => a.cue.at - b.cue.at)
      queue = []
      for (const entry of due) entry.play(entry.cue.id)
    },
  }
}
