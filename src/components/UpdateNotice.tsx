import { useState, useSyncExternalStore } from 'react'
import { useGame } from '../app/gameContext'
import { updates, type UpdateStore } from '../pwa/updates'
import { Button } from './Button'
import './UpdateNotice.css'

/**
 * A small note left on the counter when a newer Homemade has downloaded.
 * It never interrupts: the player refreshes when it suits them, or waves it
 * away until next time. Refreshing waits for the save to finish writing.
 */
export function UpdateNotice({ store = updates }: { store?: UpdateStore }) {
  const ready = useSyncExternalStore(store.subscribe, store.getUpdateReady, () => false)
  const { whenSaved } = useGame()
  const [dismissed, setDismissed] = useState(false)
  const [applying, setApplying] = useState(false)

  if (!ready || dismissed) return null

  return (
    <aside className="update-notice" aria-labelledby="update-notice-text">
      <p id="update-notice-text" role="status">
        A fresh batch of Homemade is ready.
      </p>
      <p className="update-notice__detail">Your kitchen is saved. Anything in the bowl goes back on the shelf.</p>
      <div className="update-notice__actions">
        <Button
          variant="primary"
          disabled={applying}
          onClick={async () => {
            setApplying(true)
            await whenSaved()
            store.applyUpdate()
          }}
        >
          {applying ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button disabled={applying} onClick={() => setDismissed(true)}>
          Later
        </Button>
      </div>
    </aside>
  )
}
