import { createContext, useContext } from 'react'
import type { EquipResult, PurchaseResult } from '../decorating/rules'
import type { DecorationSlot } from '../decorating/slots'
import type { DecorationDefinition } from '../decorating/types'
import type { BakeOutcome, Bowl, PreparedBake } from '../domain/baking'
import type { DecorationId, IngredientId, RecipeId, StorySceneId } from '../domain/ids'
import type { UnlockResult } from '../domain/progression'
import type { NewSaveInput } from '../domain/save'
import type { GameSave } from '../domain/types'
import type { ImportResult } from '../persistence/portable'
import type { LoadResult } from '../persistence/repository'
import type { SeeSceneResult, StoryNews } from '../story/progress'

export type GameState =
  | { status: 'loading' }
  | { status: 'first-run' }
  | { status: 'ready'; save: GameSave }
  | { status: 'incompatible'; problem: Extract<LoadResult, { kind: 'incompatible' }> }
  | { status: 'unavailable'; message: string }

export type SaveStatus = 'saved' | 'saving' | 'failed'

/**
 * What came out of the oven, whether it opened up the next bit of the story,
 * and anything it earned for the kitchen cupboard (almost always nothing).
 */
export type KitchenBake = BakeOutcome & { story: StoryNews | null; decor: DecorationDefinition[] }

/** A story scene seen, and anything that put in the cupboard (the starter set, when Chapter 5 ends). */
export type KitchenScene = (Extract<SeeSceneResult, { ok: true }> & { decor: DecorationDefinition[] }) | Extract<SeeSceneResult, { ok: false }>

/** A pantry addition, and whether it opened up the next bit of the story. */
export type KitchenUnlock = (Extract<UnlockResult, { ok: true }> & { story: StoryNews | null }) | Extract<UnlockResult, { ok: false }>

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
  bake: (bowl: Bowl) => KitchenBake
  /**
   * Adds an ingredient to the pantry for good, paying its Crumbs, in one
   * write. Refuses, changing nothing, if the level or Crumbs aren't there.
   */
  unlockIngredient: (id: IngredientId) => KitchenUnlock
  /**
   * Records that a story scene was seen (read to the end, or skipped), and
   * pays its chapter's small reward the first time, in one write. A scene
   * already seen changes nothing, so a replay can never pay twice.
   */
  seeStoryScene: (id: StorySceneId) => KitchenScene
  /**
   * Puts an owned decoration out in its spot (whatever was there goes back
   * in the cupboard) and notes any one-time remark it earns, in one write.
   * Refuses, changing nothing, if it isn't owned or doesn't belong there. Cosmetic only.
   */
  equipDecoration: (slot: DecorationSlot, id: DecorationId) => EquipResult
  /** Puts whatever is in a spot back in the cupboard. Returns what was there, if anything. */
  clearDecorationSlot: (slot: DecorationSlot) => DecorationDefinition | null
  /** Buys a decoration for Crumbs, in one write. Refuses, changing nothing, if it can't be bought. Callers confirm first. */
  buyDecoration: (id: DecorationId) => PurchaseResult
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
