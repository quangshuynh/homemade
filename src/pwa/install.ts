/**
 * Keeps hold of the browser's install offer (`beforeinstallprompt`) so
 * Settings can show a quiet "Install Homemade" button. Where a browser
 * doesn't offer it (Safari, Firefox, or already installed) there's no
 * button at all: never a fake one.
 */

type Listener = () => void

export type InstallPromptEvent = Event & {
  prompt(): Promise<unknown>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallStore = {
  canInstall(): boolean
  subscribe(listener: Listener): () => void
  /** Shows the browser's own install dialog. Resolves with whether the player installed. */
  install(): Promise<boolean>
}

export function createInstallStore(target: Pick<EventTarget, 'addEventListener'> | undefined): InstallStore {
  let offer: InstallPromptEvent | null = null
  const listeners = new Set<Listener>()
  const changed = () => listeners.forEach((listener) => listener())

  target?.addEventListener('beforeinstallprompt', (event) => {
    // Hold the browser's mini-infobar back; the player can install from Settings.
    event.preventDefault()
    offer = event as InstallPromptEvent
    changed()
  })
  target?.addEventListener('appinstalled', () => {
    offer = null
    changed()
  })

  return {
    canInstall: () => offer !== null,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async install() {
      const current = offer
      if (!current) return false
      // An offer can only be used once.
      offer = null
      changed()
      try {
        await current.prompt()
        return (await current.userChoice).outcome === 'accepted'
      } catch {
        return false
      }
    },
  }
}

export const installer = createInstallStore(typeof window === 'undefined' ? undefined : window)
