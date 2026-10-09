import type { GameSave } from '../domain/types'
import { openDatabase, requestToPromise, transactionDone } from './idb'
import type { ArchivedSave, LoadResult, ReplaceOptions, SaveRepository } from './repository'
import { readSave, type ReadSaveOptions } from './schema'

/**
 * Layout of the IndexedDB database. This version is about the database's
 * object stores, not the save schema (see CURRENT_SAVE_VERSION for that).
 */
const DB_VERSION = 1
const SAVES = 'saves'
const ARCHIVE = 'archive'
/** One save slot for now; the key leaves room for more later. */
const MAIN_SLOT = 'main'

export type IndexedDbSaveRepositoryOptions = {
  databaseName?: string
  /** Injected in tests; defaults to the browser's `indexedDB`. */
  factory?: IDBFactory
  now?: () => Date
  /** Overrides the save schema (migrations, version); for tests. */
  schema?: ReadSaveOptions
}

export function createIndexedDbSaveRepository(options: IndexedDbSaveRepositoryOptions = {}): SaveRepository {
  const databaseName = options.databaseName ?? 'homemade'
  const now = options.now ?? (() => new Date())
  let dbPromise: Promise<IDBDatabase> | null = null

  function db(): Promise<IDBDatabase> {
    const factory = options.factory ?? globalThis.indexedDB
    if (!factory) return Promise.reject(new Error('This browser has no IndexedDB, so Homemade cannot save.'))
    dbPromise ??= openDatabase(factory, databaseName, DB_VERSION, (database, oldVersion) => {
      if (oldVersion < 1) {
        database.createObjectStore(SAVES)
        database.createObjectStore(ARCHIVE, { autoIncrement: true })
      }
    }).catch((error: unknown) => {
      // Let the next call try again instead of caching the failure.
      dbPromise = null
      throw error
    })
    return dbPromise
  }

  async function readRaw(): Promise<unknown> {
    const database = await db()
    const tx = database.transaction(SAVES, 'readonly')
    return requestToPromise(tx.objectStore(SAVES).get(MAIN_SLOT))
  }

  /** Archives the given data and optionally replaces or clears the active slot, atomically. */
  async function archive(data: unknown, note: string, replacement: GameSave | null): Promise<void> {
    const database = await db()
    const tx = database.transaction([SAVES, ARCHIVE], 'readwrite')
    const entry: ArchivedSave = { archivedAt: now().toISOString(), note, data }
    tx.objectStore(ARCHIVE).add(entry)
    if (replacement) tx.objectStore(SAVES).put(replacement, MAIN_SLOT)
    else tx.objectStore(SAVES).delete(MAIN_SLOT)
    await transactionDone(tx)
  }

  async function loadOnce(): Promise<LoadResult> {
    const raw = await readRaw()
    if (raw === undefined) return { kind: 'empty' }

    const result = readSave(raw, options.schema)
    if (!result.ok) {
      return { kind: 'incompatible', reason: result.reason, version: result.version, detail: result.detail, raw }
    }
    if (result.migratedFrom !== null) {
      // Keep the pre-migration original so an upgrade bug can never eat a save.
      await archive(raw, `Upgraded from save version ${result.migratedFrom}`, result.save)
    }
    return { kind: 'loaded', save: result.save, migratedFrom: result.migratedFrom }
  }

  // Loads asked for while one is still running share it. Otherwise two at once
  // (React StrictMode runs the load effect twice in development) would both
  // read the old save before either wrote the upgrade, and archive it twice.
  let loading: Promise<LoadResult> | null = null

  return {
    load(): Promise<LoadResult> {
      loading ??= loadOnce().finally(() => {
        loading = null
      })
      return loading
    },

    async write(save: GameSave): Promise<void> {
      const database = await db()
      const tx = database.transaction(SAVES, 'readwrite')
      tx.objectStore(SAVES).put(save, MAIN_SLOT)
      await transactionDone(tx)
    },

    async clear(): Promise<void> {
      const database = await db()
      const tx = database.transaction(SAVES, 'readwrite')
      tx.objectStore(SAVES).delete(MAIN_SLOT)
      await transactionDone(tx)
    },

    async replace(save: GameSave, { note, alsoArchive }: ReplaceOptions): Promise<void> {
      const database = await db()
      // One transaction: read what's there, archive it, archive the extra, install the new save.
      const tx = database.transaction([SAVES, ARCHIVE], 'readwrite')
      const saves = tx.objectStore(SAVES)
      const archiveStore = tx.objectStore(ARCHIVE)
      const archivedAt = now().toISOString()
      const current = saves.get(MAIN_SLOT)
      current.onsuccess = () => {
        try {
          if (current.result !== undefined) archiveStore.add({ archivedAt, note, data: current.result } satisfies ArchivedSave)
          if (alsoArchive) archiveStore.add({ archivedAt, note: alsoArchive.note, data: alsoArchive.data } satisfies ArchivedSave)
          saves.put(save, MAIN_SLOT)
        } catch {
          // e.g. data that can't be stored: undo the lot, so the current save stays exactly as it was.
          tx.abort()
        }
      }
      await transactionDone(tx)
    },

    async archiveAndClear(note: string): Promise<void> {
      const raw = await readRaw()
      if (raw === undefined) return
      await archive(raw, note, null)
    },
  }
}

/** Test/debug helper: everything currently in the archive store. */
export async function readArchive(options: IndexedDbSaveRepositoryOptions = {}): Promise<ArchivedSave[]> {
  const factory = options.factory ?? globalThis.indexedDB
  const database = await openDatabase(factory, options.databaseName ?? 'homemade', DB_VERSION, () => {})
  try {
    const tx = database.transaction(ARCHIVE, 'readonly')
    return (await requestToPromise(tx.objectStore(ARCHIVE).getAll())) as ArchivedSave[]
  } finally {
    database.close()
  }
}
