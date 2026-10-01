import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { navigate, routeFromHash } from '../app/routes'
import { useSound } from '../audio/soundContext'
import { endTutorial, tutorialPending } from '../domain/save'
import { advance, START, STEP_DEFINITIONS, type TutorialEvent, type TutorialRun } from './tutorial'
import { TutorialContext } from './tutorialContext'

/**
 * Holds the tutorial run in memory. Only how it ended (finished or skipped)
 * is saved; a refresh part-way through simply starts it again from the
 * first card. A different kitchen (a new one, or an imported one) gets its own.
 */
export function TutorialProvider({ children }: { children: ReactNode }) {
  const save = useSave()
  const { updateSave } = useGame()
  const playSound = useSound()
  const [run, setRun] = useState<TutorialRun | null>(() => (tutorialPending(save) ? START : null))
  const [player, setPlayer] = useState(save.profile.id)
  if (player !== save.profile.id) {
    setPlayer(save.profile.id)
    setRun(tutorialPending(save) ? START : null)
  }

  const report = useCallback((event: TutorialEvent) => {
    setRun((current) => (current ? advance(current, event) : current))
  }, [])

  const next = useCallback(() => {
    if (!run) return
    const after = advance(run, { type: 'next' })
    playSound('tutorial-next')
    if (!after) {
      updateSave((current) => endTutorial(current, 'finished'))
      setRun(null)
      return
    }
    setRun(after)
    const { route } = STEP_DEFINITIONS[after.step]
    if (routeFromHash(window.location.hash) !== route) navigate(route)
  }, [run, playSound, updateSave])

  const skip = useCallback(() => {
    updateSave((current) => endTutorial(current, 'skipped'))
    setRun(null)
  }, [updateSave])

  const replay = useCallback(() => {
    setRun(START)
    navigate(STEP_DEFINITIONS[START.step].route)
  }, [])

  const value = useMemo(() => ({ run, report, next, skip, replay }), [run, report, next, skip, replay])
  return <TutorialContext value={value}>{children}</TutorialContext>
}
