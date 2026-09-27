import { useEffect, useState } from 'react'
import { useGame } from '../app/gameContext'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { HandNote, RecipeCard } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import type { LoadResult } from '../persistence/repository'
import { serializeSave } from '../persistence/schema'
import './SaveTroubleScreen.css'

type Incompatible = Extract<LoadResult, { kind: 'incompatible' }>

function downloadBackup(raw: unknown) {
  const blob = new Blob([serializeSave(raw)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `homemade-save-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  // Revoking straight away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Shown when a save exists but can't be read. The save is never discarded without the player's say-so. */
export function IncompatibleSaveScreen({ problem }: { problem: Incompatible }) {
  const { reload, archiveAndStartOver } = useGame()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = 'Save problem · Homemade'
  }, [])

  const newer = problem.reason === 'newer-version'

  return (
    <main className="trouble">
      <RecipeCard as="section" className="trouble__card" ruled={false} aria-labelledby="screen-title">
        <ScreenTitle className="trouble__title">Your kitchen couldn’t be opened</ScreenTitle>
        <HandNote>Nothing has been thrown away.</HandNote>
        <p>
          {newer
            ? 'It was saved by a newer version of Homemade than the one running now. Reloading the page usually fetches the newer version.'
            : 'The saved kitchen in this browser looks damaged or unfamiliar, so this version of Homemade can’t read it safely.'}
        </p>
        <details className="trouble__details">
          <summary>What went wrong</summary>
          <p>{problem.detail}</p>
        </details>
        <div className="trouble__actions">
          <Button variant="primary" onClick={() => (newer ? window.location.reload() : reload())}>
            {newer ? 'Reload Homemade' : 'Try again'}
          </Button>
          <Button onClick={() => downloadBackup(problem.raw)}>Download a copy</Button>
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Set it aside and start over…
          </Button>
        </div>
      </RecipeCard>

      <ConfirmDialog
        open={confirming}
        title="Set this kitchen aside?"
        confirmLabel={busy ? 'Setting aside…' : 'Set aside and start over'}
        cancelLabel="Not now"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          try {
            await archiveAndStartOver()
          } catch {
            setBusy(false)
            setConfirming(false)
          }
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>The unreadable save is moved to an archive in this browser rather than deleted, and you’ll start a new kitchen.</p>
        <p>If you want to keep a copy somewhere else, download one first.</p>
      </ConfirmDialog>
    </main>
  )
}

/** Shown when the browser won't give us storage at all (for example, some private browsing modes). */
export function StorageUnavailableScreen({ message }: { message: string }) {
  const { reload } = useGame()
  return (
    <main className="trouble">
      <RecipeCard as="section" className="trouble__card" ruled={false} aria-labelledby="screen-title">
        <ScreenTitle className="trouble__title">This browser won’t let the kitchen save</ScreenTitle>
        <p>
          Homemade keeps your kitchen in this browser’s storage, and it isn’t available right now. Private browsing, or
          settings that block site data, can cause this.
        </p>
        <details className="trouble__details">
          <summary>What went wrong</summary>
          <p>{message}</p>
        </details>
        <div className="trouble__actions">
          <Button variant="primary" onClick={reload}>
            Try again
          </Button>
        </div>
      </RecipeCard>
    </main>
  )
}

export function LoadingScreen() {
  return (
    <main className="trouble" aria-busy="true">
      <p className="trouble__loading hand-note" role="status">
        Warming up the kitchen…
      </p>
    </main>
  )
}
