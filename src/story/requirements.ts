import { isDiscovered } from '../domain/baking'
import { STARTER_PANTRY } from '../domain/ingredients'
import { currentLevel } from '../domain/progression'
import { findRecipeById } from '../domain/recipes'
import { tutorialPending } from '../domain/save'
import type { GameSave } from '../domain/types'
import type { StoryRequirement } from './types'

/** Ingredients on the shelf that a new kitchen doesn't start with. */
export function ingredientsAdded(save: GameSave): number {
  return save.pantryIngredientIds.filter((id) => !STARTER_PANTRY.includes(id)).length
}

/** Whether a kitchen has done what a requirement asks. Pure and deterministic: the save is all it reads. */
export function meetsRequirement(save: GameSave, requirement: StoryRequirement): boolean {
  switch (requirement.type) {
    case 'tutorial-complete':
      return !tutorialPending(save)
    case 'recipes-discovered':
      return save.discoveredRecipes.length >= requirement.count
    case 'family-discovered':
      return save.discoveredRecipes.filter((entry) => findRecipeById(entry.recipeId)?.family === requirement.familyId).length >= requirement.count
    case 'secret-recipes-discovered':
      return save.discoveredRecipes.filter((entry) => findRecipeById(entry.recipeId)?.isSecret).length >= requirement.count
    case 'level':
      return currentLevel(save) >= requirement.level
    case 'ingredient-unlocks':
      return ingredientsAdded(save) >= requirement.count
    case 'recipe-discovered':
      return isDiscovered(save, requirement.recipeId)
    case 'any':
      return requirement.of.some((inner) => meetsRequirement(save, inner))
  }
}
