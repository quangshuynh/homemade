/**
 * Registers the service worker and notices when a newer Homemade has been
 * downloaded and is waiting. The page decides when to switch: only the
 * player's "Refresh" does, after the save has finished writing. Nothing
 * here reloads by itself, and nothing here touches the save.
 */

type Listener = () => void

/** The parts of ServiceWorkerContainer/Registration used here, so tests can fake them. */
export type WorkerLike = { state: string; postMessage(message: unknown): void; addEventListener(type: 'statechange', listener: Listener): void }
export type RegistrationLike = {
  waiting: WorkerLike | null
  installing: WorkerLike | null
  update(): Promise<unknown>
  addEventListener(type: 'updatefound', listener: Listener): void
}
export type ContainerLike = {
  controller: unknown
  register(url: string, options?: { scope?: string }): Promise<RegistrationLike>
  addEventListener(type: 'controllerchange', listener: Listener): void
}

export type UpdateStore = {
  /** True once a newer version is installed and waiting for the player's go-ahead. */
  getUpdateReady(): boolean
  subscribe(listener: Listener): () => void
  /** Registers the worker. Resolves quietly if that isn't possible. */
  start(): Promise<void>
  /** Hands over to the waiting version, then reloads once it's in charge. */
  applyUpdate(): void
  /** Asks the server whether there's a newer version (for long-open tabs). */
  checkForUpdate(): void
}

export function createUpdateStore(container: ContainerLike | undefined, reload: () => void, url = '/sw.js'): UpdateStore {
  let registration: RegistrationLike | null = null
  let ready = false
  let applying = false
  const listeners = new Set<Listener>()

  function setReady(value: boolean) {
    if (ready === value) return
    ready = value
    for (const listener of listeners) listener()
  }

  // Only a worker that replaces an existing one is an "update"; the very first install isn't.
  function watch(worker: WorkerLike) {
    const check = () => {
      if (worker.state === 'installed' && container?.controller) setReady(true)
    }
    check()
    worker.addEventListener('statechange', check)
  }

  return {
    getUpdateReady: () => ready,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async start() {
      if (!container) return
      try {
        registration = await container.register(url, { scope: '/' })
      } catch {
        return // Homemade still works online without a worker.
      }
      if (registration.waiting && container.controller) setReady(true)
      if (registration.installing) watch(registration.installing)
      registration.addEventListener('updatefound', () => {
        if (registration?.installing) watch(registration.installing)
      })
      container.addEventListener('controllerchange', () => {
        // Reload only when the player asked for the new version, never on our own.
        if (applying) reload()
      })
    },
    applyUpdate() {
      const waiting = registration?.waiting
      if (!waiting) return
      applying = true
      waiting.postMessage({ type: 'SKIP_WAITING' })
    },
    checkForUpdate() {
      void registration?.update().catch(() => {})
    },
  }
}

const browserContainer = typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? (navigator.serviceWorker as unknown as ContainerLike) : undefined

export const updates = createUpdateStore(browserContainer, () => window.location.reload())
