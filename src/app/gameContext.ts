import { createContext, useContext } from 'react'
import type { BakeOutcome, Bowl, PreparedBake } from '../domain/baking'
import type { RecipeId } from '../domain/ids'
import type { NewSaveInput } from '../domain/save'
import type { GameSave } from '../domain/types'
import type { ImportResult } from '../persistence/portable'
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
   * Bakes what's in the bowl, remembers the batch, records any first-time
   * discovery, and saves all of it in one write. Returns what came out of the oven.
   */
  bake: (bowl: Bowl) => BakeOutcome
  /** Ingredients laid out by "Bake again", for the Bake screen to start from. In memory only. */
  preparedBowl: PreparedBake | null
  /**
   * Lays out a discovered recipe's ingredients for the Bake screen. Never
   * mixes or bakes. Returns false (and prepares nothing) for an undiscovered recipe.
   */
  prepareRecipe: (recipeId: RecipeId) => boolean
  /** Called by the Bake screen once it has taken the prepared bowl. */
  clearPreparedBowl: () => void
  /** Deletes the save and returns to first run. Callers confirm with the player first. */
  resetSave: () => Promise<void>
  /** For unreadable saves: archive the old data, then start over. */
  archiveAndStartOver: () => Promise<void>
  /**
   * Installs a save read from a file (already validated and upgraded). The
   * current save is archived, not deleted. Callers confirm with the player first.
   * Rejects, changing nothing, if storage fails.
   */
  importSave: (incoming: ImportedSave) => Promise<void>
  /** Resolves once every change made so far has reached storage (or failed to). */
  whenSaved: () => Promise<void>
  reload: () => void
}

export type ImportedSave = Pick<Extract<ImportResult, { ok: true }>, 'save' | 'original' | 'migratedFrom'>

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
