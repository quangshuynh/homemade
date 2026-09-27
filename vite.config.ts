import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { serviceWorkerPlugin } from './service-worker/plugin.ts'

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
