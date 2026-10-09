import { isDecorationSlot } from '../decorating/slots'
import { isIdOf } from '../domain/ids'
import { CURRENT_SAVE_VERSION, NAME_MAX_LENGTH } from '../domain/save'
import type { GameSave, MotionPreference } from '../domain/types'
import { MIGRATIONS, type Migration, type RawRecord } from './migrations'

/**
 * The boundary between whatever is on disk and the typed GameSave the game
 * uses. Nothing read from storage reaches the game without passing through
 * `readSave`.
 */

export type { Migration }

export type IncompatibleReason =
  /** Not recognisable as a Homemade save at all. */
  | 'unrecognised'
  /** Written by a newer build of the game than this one. */
  | 'newer-version'
  /** An older version with no migration path. */
  | 'no-migration'
  /** A migration threw. */
  | 'migration-failed'
  /** Says it is the current version but the shape is wrong. */
  | 'invalid'

export type ReadResult =
  | { ok: true; save: GameSave; migratedFrom: number | null }
  | { ok: false; reason: IncompatibleReason; version: number | null; detail: string }

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= NAME_MAX_LENGTH
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

const MOTION_PREFERENCES: readonly MotionPreference[] = ['system', 'reduced', 'full']

/** Explains the first thing wrong with a current-version save, or returns null. */
export function findSaveProblem(value: RawRecord): string | null {
  if (value.version !== CURRENT_SAVE_VERSION) return `version is ${String(value.version)}`

  const profile = value.profile
  if (!isRecord(profile)) return 'profile is missing'
  if (!isIdOf('player', profile.id)) return 'profile.id is not a player id'
  if (!isName(profile.name)) return 'profile.name is not a valid name'
  if (!isName(profile.bakeryName)) return 'profile.bakeryName is not a valid name'

  const pantry = value.pantryIngredientIds
  if (!Array.isArray(pantry) || !pantry.every((id) => isIdOf('ingredient', id))) {
    return 'pantryIngredientIds is not a list of ingredient ids'
  }

  // Ids are checked for shape, not against the catalog: a recipe retired in a
  // later build must not make an otherwise good save unreadable.
  const discovered = value.discoveredRecipes
  if (
    !Array.isArray(discovered) ||
    !discovered.every((entry) => isRecord(entry) && isIdOf('recipe', entry.recipeId) && isIsoDate(entry.discoveredAt))
  ) {
    return 'discoveredRecipes is not a list of discoveries'
  }

  const creations = value.bakedCreations
  if (
    !Array.isArray(creations) ||
    !creations.every(
      (entry) =>
        isRecord(entry) &&
        isIdOf('creation', entry.id) &&
        Array.isArray(entry.ingredientIds) &&
        entry.ingredientIds.every((id) => isIdOf('ingredient', id)) &&
        (entry.recipeId === null || isIdOf('recipe', entry.recipeId)) &&
        isIsoDate(entry.bakedAt),
    )
  ) {
    return 'bakedCreations is not a list of bakes'
  }

  const progression = value.progression
  if (!isRecord(progression)) return 'progression is missing'
  if (!isCount(progression.crumbs)) return 'progression.crumbs is not a whole number of Crumbs'
  if (!isCount(progression.xp)) return 'progression.xp is not a whole amount of XP'

  const tutorial = value.tutorial
  if (!isRecord(tutorial)) return 'tutorial is missing'
  if (typeof tutorial.completed !== 'boolean') return 'tutorial.completed is not a boolean'
  if (typeof tutorial.skipped !== 'boolean') return 'tutorial.skipped is not a boolean'

  // Scene ids are checked for shape, not against the story: a scene rewritten
  // in a later build must not make an otherwise good save unreadable.
  const story = value.story
  if (!isRecord(story)) return 'story is missing'
  if (!Array.isArray(story.seenSceneIds) || !story.seenSceneIds.every((id) => isIdOf('scene', id))) {
    return 'story.seenSceneIds is not a list of scene ids'
  }

  // Decoration ids are checked for shape, not against the catalog, like
  // recipes: one retired in a later build stays in the save and is simply
  // not shown. Spots are a fixed list, and what's out must be something owned.
  const decorating = value.decorating
  if (!isRecord(decorating)) return 'decorating is missing'
  const owned = decorating.ownedDecorationIds
  if (!Array.isArray(owned) || !owned.every((id) => isIdOf('decoration', id))) {
    return 'decorating.ownedDecorationIds is not a list of decoration ids'
  }
  if (new Set(owned).size !== owned.length) return 'decorating.ownedDecorationIds lists a decoration twice'
  const equipped = decorating.equippedBySlot
  if (!isRecord(equipped)) return 'decorating.equippedBySlot is missing'
  for (const [slot, id] of Object.entries(equipped)) {
    if (!isDecorationSlot(slot)) return `decorating.equippedBySlot has an unknown spot "${slot}"`
    if (!isIdOf('decoration', id)) return `decorating.equippedBySlot.${slot} is not a decoration id`
    if (!owned.includes(id)) return `decorating.equippedBySlot.${slot} is something the kitchen doesn't own`
  }
  const noticed = decorating.noticedMomentIds
  if (!Array.isArray(noticed) || !noticed.every((id) => typeof id === 'string' && id.length > 0)) {
    return 'decorating.noticedMomentIds is not a list of names'
  }

  const settings = value.settings
  if (!isRecord(settings)) return 'settings are missing'
  if (typeof settings.soundEnabled !== 'boolean') return 'settings.soundEnabled is not a boolean'
  if (!MOTION_PREFERENCES.includes(settings.motion as MotionPreference)) return 'settings.motion is not recognised'

  if (!isIsoDate(value.createdAt)) return 'createdAt is not a date'
  if (!isIsoDate(value.updatedAt)) return 'updatedAt is not a date'
  return null
}

