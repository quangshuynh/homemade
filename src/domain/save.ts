import { createId } from './ids'
import { STARTER_PANTRY } from './ingredients'
import type { GameSave, GameSettings, PlayerProfile } from './types'

/** The save schema version this build writes. */
export const CURRENT_SAVE_VERSION = 6

export const NAME_MAX_LENGTH = 32

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  motion: 'system',
}

export type NameProblem = 'empty' | 'too-long'

/** Collapses inner whitespace and trims, so "  Mo   " and "Mo" are the same name. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export function validateName(raw: string): NameProblem | null {
  const name = normalizeName(raw)
  if (name.length === 0) return 'empty'
  if (name.length > NAME_MAX_LENGTH) return 'too-long'
  return null
}

export type NewSaveInput = {
  playerName: string
  bakeryName: string
}

export function createNewSave(input: NewSaveInput, now: Date = new Date()): GameSave {
  const playerProblem = validateName(input.playerName)
  const bakeryProblem = validateName(input.bakeryName)
  if (playerProblem || bakeryProblem) {
    throw new Error(`Cannot create a save: player name ${playerProblem ?? 'ok'}, bakery name ${bakeryProblem ?? 'ok'}.`)
  }

  const timestamp = now.toISOString()
  const profile: PlayerProfile = {
    id: createId('player'),
    name: normalizeName(input.playerName),
    bakeryName: normalizeName(input.bakeryName),
  }

  return {
    version: CURRENT_SAVE_VERSION,
    profile,
    pantryIngredientIds: [...STARTER_PANTRY],
    discoveredRecipes: [],
    bakedCreations: [],
    progression: { crumbs: 0, xp: 0 },
    // A brand-new kitchen gets the tutorial; the player can skip it.
    tutorial: { completed: false, skipped: false },
    // The first chapter waits for the tutorial to be behind them.
    story: { seenSceneIds: [] },
    // The cupboard stays locked until the story reaches it.
    decorating: { ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] },
    settings: { ...DEFAULT_SETTINGS },
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

/**
 * Applies a pure change to a save and stamps `updatedAt`. Every mutation of
 * game state should go through here so timestamps stay honest.
 */
export function touchSave(save: GameSave, change: (save: GameSave) => GameSave, now: Date = new Date()): GameSave {
  return { ...change(save), updatedAt: now.toISOString() }
}

export function updateSettings(save: GameSave, patch: Partial<GameSettings>): GameSave {
  return { ...save, settings: { ...save.settings, ...patch } }
}

/** True while the first-time tutorial should still open by itself. */
export function tutorialPending(save: GameSave): boolean {
  return !save.tutorial.completed && !save.tutorial.skipped
}

/**
 * Records how a tutorial run ended. Finishing marks it completed; skipping a
 * first run marks it skipped. A replay never un-completes anything, and the
 * tutorial itself never pays a reward, so replaying it can't earn anything.
 */
export function endTutorial(save: GameSave, how: 'finished' | 'skipped'): GameSave {
  const tutorial = how === 'finished' ? { ...save.tutorial, completed: true } : { ...save.tutorial, skipped: true }
  if (tutorial.completed === save.tutorial.completed && tutorial.skipped === save.tutorial.skipped) return save
  return { ...save, tutorial }
}

export type NameChange = { playerName?: string; bakeryName?: string }

export type RenameResult =
  | { ok: true; save: GameSave; changed: boolean }
  | { ok: false; problems: { playerName?: NameProblem; bakeryName?: NameProblem } }

/**
 * Renames the player and/or the kitchen, with the same tidying and rules as
 * onboarding. Only the names change: the player id and everything else in
 * the save stay exactly as they were.
 */
export function renameProfile(save: GameSave, change: NameChange): RenameResult {
  const problems: { playerName?: NameProblem; bakeryName?: NameProblem } = {}
  for (const field of ['playerName', 'bakeryName'] as const) {
    const value = change[field]
    const problem = value === undefined ? null : validateName(value)
    if (problem) problems[field] = problem
  }
  if (problems.playerName || problems.bakeryName) return { ok: false, problems }

  const name = change.playerName === undefined ? save.profile.name : normalizeName(change.playerName)
  const bakeryName = change.bakeryName === undefined ? save.profile.bakeryName : normalizeName(change.bakeryName)
  const changed = name !== save.profile.name || bakeryName !== save.profile.bakeryName
  return { ok: true, changed, save: changed ? { ...save, profile: { ...save.profile, name, bakeryName } } : save }
}
