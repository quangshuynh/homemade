import { useRef, useState, type ChangeEvent } from 'react'
import { downloadTextFile } from '../../app/download'
import { useGame, useSave } from '../../app/gameContext'
import { navigate } from '../../app/routes'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { VISIBLE_RECIPES } from '../../domain/recipeBook'
import { exportSave, MAX_IMPORT_BYTES, readSaveFile, type ImportResult } from '../../persistence/portable'

type Readable = Extract<ImportResult, { ok: true }>
type Problem = { message: string; detail?: string }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Download the kitchen as a file, or bring one in. Choosing a file only
 * reads and checks it; the current kitchen is replaced (and archived, never
 * deleted) only after the player has seen what's in the file and confirmed.
 */
export function SaveFileControls() {
  const save = useSave()
  const { importSave } = useGame()
  const fileInput = useRef<HTMLInputElement>(null)
  const openButton = useRef<HTMLButtonElement>(null)
  const [downloaded, setDownloaded] = useState('')
  const [problem, setProblem] = useState<Problem | null>(null)
  const [pending, setPending] = useState<Readable | null>(null)
  const [busy, setBusy] = useState(false)

  function download() {
    const { fileName, text } = exportSave(save)
    downloadTextFile(fileName, text)
    setDownloaded(`Downloaded ${fileName}.`)
  }

  async function chosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Clear it so choosing the same file again still counts as a change.
    event.target.value = ''
    if (!file) return
    setProblem(null)
    setDownloaded('')
    if (file.size > MAX_IMPORT_BYTES) {
      setProblem({ message: 'That file is far too big to be a Homemade save.' })
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setProblem({ message: 'That file couldn’t be read. Nothing was changed.' })
      return
    }
    const result = readSaveFile(text)
    if (result.ok) setPending(result)
    else setProblem({ message: `${result.message} Nothing was changed.`, detail: result.detail })
  }

  async function confirmImport() {
    if (!pending) return
    setBusy(true)
    try {
      await importSave(pending)
      navigate('kitchen')
    } catch {
      setBusy(false)
      setPending(null)
      setProblem({ message: 'The save couldn’t be brought in, so your kitchen was left exactly as it was. Try again in a moment.' })
    }
  }

  const summary = pending?.summary

  return (
    <>
      <div className="settings__buttons">
        <Button onClick={download}>Download my kitchen</Button>
        <Button ref={openButton} onClick={() => fileInput.current?.click()}>
          Open a save file…
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="save-file-input"
          onChange={chosen}
        />
      </div>
      <p className="settings__hint" role="status">
        {downloaded}
      </p>
      {problem && (
        <div className="settings__error" role="alert">
          <p>{problem.message}</p>
          {problem.detail && (
            <details className="settings__details">
              <summary>What was wrong with it</summary>
              <p>{problem.detail}</p>
            </details>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Replace this kitchen?"
        confirmLabel={busy ? 'Bringing it in…' : 'Replace my kitchen'}
        cancelLabel="Keep my kitchen"
        busy={busy}
        onConfirm={confirmImport}
        onCancel={() => setPending(null)}
        returnFocusRef={openButton}
      >
        {summary && (
          <>
            <p>The file holds this kitchen:</p>
            <dl className="import-summary">
              <div>
                <dt>Kitchen</dt>
                <dd>{summary.bakeryName}</dd>
              </div>
              <div>
                <dt>Baker</dt>
                <dd>{summary.playerName}</dd>
              </div>
              <div>
                <dt>Recipe Book</dt>
                <dd>
                  {summary.recipeCount} of {VISIBLE_RECIPES.length} recipes
                  {summary.secretCount > 0 && `, and ${plural(summary.secretCount, 'secret', 'secrets')}`}
                </dd>
              </div>
              <div>
                <dt>Baking memories</dt>
                <dd>{plural(summary.memoryCount, 'bake', 'bakes')}</dd>
              </div>
              <div>
                <dt>Last saved</dt>
                <dd>{formatDate(summary.lastSaved)}</dd>
              </div>
            </dl>
            {pending?.migratedFrom !== null && <p>It was saved by an older version of Homemade and will be brought up to date.</p>}
            <p>
              <strong>{save.profile.bakeryName}</strong> will be set aside in this browser’s archive rather than deleted, but you won’t be able to
              open it from here. To keep a copy you can open again, download it first.
            </p>
          </>
        )}
      </ConfirmDialog>
    </>
  )
}