export type ReadSaveOptions = {
  migrations?: Readonly<Record<number, Migration>>
  currentVersion?: number
  /** Shape check for a fully migrated save; returns what's wrong, or null. */
  findProblem?: (value: RawRecord) => string | null
}

export function readSave(raw: unknown, options: ReadSaveOptions = {}): ReadResult {
  const { migrations = MIGRATIONS, currentVersion = CURRENT_SAVE_VERSION, findProblem = findSaveProblem } = options

  if (!isRecord(raw) || typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    return { ok: false, reason: 'unrecognised', version: null, detail: 'The stored data has no save version.' }
  }

  const startVersion = raw.version
  if (startVersion > currentVersion) {
    return {
      ok: false,
      reason: 'newer-version',
      version: startVersion,
      detail: `This save is version ${startVersion}; this copy of the game understands up to version ${currentVersion}.`,
    }
  }

  let working: RawRecord = raw
  for (let version = startVersion; version < currentVersion; version++) {
    const migrate = migrations[version]
    if (!migrate) {
      return {
        ok: false,
        reason: 'no-migration',
        version: startVersion,
        detail: `No way to upgrade a version ${version} save to version ${version + 1}.`,
      }
    }
    try {
      working = migrate(structuredClone(working))
    } catch (error) {
      return {
        ok: false,
        reason: 'migration-failed',
        version: startVersion,
        detail: `Upgrading from version ${version} failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  if (working.version !== currentVersion) {
    return {
      ok: false,
      reason: 'migration-failed',
      version: startVersion,
      detail: `Upgrading ended at version ${String(working.version)} instead of ${currentVersion}.`,
    }
  }

  const problem = findProblem(working)
  if (problem) {
    return { ok: false, reason: 'invalid', version: startVersion, detail: `The save looks damaged: ${problem}.` }
  }

  return {
    ok: true,
    save: working as unknown as GameSave,
    migratedFrom: startVersion === currentVersion ? null : startVersion,
  }
}

/** Human-readable, versioned JSON, used for backups and exports. */
export function serializeSave(save: unknown): string {
  return JSON.stringify(save, null, 2)
}

/** Parses exported JSON back through the same checks as stored saves. */
export function deserializeSave(json: string): ReadResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, reason: 'unrecognised', version: null, detail: 'The text is not valid JSON.' }
  }
  return readSave(parsed)
}
