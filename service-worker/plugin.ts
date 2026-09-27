import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * Builds `dist/sw.js` from `service-worker.js` once the rest of the build
 * has been written. No PWA framework: the worker is one small file, and all
 * this does is list what to precache and stamp a version.
 */

export const SERVICE_WORKER_FILE = 'sw.js'
const VERSION_TOKEN = '__HOMEMADE_SW_VERSION__'
const PRECACHE_TOKEN = '__HOMEMADE_SW_PRECACHE__'

export type BuiltFile = { path: string; content: Uint8Array }

/**
 * Which built files the worker precaches, as root-relative URLs. Leaves out
 * the worker itself, source maps, and `.woff` fonts (every browser that can
 * install a PWA uses the `.woff2` next to them).
 */
export function precacheList(paths: readonly string[]): string[] {
  return paths
    .map((path) => path.split(sep).join('/'))
    .filter((path) => path !== SERVICE_WORKER_FILE && !path.endsWith('.map') && !path.endsWith('.woff') && !path.split('/').some((part) => part.startsWith('.')))
    .map((path) => `/${path}`)
    .sort()
}

/** Changes whenever any precached file's name or content changes, so each deploy gets its own cache. */
export function cacheVersion(files: readonly BuiltFile[]): string {
  const hash = createHash('sha256')
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path)
    hash.update('\0')
    hash.update(file.content)
    hash.update('\0')
  }
  return hash.digest('hex').slice(0, 16)
}

export function renderServiceWorker(template: string, precache: readonly string[], version: string): string {
  if (!template.includes(VERSION_TOKEN) || !template.includes(PRECACHE_TOKEN)) {
    throw new Error('service-worker.js is missing its build placeholders')
  }
  return template.replace(VERSION_TOKEN, JSON.stringify(version)).replace(PRECACHE_TOKEN, JSON.stringify(precache, null, 2))
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

export function serviceWorkerPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'homemade:service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir)
      const paths = listFiles(outDir).map((file) => relative(outDir, file))
      const precache = precacheList(paths)
      const files = precache.map((url) => ({ path: url, content: readFileSync(join(outDir, url.slice(1))) }))
      const template = readFileSync(resolve(config.root, 'service-worker/service-worker.js'), 'utf8')
      writeFileSync(join(outDir, SERVICE_WORKER_FILE), renderServiceWorker(template, precache, cacheVersion(files)))
    },
  }
}
