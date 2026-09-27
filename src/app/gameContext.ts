import { createContext, useContext } from 'react'
import type { BakeOutcome, Bowl } from '../domain/baking'
import type { NewSaveInput } from '../domain/save'
import type { GameSave } from '../domain/types'
import type { LoadResult } from '../persistence/repository'

export type GameState =
  | { status: 'loading' }
  | { status: 'first-run' }
  | { status: 'ready'; save: GameSave }
  | { status: 'incompatible'; problem: Extract<LoadResult, { kind: 'incompatible' }> }
  | { status: 'unavailable'; message: string }

export type SaveStatus = 'saved' | 'saving' | 'failed'

export type GameContextValue = {
  state: GameState
  saveStatus: SaveStatus
  startGame: (input: NewSaveInput) => Promise<void>
  /** Applies a pure change to the save, updates the UI immediately and persists it in the background. */
  updateSave: (change: (save: GameSave) => GameSave) => void
  /**
   * Bakes what's in the bowl, records any first-time discovery, and saves.
   * Returns what came out of the oven.
   */
  bake: (bowl: Bowl) => BakeOutcome
  /** Deletes the save and returns to first run. Callers confirm with the player first. */
  resetSave: () => Promise<void>
  /** For unreadable saves: archive the old data, then start over. */
  archiveAndStartOver: () => Promise<void>
  reload: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside <GameProvider>')
  return context
}

/** For screens that only render once a save exists. */
export function useSave(): GameSave {
  const { state } = useGame()
  if (state.status !== 'ready') throw new Error('useSave called before the save was ready')
  return state.save
}
