import { createNewSave } from '../domain/save'
import type { GameSave } from '../domain/types'

export const FIXED_NOW = new Date('2026-03-14T09:30:00.000Z')

export function makeSave(overrides: Partial<GameSave> = {}): GameSave {
  return { ...createNewSave({ playerName: 'Robin', bakeryName: 'Crumb & Co.' }, FIXED_NOW), ...overrides }
}
