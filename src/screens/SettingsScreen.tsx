import { useState } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { useMediaQuery } from '../app/useMediaQuery'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { RecipeCard } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { updateSettings } from '../domain/save'
import type { MotionPreference } from '../domain/types'
import './SettingsScreen.css'

const MOTION_OPTIONS: { value: MotionPreference; label: string; hint: string }[] = [
  { value: 'system', label: 'Match my device', hint: 'Follows your system’s reduced-motion setting.' },
  { value: 'reduced', label: 'Keep things still', hint: 'No sliding, lifting or wobbling.' },
  { value: 'full', label: 'Let things move', hint: 'Small, gentle animations throughout.' },
]

const SAVE_STATUS_TEXT = {
  saved: 'Saved in this browser.',
  saving: 'Saving…',
  failed: 'Couldn’t save the last change. It will be kept in this tab until it’s closed.',
} as const

export function SettingsScreen() {
  const save = useSave()
  const { updateSave, resetSave, saveStatus } = useGame()
  const deviceReducesMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetFailed, setResetFailed] = useState(false)

  const openedOn = new Date(save.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

  async function confirmReset() {
    setResetting(true)
    setResetFailed(false)
    try {
      await resetSave()
    } catch {
      setResetting(false)
      setResetFailed(true)
      setConfirming(false)
    }
  }

  return (
    <RecipeCard as="section" className="settings" ruled={false} aria-labelledby="screen-title">
      <ScreenTitle className="settings__title">Settings</ScreenTitle>

      <fieldset className="settings__group">
        <legend className="settings__legend">Sound</legend>
        <label className="check">
          <input
            type="checkbox"
            className="check__box"
            checked={save.settings.soundEnabled}
            onChange={(event) => updateSave((current) => updateSettings(current, { soundEnabled: event.target.checked }))}
            aria-describedby="sound-hint"
          />
          <span className="check__label">Play sounds</span>
        </label>
        <p id="sound-hint" className="settings__hint">
          The kitchen is quiet for now: there are no sounds yet. This remembers your choice for when there are.
        </p>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="settings__legend">Motion</legend>
        <div className="settings__options">
          {MOTION_OPTIONS.map((option) => (
            <label className="check check--radio" key={option.value}>
              <input
                type="radio"
                className="check__box"
                name="motion"
                value={option.value}
                checked={save.settings.motion === option.value}
                onChange={() => updateSave((current) => updateSettings(current, { motion: option.value }))}
              />
              <span className="check__label">
                {option.label}
                <span className="check__hint">
                  {option.hint}
                  {option.value === 'system' && (deviceReducesMotion ? ' Right now it asks for less motion.' : ' Right now it allows motion.')}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="settings__group" aria-labelledby="kitchen-heading">
        <h2 id="kitchen-heading" className="settings__legend">
          Your kitchen
        </h2>
        <dl className="settings__facts">
          <div>
            <dt>Baker</dt>
            <dd>{save.profile.name}</dd>
          </div>
          <div>
            <dt>Kitchen</dt>
            <dd>{save.profile.bakeryName}</dd>
          </div>
          <div>
            <dt>Opened</dt>
            <dd>{openedOn}</dd>
          </div>
        </dl>
        <p className="settings__hint" aria-live="polite">
          {SAVE_STATUS_TEXT[saveStatus]}
        </p>
      </section>

      <section className="settings__group settings__group--danger" aria-labelledby="reset-heading">
        <h2 id="reset-heading" className="settings__legend">
          Start over
        </h2>
        <p className="settings__hint">
          Clears your names, settings and everything else saved for Homemade in this browser, then starts a new kitchen.
          There’s no undo.
        </p>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Start over…
        </Button>
        {resetFailed && (
          <p className="settings__error" role="alert">
            The save couldn’t be cleared. Nothing was changed; try again in a moment.
          </p>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="Start over from scratch?"
        confirmLabel={resetting ? 'Clearing…' : 'Clear my kitchen'}
        cancelLabel="Keep my kitchen"
        busy={resetting}
        onConfirm={confirmReset}
        onCancel={() => setConfirming(false)}
      >
        <p>
          This clears <strong>{save.profile.bakeryName}</strong> and everything saved with it from this browser.
        </p>
        <p>You’ll be asked for new names, just like the first time.</p>
      </ConfirmDialog>
    </RecipeCard>
  )
}
