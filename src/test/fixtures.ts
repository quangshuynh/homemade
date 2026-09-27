import { createNewSave } from '../domain/save'
import type { GameSave } from '../domain/types'

export const FIXED_NOW = new Date('2026-03-14T09:30:00.000Z')

export function makeSave(overrides: Partial<GameSave> = {}): GameSave {
  return { ...createNewSave({ playerName: 'Robin', bakeryName: 'Crumb & Co.' }, FIXED_NOW), ...overrides }
}

/** A save exactly as Interval 1 (save version 1) wrote it. Written out literally on purpose. */
export function makeV1Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    profile: { id: 'player_0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Robin', bakeryName: 'Crumb & Co.' },
    discoveredRecipeIds: [],
    settings: { soundEnabled: false, motion: 'reduced' },
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-02-03T09:00:00.000Z',
    ...overrides,
  }
}

/** A save exactly as Interval 2 (save version 2) wrote it. Written out literally on purpose. */
export function makeV2Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2,
    profile: { id: 'player_0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Robin', bakeryName: 'Crumb & Co.' },
    pantryIngredientIds: [
      'ingredient_flour',
      'ingredient_sugar',
      'ingredient_butter',
      'ingredient_egg',
      'ingredient_chocolate-chips',
      'ingredient_vanilla',
      'ingredient_cocoa',
      'ingredient_cinnamon',
    ],
    discoveredRecipes: [
      { recipeId: 'recipe_shortbread', discoveredAt: '2026-02-10T10:00:00.000Z' },
      { recipeId: 'recipe_snickerdoodle', discoveredAt: '2026-02-11T16:30:00.000Z' },
    ],
    settings: { soundEnabled: false, motion: 'reduced' },
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-02-11T16:30:00.000Z',
    ...overrides,
  }
}
