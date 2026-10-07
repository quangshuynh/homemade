import { INGREDIENTS } from '../domain/ingredients'
import { createNewSave } from '../domain/save'
import type { GameSave } from '../domain/types'

export const FIXED_NOW = new Date('2026-03-14T09:30:00.000Z')

/** A brand-new kitchen exactly as onboarding makes it: starter pantry, tutorial still to come. */
export function makeNewKitchen(overrides: Partial<GameSave> = {}): GameSave {
  return { ...createNewSave({ playerName: 'Robin', bakeryName: 'Crumb & Co.' }, FIXED_NOW), ...overrides }
}

/**
 * An established kitchen: every ingredient on the shelf and the tutorial
 * behind it, so tests about baking aren't steered by progression.
 */
export function makeSave(overrides: Partial<GameSave> = {}): GameSave {
  return makeNewKitchen({
    pantryIngredientIds: INGREDIENTS.map((ingredient) => ingredient.id),
    tutorial: { completed: true, skipped: false },
    ...overrides,
  })
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

/** A save exactly as Interval 3/4 (save version 3) wrote it. Written out literally on purpose. */
export function makeV3Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 3,
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
      'ingredient_oats',
      'ingredient_peanut-butter',
      'ingredient_honey',
      'ingredient_coconut',
    ],
    discoveredRecipes: [
      { recipeId: 'recipe_shortbread', discoveredAt: '2026-02-10T10:00:00.000Z' },
      { recipeId: 'recipe_snickerdoodle', discoveredAt: '2026-02-11T16:30:00.000Z' },
      { recipeId: 'recipe_honey-flapjack', discoveredAt: '2026-02-12T08:15:00.000Z' },
    ],
    bakedCreations: [
      {
        id: 'creation_6c1b3a52-6f9c-4f0e-9e57-2f4f6c1f1d10',
        ingredientIds: ['ingredient_butter', 'ingredient_flour', 'ingredient_sugar'],
        recipeId: 'recipe_shortbread',
        bakedAt: '2026-02-10T10:00:00.000Z',
      },
      {
        id: 'creation_0b7d5a1e-1b8b-4bd4-8a7e-6d5f7d2e9c33',
        ingredientIds: ['ingredient_cocoa', 'ingredient_flour'],
        recipeId: null,
        bakedAt: '2026-02-12T08:00:00.000Z',
      },
    ],
    settings: { soundEnabled: false, motion: 'reduced' },
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-02-12T08:15:00.000Z',
    ...overrides,
  }
}

/** A save exactly as Intervals 5 and 6 (save version 4) wrote it. Written out literally on purpose. */
export function makeV4Save(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 4,
    profile: { id: 'player_0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Robin', bakeryName: 'Crumb & Co.' },
    pantryIngredientIds: [
      'ingredient_flour',
      'ingredient_sugar',
      'ingredient_butter',
      'ingredient_egg',
      'ingredient_vanilla',
      'ingredient_chocolate-chips',
      'ingredient_cinnamon',
      'ingredient_strawberry-jam',
      'ingredient_oats',
    ],
    discoveredRecipes: [
      { recipeId: 'recipe_shortbread', discoveredAt: '2026-08-10T10:00:00.000Z' },
      { recipeId: 'recipe_meringue-kiss', discoveredAt: '2026-08-10T10:05:00.000Z' },
      { recipeId: 'recipe_chocolate-chip', discoveredAt: '2026-08-11T16:30:00.000Z' },
      { recipeId: 'recipe_snickerdoodle', discoveredAt: '2026-08-12T08:15:00.000Z' },
      { recipeId: 'recipe_jam-thumbprint', discoveredAt: '2026-08-13T09:00:00.000Z' },
    ],
    bakedCreations: [
      {
        id: 'creation_6c1b3a52-6f9c-4f0e-9e57-2f4f6c1f1d10',
        ingredientIds: ['ingredient_butter', 'ingredient_flour', 'ingredient_sugar'],
        recipeId: 'recipe_shortbread',
        bakedAt: '2026-08-10T10:00:00.000Z',
      },
      {
        id: 'creation_0b7d5a1e-1b8b-4bd4-8a7e-6d5f7d2e9c33',
        ingredientIds: ['ingredient_egg', 'ingredient_vanilla'],
        recipeId: null,
        bakedAt: '2026-08-12T08:00:00.000Z',
      },
    ],
    progression: { crumbs: 42, xp: 215 },
    tutorial: { completed: false, skipped: true },
    settings: { soundEnabled: false, motion: 'reduced' },
    createdAt: '2026-08-10T09:55:00.000Z',
    updatedAt: '2026-08-13T09:00:00.000Z',
    ...overrides,
  }
}
