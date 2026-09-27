import type { GameSave } from '../domain/types'
import { readSave, serializeSave, type ReadSaveOptions } from './schema'

/**
 * Save files the player can carry between browsers: export writes one,
 * import reads one back through exactly the same checks and migrations as a
 * save loaded from IndexedDB. Nothing here touches storage; installing an
 * imported save is the repository's job, and only after the player confirms.
 */

/** Marks a file as a Homemade save, so any other JSON is turned away politely. */
export const SAVE_FILE_FORMAT = 'homemade-save'

/** Far bigger than any real save (50 bakes is a few kilobytes); anything larger isn't one. */
export const MAX_IMPORT_BYTES = 1024 * 1024

export type SaveFile = {
  format: typeof SAVE_FILE_FORMAT
  exportedAt: string
  save: GameSave
}

/** Turns a kitchen name into a safe file name: `homemade-crumb-co.json`. */
export function saveFileName(bakeryName: string): string {
  const slug = bakeryName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
  return slug ? `homemade-${slug}.json` : 'homemade-save.json'
}

/** The whole logical save, versioned, wrapped so it's recognisable. No storage metadata. */
export function exportSave(save: GameSave, now: Date = new Date()): { fileName: string; text: string } {
  const file: SaveFile = { format: SAVE_FILE_FORMAT, exportedAt: now.toISOString(), save }
  return { fileName: saveFileName(save.profile.bakeryName), text: serializeSave(file) }
}

export type ImportSummary = {
  playerName: string
  bakeryName: string
  recipeCount: number
  memoryCount: number
  /** When the kitchen in the file was last changed. */
  lastSaved: string
}

export type ImportProblem = 'too-large' | 'not-json' | 'not-homemade' | 'newer-version' | 'damaged'

export type ImportResult =
  | {
      ok: true
      save: GameSave
      /** The file's save exactly as read, before any upgrade, so it can be archived. */
      original: unknown
      migratedFrom: number | null
      summary: ImportSummary
    }
  | { ok: false; problem: ImportProblem; message: string; detail?: string }

const MESSAGES: Record<ImportProblem, string> = {
  'too-large': 'That file is far too big to be a Homemade save.',
  'not-json': 'That file isn’t a Homemade save. It couldn’t be read as a save file at all.',
  'not-homemade': 'That file doesn’t look like a Homemade save.',
  'newer-version': 'This save was made by a newer version of Homemade and can’t be opened here yet.',
  damaged: 'This save looks damaged, so it can’t be opened safely.',
}

function fail(problem: ImportProblem, detail?: string): ImportResult {
  return { ok: false, problem, message: MESSAGES[problem], detail }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads the text of a chosen file. Accepts an exported save file, or a bare
 * save (what "Download a copy" on the save-problem screen writes). Never
 * repairs anything: a save that doesn't pass validation is refused.
 */
export function readSaveFile(text: string, options: ReadSaveOptions = {}): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return fail('too-large')

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return fail('not-json')
  }
  if (!isRecord(parsed)) return fail('not-homemade')

  let candidate: unknown
  if (parsed.format === SAVE_FILE_FORMAT) {
    candidate = parsed.save
  } else if ('format' in parsed) {
    return fail('not-homemade')
  } else if ('profile' in parsed && 'version' in parsed) {
    candidate = parsed
  } else {
    return fail('not-homemade')
  }

  const result = readSave(candidate, options)
  if (!result.ok) {
    switch (result.reason) {
      case 'newer-version':
        return fail('newer-version', result.detail)
      case 'unrecognised':
        return fail('not-homemade', result.detail)
      default:
        return fail('damaged', result.detail)
    }
  }

  const { save } = result
  return {
    ok: true,
    save,
    original: candidate,
    migratedFrom: result.migratedFrom,
    summary: {
      playerName: save.profile.name,
      bakeryName: save.profile.bakeryName,
      recipeCount: save.discoveredRecipes.length,
      memoryCount: save.bakedCreations.length,
      lastSaved: save.updatedAt,
    },
  }
}
