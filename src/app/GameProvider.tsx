import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { clearSlot, equipDecoration as applyEquip, purchaseDecoration } from '../decorating/rules'
import type { DecorationSlot } from '../decorating/slots'
import { bake as bakeBowl, prepareBowl, recordBake, type Bowl, type PreparedBake } from '../domain/baking'
import { newCreationId } from '../domain/creations'
import type { DecorationId, IngredientId, RecipeId, StorySceneId } from '../domain/ids'
import { unlockIngredient as applyUnlock } from '../domain/progression'
import { createNewSave, touchSave, type NewSaveInput } from '../domain/save'
import type { GameSave } from '../domain/types'
import { setFavourite as applyFavourite } from '../keepsakes/rules'
import { settleSave } from '../keepsakes/settle'
import type { SaveRepository } from '../persistence/repository'
import { evaluateStoryProgress, seeScene } from '../story/progress'
import {
  GameContext,
  type GameState,
  type ImportedSave,
  type KeepsakeNews,
  type KitchenBake,
  type KitchenEquip,
  type KitchenScene,
  type KitchenUnlock,
  type SaveStatus,
} from './gameContext'

/** What a change earned in keepsakes, and whether they're the kitchen's very first. */
function newsFor(before: GameSave, earned: KeepsakeNews['earned']): KeepsakeNews {
  return { earned, first: earned.length > 0 && before.achievementIds.length === 0 }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function GameProvider({ repository, children }: { repository: SaveRepository; children: ReactNode }) {
  const [state, setState] = useState<GameState>({ status: 'loading' })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [loadAttempt, setLoadAttempt] = useState(0)
  // A bowl laid out by "Bake again", waiting for the Bake screen. Deliberately
  // not saved: a refresh just leaves the bowl empty.
  const [preparedBowl, setPreparedBowl] = useState<PreparedBake | null>(null)

  // The latest save, readable synchronously so rapid updates never build on a stale copy.
  const saveRef = useRef<GameSave | null>(null)
  // Writes are chained so they reach storage in the order they were made.
  const writeQueue = useRef<Promise<void>>(Promise.resolve())
  const latestWrite = useRef(0)


  const persist = useCallback(
    (save: GameSave) => {
      const writeNumber = ++latestWrite.current
      setSaveStatus('saving')
      const write = writeQueue.current.then(() => repository.write(save))
      writeQueue.current = write.then(
        // Only the newest write decides the status; an older one finishing says nothing about it.
        () => {
          if (writeNumber === latestWrite.current) setSaveStatus('saved')
        },
        () => {
          if (writeNumber === latestWrite.current) setSaveStatus('failed')
        },
      )
      return write
    },
    [repository],
  )

  useEffect(() => {
    let cancelled = false
    repository.load().then(
      (result) => {
        if (cancelled) return
        if (result.kind === 'empty') {
          saveRef.current = null
          setState({ status: 'first-run' })
        } else if (result.kind === 'loaded') {
          // The first look after loading: any keepsake or decoration earned and not
          // yet handed over (including everything an upgraded save earned before
          // keepsakes or decorating existed) arrives now, without asking the player
          // to repeat anything. Deterministic, so a second look finds nothing.
          const { save } = settleSave(result.save)
          saveRef.current = save
          setState({ status: 'ready', save })
          if (save !== result.save) {
            void persist(save).catch(() => {
              // Surfaced through saveStatus; the grant is simply made again on the next load.
            })
          }
        } else {
          saveRef.current = null
          setState({ status: 'incompatible', problem: result })
        }
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'unavailable', message: describeError(error) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [repository, loadAttempt, persist])

  const startGame = useCallback(
    async (input: NewSaveInput) => {
      const save = createNewSave(input)
      await persist(save)
      saveRef.current = save
      setState({ status: 'ready', save })
    },
    [persist],
  )

  /** Makes `next` the save: on screen straight away, written in the background. One write per change. */
  const commit = useCallback(
    (next: GameSave) => {
      saveRef.current = next
      setState({ status: 'ready', save: next })
      void persist(next).catch(() => {
        // Surfaced through saveStatus; the in-memory game keeps running.
      })
    },
    [persist],
  )

  const updateSave = useCallback(
    (change: (save: GameSave) => GameSave) => {
      const current = saveRef.current
      if (!current) return
      commit(touchSave(current, change))
    },
    [commit],
  )

  const bake = useCallback(
    (bowl: Bowl): KitchenBake => {
      const current = saveRef.current
      if (!current) throw new Error('Nothing to bake into: the save is not loaded')
      const now = new Date()
      // The batch, any discovery, its mastery count, and any keepsake or decoration it
      // earned arrive together as one next save, written once.
      const { save: baked, outcome } = recordBake(current, bakeBowl(bowl), now, newCreationId())
      const { save: next, achievements, decor } = settleSave(baked)
      const stamped = { ...next, updatedAt: now.toISOString() }
      commit(stamped)
      return { ...outcome, story: evaluateStoryProgress(current, stamped), decor, keepsakes: newsFor(current, achievements) }
    },
    [commit],
  )

  const unlockIngredient = useCallback(
    (id: IngredientId): KitchenUnlock => {
      const current = saveRef.current
      if (!current) throw new Error('Nothing to add to: the save is not loaded')
      const result = applyUnlock(current, id)
      if (!result.ok) return result
      // The ingredient, the Crumbs and the XP change together, in one write.
      const stamped = { ...result.save, updatedAt: new Date().toISOString() }
      commit(stamped)
      return { ...result, save: stamped, story: evaluateStoryProgress(current, stamped) }
    },
    [commit],
  )

  const seeStoryScene = useCallback(
    (id: StorySceneId): KitchenScene => {
      const current = saveRef.current
      if (!current) throw new Error('No story to follow: the save is not loaded')
      const result = seeScene(current, id)
      if (!result.ok) return result
      // A replay hands back the same save: nothing to write, nothing new.
      if (result.save === current) return { ...result, decor: [], keepsakes: newsFor(current, []) }
      // Finishing the brass key's chapter opens the cupboard: its contents (and any keepsake) arrive in the same write.
      const { save: next, achievements, decor } = settleSave(result.save)
      const stamped = { ...next, updatedAt: new Date().toISOString() }
      commit(stamped)
      return { ...result, save: stamped, decor, keepsakes: newsFor(current, achievements) }
    },
    [commit],
  )

  const equipDecoration = useCallback(
    (slot: DecorationSlot, id: DecorationId): KitchenEquip => {
      const current = saveRef.current
      if (!current) throw new Error('Nothing to decorate: the save is not loaded')
      const result = applyEquip(current, slot, id)
      if (!result.ok) return result
      // What's out, any remark Marmalade has now made, and any keepsake it earned, in one write.
      const { save: next, achievements, decor } = settleSave(result.save)
      const stamped = { ...next, updatedAt: new Date().toISOString() }
      commit(stamped)
      // Putting something out can show the cupboard's back board (Chapter 7).
      return { ...result, save: stamped, decor, keepsakes: newsFor(current, achievements), story: evaluateStoryProgress(current, stamped) }
    },
    [commit],
  )

  const clearDecorationSlot = useCallback(
    (slot: DecorationSlot) => {
      const current = saveRef.current
      if (!current) throw new Error('Nothing to tidy: the save is not loaded')
      const { save, cleared } = clearSlot(current, slot)
      if (save !== current) commit({ ...save, updatedAt: new Date().toISOString() })
      return cleared
    },
    [commit],
  )

  const buyDecoration = useCallback(
    (id: DecorationId) => {
      const current = saveRef.current
      if (!current) throw new Error('Nothing to buy with: the save is not loaded')
      const result = purchaseDecoration(current, id)
      if (!result.ok) return result
      // The Crumbs and the decoration change together, in one write.
      const stamped = { ...result.save, updatedAt: new Date().toISOString() }
      commit(stamped)
      return { ...result, save: stamped }
    },
    [commit],
  )

  const setFavourite = useCallback(
    (recipeId: RecipeId, favourite: boolean) => {
      const current = saveRef.current
      if (!current) return false
      const next = applyFavourite(current, recipeId, favourite)
      if (next === current) return false
      commit({ ...next, updatedAt: new Date().toISOString() })
      return true
    },
    [commit],
  )

  const prepareRecipe = useCallback((recipeId: RecipeId) => {
    const current = saveRef.current
    const bowl = current ? prepareBowl(current, recipeId) : null
    setPreparedBowl(bowl ? { recipeId, bowl } : null)
    return bowl !== null
  }, [])

  const clearPreparedBowl = useCallback(() => setPreparedBowl(null), [])

  const resetSave = useCallback(async () => {
    await writeQueue.current
    await repository.clear()
    saveRef.current = null
    setPreparedBowl(null)
    setSaveStatus('saved')
    setState({ status: 'first-run' })
  }, [repository])

  const archiveAndStartOver = useCallback(async () => {
    await repository.archiveAndClear('Set aside because it could not be read')
    saveRef.current = null
    setState({ status: 'first-run' })
  }, [repository])

  const importSave = useCallback(
    async (incoming: ImportedSave) => {
      // Let any pending write land first, so it can't overwrite the import afterwards.
      await writeQueue.current.catch(() => {})
      // The same first look as a load: any keepsake or decoration the file's kitchen earned arrives.
      const { save } = settleSave(incoming.save)
      await repository.replace(save, {
        note: 'Set aside when another save was imported',
        alsoArchive:
          incoming.migratedFrom === null
            ? undefined
            : { note: `Imported from save version ${incoming.migratedFrom} (original file)`, data: incoming.original },
      })
      saveRef.current = save
      setPreparedBowl(null)
      setSaveStatus('saved')
      setState({ status: 'ready', save })
    },
    [repository],
  )

  const whenSaved = useCallback(() => writeQueue.current.catch(() => {}), [])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  const value = useMemo(
    () => ({
      state,
      saveStatus,
      startGame,
      updateSave,
      bake,
      unlockIngredient,
      seeStoryScene,
      equipDecoration,
      clearDecorationSlot,
      buyDecoration,
      setFavourite,
      preparedBowl,
      prepareRecipe,
      clearPreparedBowl,
      resetSave,
      archiveAndStartOver,
      importSave,
      whenSaved,
      reload,
    }),
    [
      state,
      saveStatus,
      startGame,
      updateSave,
      bake,
      unlockIngredient,
      seeStoryScene,
      equipDecoration,
      clearDecorationSlot,
      buyDecoration,
      setFavourite,
      preparedBowl,
      prepareRecipe,
      clearPreparedBowl,
      resetSave,
      archiveAndStartOver,
      importSave,
      whenSaved,
      reload,
    ],
  )

  return <GameContext value={value}>{children}</GameContext>
}
