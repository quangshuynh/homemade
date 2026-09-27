import type { GameSave } from '../domain/types'
import type { IncompatibleReason } from './schema'

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; save: GameSave; migratedFrom: number | null }
  | {
      kind: 'incompatible'
      reason: IncompatibleReason
      version: number | null
      detail: string
      /** The untouched stored data, so it can be backed up or inspected. */
      raw: unknown
    }

/**
 * Where the game keeps its save. The UI talks to this interface (through the
 * game provider), never to IndexedDB directly, so storage can change — or
 * gain cloud sync later — without touching screens.
 */
export interface SaveRepository {
  /** Reads, validates and (if needed) migrates the stored save. Never deletes data. */
  load(): Promise<LoadResult>
  /** Replaces the stored save. */
  write(save: GameSave): Promise<void>
  /** Deletes the stored save. Only called after the player confirms. */
  clear(): Promise<void>
  /**
   * Copies whatever is currently stored (valid or not) into the archive, then
   * clears the active slot. Used instead of `clear` when the save could not
   * be read, so nothing is lost.
   */
  archiveAndClear(note: string): Promise<void>
  /**
   * Installs a different save (an imported one) in a single step. Whatever
   * is stored now is archived first, never deleted, and so is `alsoArchive`
   * (for example an imported file's pre-upgrade original). If anything
   * fails, nothing changes.
   */
  replace(save: GameSave, options: ReplaceOptions): Promise<void>
}

export type ReplaceOptions = {
  /** Why the current save was set aside. */
  note: string
  alsoArchive?: { note: string; data: unknown }
}

export type ArchivedSave = {
  archivedAt: string
  note: string
  data: unknown
}
