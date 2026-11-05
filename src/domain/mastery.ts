import type { RecipeId } from './ids'
import type { GameSave } from './types'

/**
 * Recipe mastery (Interval 9): how well this kitchen knows a recipe, from
 * how many times it has been baked. Small on purpose: the last stage is ten
 * bakes, and there is nothing past it. Every stage is cosmetic (a word, a
 * stamp, a flourish on the card); none pays Crumbs or XP, and none changes
 * what a bake makes.
 *
 * What counts: baking the recipe (a first bake or any rebake). What doesn't:
 * Kitchen Experiments, opening a card, or laying a bowl out with Bake again
 * without baking it.
 */

export type MasteryStage = 'discovered' | 'familiar' | 'well-loved' | 'house-favourite'

export type MasteryStageInfo = {
  id: MasteryStage
  /** "Well-Loved". Always shown in words, never as a colour alone. */
  label: string
  /** Bakes needed to reach it. */
  bakes: number
}

/** In order. Never more than ten bakes in all. */
export const MASTERY_STAGES: readonly MasteryStageInfo[] = [
  { id: 'discovered', label: 'Discovered', bakes: 1 },
  { id: 'familiar', label: 'Familiar', bakes: 3 },
  { id: 'well-loved', label: 'Well-Loved', bakes: 5 },
  { id: 'house-favourite', label: 'House Favourite', bakes: 10 },
]

export const TOP_MASTERY_BAKES = MASTERY_STAGES.at(-1)!.bakes

export function stageInfo(stage: MasteryStage): MasteryStageInfo {
  return MASTERY_STAGES.find((info) => info.id === stage)!
}

/** How many times this kitchen has baked a recipe, for good (0 if never). */
export function bakeCount(save: GameSave, recipeId: RecipeId): number {
  return save.recipeBakeCounts[recipeId] ?? 0
}

/** The stage a number of bakes reaches, or null for none at all. */
export function stageForCount(count: number): MasteryStage | null {
  let reached: MasteryStage | null = null
  for (const info of MASTERY_STAGES) if (count >= info.bakes) reached = info.id
  return reached
}

export function masteryStage(save: GameSave, recipeId: RecipeId): MasteryStage | null {
  return stageForCount(bakeCount(save, recipeId))
}

/** Whether `stage` is at least `atLeast`. */
export function stageAtLeast(stage: MasteryStage | null, atLeast: MasteryStage): boolean {
  if (stage === null) return false
  const order = MASTERY_STAGES.map((info) => info.id)
  return order.indexOf(stage) >= order.indexOf(atLeast)
}

/** The next stage and how many more bakes it takes, or null once a recipe is a House Favourite. */
export function nextStage(count: number): { stage: MasteryStageInfo; more: number } | null {
  const next = MASTERY_STAGES.find((info) => info.bakes > count)
  return next ? { stage: next, more: next.bakes - count } : null
}

/**
 * The named stage a bake crossed into, if it crossed one. "Discovered" is
 * the first bake, which the discovery reveal already celebrates, so it never
 * counts as a mastery step here.
 */
export function crossedStage(before: number, after: number): MasteryStage | null {
  const from = stageForCount(before)
  const to = stageForCount(after)
  if (to === null || to === from || to === 'discovered') return null
  return to
}

/** Recipes at or past a stage, most-baked first (ties in the order they were discovered). */
export function recipesAtStage(save: GameSave, atLeast: MasteryStage): RecipeId[] {
  const discovered = save.discoveredRecipes.map((entry) => entry.recipeId)
  return discovered
    .filter((id) => stageAtLeast(masteryStage(save, id), atLeast))
    .sort((a, b) => bakeCount(save, b) - bakeCount(save, a) || discovered.indexOf(a) - discovered.indexOf(b))
}
