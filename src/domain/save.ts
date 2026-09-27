import { createId } from './ids'
import { STARTER_PANTRY } from './ingredients'
import type { GameSave, GameSettings, PlayerProfile } from './types'

/** The save schema version this build writes. */
export const CURRENT_SAVE_VERSION = 2

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
