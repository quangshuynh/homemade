import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { GameProvider } from './app/GameProvider'
import { createIndexedDbSaveRepository } from './persistence/indexedDbSaveRepository'
import { updates } from './pwa/updates'
import './styles/base.css'

const repository = createIndexedDbSaveRepository()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider repository={repository}>
      <App />
    </GameProvider>
  </StrictMode>,
)

// The offline shell is for real builds only; in dev it would serve stale modules.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => void updates.start())
  // A tab (or installed app) left open for days still hears about new versions.
  const HOUR = 60 * 60 * 1000
  let lastCheck = Date.now()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > HOUR) {
      lastCheck = Date.now()
      updates.checkForUpdate()
    }
  })
}
