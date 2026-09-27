/*
 * Homemade's service worker: a small, conservative offline app shell.
 *
 * Built into dist/sw.js by ./plugin.ts, which replaces the two placeholders
 * below with this build's file list and a version derived from their contents.
 *
 * - Precaches this build's own files (HTML, scripts, styles, fonts, icons,
 *   sounds) and serves them cache-first, so a kitchen that has loaded once
 *   opens without a network.
 * - Only same-origin GET requests are ever answered. Everything else, and
 *   anything not in the precache, goes to the network untouched.
 * - Never touches IndexedDB. The save lives there and is none of this
 *   file's business; updating or removing the worker can't affect it.
 * - A new version installs in the background and then waits. It takes over
 *   only when the player chooses "Refresh" (the page posts SKIP_WAITING) or
 *   when every Homemade tab has been closed. No surprise reloads mid-bake.
 */

const VERSION = __HOMEMADE_SW_VERSION__
const PRECACHE = __HOMEMADE_SW_PRECACHE__

const CACHE_PREFIX = 'homemade-shell-'
const CACHE_NAME = CACHE_PREFIX + VERSION
/** The one page. Routing is in the hash, so the server only ever serves this. */
const SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // `reload` skips the HTTP cache, so the shell and its files come from the same deploy.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    if (url.pathname !== '/' && url.pathname !== SHELL) return
    event.respondWith(fromCache(SHELL).then((cached) => cached || fetch(request)))
    return
  }

  if (!PRECACHE.includes(url.pathname)) return
  event.respondWith(fromCache(url.pathname).then((cached) => cached || fetch(request)))
})

function fromCache(path) {
  return caches.open(CACHE_NAME).then((cache) => cache.match(path))
}
