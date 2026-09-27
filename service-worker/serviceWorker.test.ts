// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { cacheVersion, precacheList, renderServiceWorker } from './plugin.ts'

const template = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8')
const ORIGIN = 'https://homemade.example'
const bytes = (text: string) => new TextEncoder().encode(text)

describe('what gets precached', () => {
  it('lists the built app, fonts, icons, sounds and manifest as root-relative URLs', () => {
    expect(
      precacheList([
        'index.html',
        'manifest.webmanifest',
        'sw.js',
        'assets/index-abc.js',
        'assets/index-abc.js.map',
        'assets/gluten-latin-wght-normal-x.woff2',
        'assets/atkinson-400-normal-y.woff',
        'assets/ding-z.wav',
        'icons/icon-192.png',
        '.DS_Store',
      ]),
    ).toEqual([
      '/assets/ding-z.wav',
      '/assets/gluten-latin-wght-normal-x.woff2',
      '/assets/index-abc.js',
      '/icons/icon-192.png',
      '/index.html',
      '/manifest.webmanifest',
    ])
  })

  it('versions the cache by content, so any change to any file is a new version', () => {
    const files = [
      { path: '/index.html', content: bytes('<html>') },
      { path: '/icons/icon.svg', content: bytes('<svg>') },
    ]
    const version = cacheVersion(files)
    expect(cacheVersion([...files].reverse())).toBe(version)
    expect(cacheVersion([files[0]!, { path: '/icons/icon.svg', content: bytes('<svg >') }])).not.toBe(version)
    expect(cacheVersion([files[0]!, { path: '/icons/other.svg', content: bytes('<svg>') }])).not.toBe(version)
  })

  it('refuses to build a worker from a template missing its placeholders', () => {
    expect(() => renderServiceWorker('self.addEventListener("fetch", () => {})', [], 'v1')).toThrow(/placeholders/)
  })
})

/** Runs the real worker script against a small fake of the service worker globals. */
function bootWorker(precache = ['/index.html', '/assets/app.js', '/icons/icon-192.png'], version = 'v2') {
  const listeners: Record<string, (event: unknown) => void> = {}
  const stores = new Map<string, Map<string, string>>([
    ['homemade-shell-v1', new Map([['/index.html', 'old shell']])],
    ['someone-elses-cache', new Map()],
  ])
  const caches = {
    open: vi.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      const store = stores.get(name)!
      return {
        addAll: vi.fn(async (requests: { url: string; cache: string }[]) => {
          for (const request of requests) store.set(request.url, `fresh ${request.url} (${request.cache})`)
        }),
        match: vi.fn(async (path: string) => store.get(path)),
      }
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
  }
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: (event: unknown) => void) => (listeners[type] = listener),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
    get indexedDB(): never {
      throw new Error('the service worker must never touch the save')
    },
  }
  const network = vi.fn(async (request: { url: string }) => `network ${request.url}`)
  class FakeRequest {
    url: string
    cache: string
    constructor(url: string, init: { cache: string }) {
      this.url = url
      this.cache = init.cache
    }
  }
  const source = renderServiceWorker(template, precache, version)
  new Function('self', 'caches', 'fetch', 'Request', 'URL', source)(self, caches, network, FakeRequest, URL)

  async function lifecycle(type: 'install' | 'activate') {
    let done: Promise<unknown> = Promise.resolve()
    listeners[type]!({ waitUntil: (promise: Promise<unknown>) => (done = promise) })
    await done
  }

  /** Returns what the worker answered with, or 'network (not handled)' if it let the request through. */
  async function request(path: string, { method = 'GET', mode = 'cors', origin = ORIGIN } = {}) {
    let response: Promise<unknown> | undefined
    listeners.fetch!({ request: { url: origin + path, method, mode }, respondWith: (value: Promise<unknown>) => (response = value) })
    return response ? await response : 'network (not handled)'
  }

  return { self, stores, network, lifecycle, request, message: (data: unknown) => listeners.message!({ data }) }
}

describe('the service worker', () => {
  it('precaches this build’s files, bypassing the HTTP cache, and then waits instead of taking over', async () => {
    const worker = bootWorker()
    await worker.lifecycle('install')

    expect([...worker.stores.get('homemade-shell-v2')!.values()]).toEqual([
      'fresh /index.html (reload)',
      'fresh /assets/app.js (reload)',
      'fresh /icons/icon-192.png (reload)',
    ])
    expect(worker.self.skipWaiting).not.toHaveBeenCalled()
  })

  it('takes over only when the page says the player chose to refresh', () => {
    const worker = bootWorker()
    worker.message({ type: 'something else' })
    expect(worker.self.skipWaiting).not.toHaveBeenCalled()
    worker.message({ type: 'SKIP_WAITING' })
    expect(worker.self.skipWaiting).toHaveBeenCalledTimes(1)
  })

  it('on activation clears only its own older caches', async () => {
    const worker = bootWorker()
    await worker.lifecycle('install')
    await worker.lifecycle('activate')
    expect([...worker.stores.keys()].sort()).toEqual(['homemade-shell-v2', 'someone-elses-cache'])
    expect(worker.self.clients.claim).toHaveBeenCalled()
  })

  it('serves the shell from the cache for a navigation, so the game opens offline', async () => {
    const worker = bootWorker()
    await worker.lifecycle('install')
    await expect(worker.request('/', { mode: 'navigate' })).resolves.toBe('fresh /index.html (reload)')
    await expect(worker.request('/index.html', { mode: 'navigate' })).resolves.toBe('fresh /index.html (reload)')
    expect(worker.network).not.toHaveBeenCalled()
  })

  it('serves precached files from the cache and falls back to the network if they are missing', async () => {
    const worker = bootWorker()
    await worker.lifecycle('install')
    await expect(worker.request('/assets/app.js')).resolves.toBe('fresh /assets/app.js (reload)')

    worker.stores.get('homemade-shell-v2')!.delete('/assets/app.js')
    await expect(worker.request('/assets/app.js')).resolves.toBe(`network ${ORIGIN}/assets/app.js`)
  })

  it('leaves everything else to the network: other sites, other methods, unknown files and other pages', async () => {
    const worker = bootWorker()
    await worker.lifecycle('install')
    await expect(worker.request('/assets/app.js', { origin: 'https://fonts.example' })).resolves.toBe('network (not handled)')
    await expect(worker.request('/assets/app.js', { method: 'POST' })).resolves.toBe('network (not handled)')
    await expect(worker.request('/assets/not-in-this-build.js')).resolves.toBe('network (not handled)')
    await expect(worker.request('/sw.js')).resolves.toBe('network (not handled)')
    await expect(worker.request('/icons/icon.svg', { mode: 'navigate' })).resolves.toBe('network (not handled)')
  })

  it('never touches IndexedDB, through install, activation, updates and requests', async () => {
    // The fake `self.indexedDB` throws if read, so any use would fail these steps.
    const worker = bootWorker()
    await worker.lifecycle('install')
    await worker.lifecycle('activate')
    worker.message({ type: 'SKIP_WAITING' })
    await worker.request('/', { mode: 'navigate' })
    expect(template).not.toMatch(/indexedDB|localStorage/)
  })
})
