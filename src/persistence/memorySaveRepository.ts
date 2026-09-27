import type { GameSave } from '../domain/types'
import type { ArchivedSave, LoadResult, SaveRepository } from './repository'
import { readSave } from './schema'

/**
 * A non-persistent repository with the same contract as the IndexedDB one.
 * Used by UI tests; `stored` can be seeded with arbitrary raw data.
 */
export function createMemorySaveRepository(stored?: unknown) {
  const state = { stored, archive: [] as ArchivedSave[] }

  const repository: SaveRepository = {
    async load(): Promise<LoadResult> {
      if (state.stored === undefined) return { kind: 'empty' }
      const result = readSave(state.stored)
      if (!result.ok) {
        return { kind: 'incompatible', reason: result.reason, version: result.version, detail: result.detail, raw: state.stored }
      }
      if (result.migratedFrom !== null) {
        state.archive.push({ archivedAt: new Date().toISOString(), note: 'migrated', data: state.stored })
        state.stored = structuredClone(result.save)
      }
      return { kind: 'loaded', save: structuredClone(result.save), migratedFrom: result.migratedFrom }
    },
    async write(save: GameSave) {
      state.stored = structuredClone(save)
    },
    async clear() {
      state.stored = undefined
    },
    async archiveAndClear(note: string) {
      if (state.stored === undefined) return
      state.archive.push({ archivedAt: new Date().toISOString(), note, data: state.stored })
      state.stored = undefined
    },
  }

  return { repository, state }
}
