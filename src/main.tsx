import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { GameProvider } from './app/GameProvider'
import { createIndexedDbSaveRepository } from './persistence/indexedDbSaveRepository'
import './styles/base.css'

const repository = createIndexedDbSaveRepository()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider repository={repository}>
      <App />
    </GameProvider>
  </StrictMode>,
)
