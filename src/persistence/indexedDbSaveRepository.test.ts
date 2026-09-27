import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION, touchSave, updateSettings } from '../domain/save'
import { makeSave } from '../test/fixtures'
import { createIndexedDbSaveRepository, readArchive, type IndexedDbSaveRepositoryOptions } from './indexedDbSaveRepository'
import { findSaveProblem } from './schema'

let options: IndexedDbSaveRepositoryOptions

beforeEach(() => {
  // A fresh, isolated IndexedDB for every test.
  options = { factory: new IDBFactory(), databaseName: 'homemade-test', now: () => new Date('2026-04-01T12:00:00.000Z') }
})

/** Writes arbitrary data into the save slot, bypassing the repository's checks. */
async function putRaw(raw: unknown) {
  const repo = createIndexedDbSaveRepository(options)
  await repo.load() // creates the object stores
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = options.factory!.open(options.databaseName!)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('saves', 'readwrite')
    tx.objectStore('saves').put(raw, 'main')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

describe('IndexedDB save repository', () => {
  it('reports an empty kitchen on first run', async () => {
    const repo = createIndexedDbSaveRepository(options)
    await expect(repo.load()).resolves.toEqual({ kind: 'empty' })
  })

  it('persists a new save so a later session loads the same names', async () => {
    const save = makeSave()
    await createIndexedDbSaveRepository(options).write(save)

    // A separate repository instance stands in for reopening the game.
    const result = await createIndexedDbSaveRepository(options).load()

    expect(result).toEqual({ kind: 'loaded', save, migratedFrom: null })
    if (result.kind === 'loaded') {
      expect(result.save.profile.name).toBe('Robin')
      expect(result.save.profile.bakeryName).toBe('Crumb & Co.')
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
    }
  })

  it('replaces the save on update, keeping createdAt and moving updatedAt', async () => {
    const repo = createIndexedDbSaveRepository(options)
    const save = makeSave()
    await repo.write(save)

    const later = new Date('2026-05-01T08:00:00.000Z')
    const updated = touchSave(save, (s) => updateSettings(s, { soundEnabled: false, motion: 'reduced' }), later)
    await repo.write(updated)

    const result = await createIndexedDbSaveRepository(options).load()
    expect(result).toMatchObject({
      kind: 'loaded',
      save: {
        settings: { soundEnabled: false, motion: 'reduced' },
        createdAt: save.createdAt,
        updatedAt: later.toISOString(),
      },
    })
  })

  it('clears the save on reset, returning to first run', async () => {
    const repo = createIndexedDbSaveRepository(options)
    await repo.write(makeSave())

    await repo.clear()

    await expect(createIndexedDbSaveRepository(options).load()).resolves.toEqual({ kind: 'empty' })
  })

  it('leaves an unreadable save in place and hands back the raw data', async () => {
    const future = { ...makeSave(), version: CURRENT_SAVE_VERSION + 1 }
    await putRaw(future)
    const repo = createIndexedDbSaveRepository(options)

    const first = await repo.load()
    const second = await repo.load()

    expect(first).toMatchObject({ kind: 'incompatible', reason: 'newer-version', raw: future })
    expect(second).toMatchObject({ kind: 'incompatible', reason: 'newer-version' })
  })

  it('archives an unreadable save instead of deleting it when starting over', async () => {
    const damaged = { version: CURRENT_SAVE_VERSION, profile: 'oops' }
    await putRaw(damaged)
    const repo = createIndexedDbSaveRepository(options)

    await repo.archiveAndClear('could not be read')

    await expect(repo.load()).resolves.toEqual({ kind: 'empty' })
    await expect(readArchive(options)).resolves.toEqual([
      { archivedAt: '2026-04-01T12:00:00.000Z', note: 'could not be read', data: damaged },
    ])
  })

  it('keeps a copy of the original when a save is migrated, and stores the upgrade', async () => {
    const save = makeSave()
    const versionOne = { ...save, version: 1, profile: { id: save.profile.id, name: save.profile.name, kitchen: save.profile.bakeryName } }
    await putRaw(versionOne)
    const schema = {
      currentVersion: 2,
      migrations: {
        1: (raw: Record<string, unknown>) => {
          const { kitchen, ...profile } = raw.profile as Record<string, unknown>
          return { ...raw, version: 2, profile: { ...profile, bakeryName: kitchen } }
        },
      },
      findProblem: (value: Record<string, unknown>) => findSaveProblem({ ...value, version: CURRENT_SAVE_VERSION }),
    }

    const result = await createIndexedDbSaveRepository({ ...options, schema }).load()

    expect(result).toEqual({ kind: 'loaded', save: { ...save, version: 2 }, migratedFrom: 1 })
    const archive = await readArchive(options)
    expect(archive).toHaveLength(1)
    expect(archive[0]?.data).toEqual(versionOne)
    // The upgraded save is what's stored now, so the next load needs no migration.
    await expect(createIndexedDbSaveRepository({ ...options, schema }).load()).resolves.toMatchObject({ migratedFrom: null })
  })

  it('fails loudly when the browser has no IndexedDB', async () => {
    const repo = createIndexedDbSaveRepository({ factory: undefined as unknown as IDBFactory })
    const original = globalThis.indexedDB
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB
    try {
      await expect(repo.load()).rejects.toThrow(/IndexedDB/)
    } finally {
      if (original) globalThis.indexedDB = original
    }
  })
})
