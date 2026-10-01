import { createContext, useContext } from 'react'
import type { TutorialEvent, TutorialRun } from './tutorial'

export type TutorialContextValue = {
  /** The run in progress, or null when there's no tutorial on. */
  run: TutorialRun | null
  /** Screens tell the tutorial what the player did (bowl changed, bake came out). Ignored when it's off. */
  report: (event: TutorialEvent) => void
  /** Moves past a talking card. */
  next: () => void
  /** Ends the tutorial without finishing it. Nothing is lost or taken back. */
  skip: () => void
  /** Starts it again from the first card. Earns nothing that wasn't earned already. */
  replay: () => void
}

const OFF: TutorialContextValue = { run: null, report: () => {}, next: () => {}, skip: () => {}, replay: () => {} }

export const TutorialContext = createContext<TutorialContextValue>(OFF)

export function useTutorial(): TutorialContextValue {
  return useContext(TutorialContext)
}
