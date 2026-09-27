import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import { UpdateNotice } from '../components/UpdateNotice'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeSave } from '../test/fixtures'
import { createInstallStore, type InstallPromptEvent } from './install'
import { createUpdateStore, type ContainerLike, type RegistrationLike, type WorkerLike } from './updates'

function fakeWorker(state = 'installing') {
  const listeners: (() => void)[] = []
  const worker = {
    state,
    postMessage: vi.fn(),
    addEventListener: (_type: 'statechange', listener: () => void) => listeners.push(listener),
    become(next: string) {
      worker.state = next
      listeners.forEach((listener) => listener())
    },
  }
  return worker satisfies WorkerLike
}

function fakeBrowser({ controller = {} as unknown, waiting = null as WorkerLike | null } = {}) {
  let onUpdateFound = () => {}
  let onControllerChange = () => {}
  const registration: RegistrationLike = {
    waiting,
    installing: null,
    update: vi.fn(() => Promise.resolve()),
    addEventListener: (_type, listener) => (onUpdateFound = listener),
  }
  const container: ContainerLike = {
    controller,
    register: vi.fn(async () => registration),
    addEventListener: (_type, listener) => (onControllerChange = listener),
  }
  return {
    registration,
    container,
    newVersionArrives(worker = fakeWorker()) {
      registration.installing = worker
      onUpdateFound()
      return worker
    },
    takeOver: () => onControllerChange(),
  }
}

describe('update store', () => {
  it('announces a newer version once it has installed and is waiting', async () => {
    const browser = fakeBrowser()
    const store = createUpdateStore(browser.container, vi.fn())
    await store.start()
    expect(store.getUpdateReady()).toBe(false)

    const worker = browser.newVersionArrives()
    worker.become('installed')

    expect(store.getUpdateReady()).toBe(true)
  })

  it('treats the very first install as setup, not an update', async () => {
    const browser = fakeBrowser({ controller: null })
    const store = createUpdateStore(browser.container, vi.fn())
    await store.start()
    browser.newVersionArrives().become('installed')
    expect(store.getUpdateReady()).toBe(false)
  })

  it('notices a version that was already waiting from an earlier visit', async () => {
    const browser = fakeBrowser({ waiting: fakeWorker('installed') })
    const store = createUpdateStore(browser.container, vi.fn())
    await store.start()
    expect(store.getUpdateReady()).toBe(true)
  })

  it('only reloads after the player asked for the update, never on its own', async () => {
    const waiting = fakeWorker('installed')
    const browser = fakeBrowser({ waiting })
    const reload = vi.fn()
    const store = createUpdateStore(browser.container, reload)
    await store.start()

    // Another tab switched versions: this one carries on, undisturbed.
    browser.takeOver()
    expect(reload).not.toHaveBeenCalled()

    store.applyUpdate()
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    browser.takeOver()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does nothing without service worker support, or if registering fails', async () => {
    await expect(createUpdateStore(undefined, vi.fn()).start()).resolves.toBeUndefined()
    const browser = fakeBrowser()
    browser.container.register = () => Promise.reject(new Error('insecure'))
    const store = createUpdateStore(browser.container, vi.fn())
    await expect(store.start()).resolves.toBeUndefined()
    expect(() => store.applyUpdate()).not.toThrow()
    expect(() => store.checkForUpdate()).not.toThrow()
  })
})

describe('install store', () => {
  function offer(outcome: 'accepted' | 'dismissed') {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as InstallPromptEvent
    event.prompt = vi.fn(() => Promise.resolve())
    event.userChoice = Promise.resolve({ outcome })
    return event
  }

  it('has nothing to offer until the browser offers it', () => {
    const store = createInstallStore(new EventTarget())
    expect(store.canInstall()).toBe(false)
  })

  it('keeps the browser’s offer, quietly, and uses it once', async () => {
    const target = new EventTarget()
    const store = createInstallStore(target)
    const event = offer('accepted')
    target.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(store.canInstall()).toBe(true)
    await expect(store.install()).resolves.toBe(true)
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(store.canInstall()).toBe(false)
  })

  it('reports a dismissed install, and forgets the offer once installed another way', async () => {
    const target = new EventTarget()
    const store = createInstallStore(target)
    target.dispatchEvent(offer('dismissed'))
    await expect(store.install()).resolves.toBe(false)

    target.dispatchEvent(offer('accepted'))
    target.dispatchEvent(new Event('appinstalled'))
    expect(store.canInstall()).toBe(false)
  })
})

describe('update notice', () => {
  function renderWithUpdate(ready: boolean, repository = createMemorySaveRepository(makeSave({ settings: { soundEnabled: false, motion: 'reduced' } })).repository) {
    const listeners = new Set<() => void>()
    const store = {
      getUpdateReady: () => ready,
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      start: vi.fn(),
      applyUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
    }
    render(
      <GameProvider repository={repository}>
        <App />
        <UpdateNotice store={store} />
      </GameProvider>,
    )
    return store
  }

  it('says nothing when there is no update', async () => {
    renderWithUpdate(false)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText('A fresh batch of Homemade is ready.')).not.toBeInTheDocument()
  })

  it('offers a refresh without forcing one, and applies it only when the player chooses', async () => {
    const user = userEvent.setup()
    const store = renderWithUpdate(true)
    expect(await screen.findByText('A fresh batch of Homemade is ready.')).toHaveAttribute('role', 'status')
    expect(screen.getByText(/Your kitchen is saved/)).toBeInTheDocument()
    expect(store.applyUpdate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(store.applyUpdate).toHaveBeenCalledTimes(1))
  })

  it('waits for the save to finish writing before switching versions', async () => {
    const user = userEvent.setup()
    const { repository } = createMemorySaveRepository(makeSave({ settings: { soundEnabled: false, motion: 'reduced' } }))
    let finishWrite = () => {}
    const slow = { ...repository, write: () => new Promise<void>((resolve) => (finishWrite = resolve)) }
    window.location.hash = '#/settings'
    const store = renderWithUpdate(true, slow)

    await user.click(await screen.findByRole('checkbox', { name: 'Play sounds' }))
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled()
    expect(store.applyUpdate).not.toHaveBeenCalled()

    finishWrite()
    await waitFor(() => expect(store.applyUpdate).toHaveBeenCalledTimes(1))
  })

  it('can be put off until later', async () => {
    const user = userEvent.setup()
    const store = renderWithUpdate(true)
    await user.click(await screen.findByRole('button', { name: 'Later' }))
    expect(screen.queryByText('A fresh batch of Homemade is ready.')).not.toBeInTheDocument()
    expect(store.applyUpdate).not.toHaveBeenCalled()
  })
})
