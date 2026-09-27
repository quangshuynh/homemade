import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createNewSave, touchSave, type NewSaveInput } from '../domain/save'
import type { GameSave } from '../domain/types'
import type { SaveRepository } from '../persistence/repository'
import { GameContext, type GameState, type SaveStatus } from './gameContext'

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function GameProvider({ repository, children }: { repository: SaveRepository; children: ReactNode }) {
  const [state, setState] = useState<GameState>({ status: 'loading' })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [loadAttempt, setLoadAttempt] = useState(0)

  // The latest save, readable synchronously so rapid updates never build on a stale copy.
  const saveRef = useRef<GameSave | null>(null)
  // Writes are chained so they reach storage in the order they were made.
  const writeQueue = useRef<Promise<void>>(Promise.resolve())
  const latestWrite = useRef(0)

  useEffect(() => {
    let cancelled = false
    repository.load().then(
      (result) => {
        if (cancelled) return
        if (result.kind === 'empty') {
          saveRef.current = null
          setState({ status: 'first-run' })
        } else if (result.kind === 'loaded') {
          saveRef.current = result.save
          setState({ status: 'ready', save: result.save })
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
  }, [repository, loadAttempt])

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

  const startGame = useCallback(
    async (input: NewSaveInput) => {
      const save = createNewSave(input)
      await persist(save)
      saveRef.current = save
      setState({ status: 'ready', save })
    },
    [persist],
  )

  const updateSave = useCallback(
    (change: (save: GameSave) => GameSave) => {
      const current = saveRef.current
      if (!current) return
      const next = touchSave(current, change)
      saveRef.current = next
      setState({ status: 'ready', save: next })
      void persist(next).catch(() => {
        // Surfaced through saveStatus; the in-memory game keeps running.
      })
    },
    [persist],
  )

  const resetSave = useCallback(async () => {
    await writeQueue.current
    await repository.clear()
    saveRef.current = null
    setSaveStatus('saved')
    setState({ status: 'first-run' })
  }, [repository])

  const archiveAndStartOver = useCallback(async () => {
    await repository.archiveAndClear('Set aside because it could not be read')
    saveRef.current = null
    setState({ status: 'first-run' })
  }, [repository])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  const value = useMemo(
    () => ({ state, saveStatus, startGame, updateSave, resetSave, archiveAndStartOver, reload }),
    [state, saveStatus, startGame, updateSave, resetSave, archiveAndStartOver, reload],
  )

  return <GameContext value={value}>{children}</GameContext>
}
