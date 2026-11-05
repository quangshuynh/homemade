import { equippedIn } from '../decorating/rules'
import { DECORATION_SLOTS } from '../decorating/slots'
import type { AchievementId, RecipeId } from '../domain/ids'
import { bakeCount, nextStage, recipesAtStage } from '../domain/mastery'
import { bookCounts, bookSections, completedFamilies, familyName } from '../domain/recipeBook'
import { findRecipeById } from '../domain/recipes'
import type { GameSave, Recipe } from '../domain/types'
import { STORY_SCENES } from '../story/chapters'
import { ACHIEVEMENTS, CATEGORY_NAMES, CATEGORY_ORDER, findAchievement } from './catalog'
import type { AchievementCategory, AchievementDefinition, AchievementRequirement } from './types'

/**
 * Keepsake, mastery-goal and favourite rules. Pure functions over the save
 * and the static catalogs; the UI asks these and never decides anything.
 *
 * The rules this file keeps:
 * - A keepsake is earned once, for good, the first time it's looked for
 *   after its milestone: after a bake, a scene, a decoration put out, and on
 *   loading or importing a save (so an older kitchen gets what it already
 *   earned without repeating anything). Looking again changes nothing.
 * - Several earned at once arrive in catalog order, which is the same for
 *   everyone.
 * - Nothing earned is ever taken away, even if what earned it no longer
 *   holds (a decoration put back, say).
 * - A hidden keepsake doesn't exist, as far as the player can tell, until
 *   it's earned: no card, no name, no count.
 * - Favourites are organisational. Nothing in baking, rewards, mastery or
 *   keepsakes reads them.
 */

// ---------------------------------------------------------------- earning

function meetsRequirement(save: GameSave, requirement: AchievementRequirement): boolean {
  const found = save.discoveredRecipes.map((entry) => findRecipeById(entry.recipeId)).filter((recipe): recipe is Recipe => recipe !== undefined)
  switch (requirement.type) {
    case 'experiment-baked':
      return save.bakedCreations.some((creation) => creation.recipeId === null)
    case 'recipes-discovered':
      return found.length >= requirement.count
    case 'visible-share': {
      const { found: visibleFound, total } = bookCounts(save)
      return total > 0 && visibleFound >= Math.ceil(total * requirement.share)
    }
    case 'first-rarity':
      return found.some((recipe) => recipe.rarity === requirement.rarity)
    case 'first-secret':
      return found.some((recipe) => recipe.isSecret)
    case 'families-complete':
      return completedFamilies(save).length >= requirement.count
    case 'story-complete':
      return STORY_SCENES.length > 0 && STORY_SCENES.every((placed) => save.story.seenSceneIds.includes(placed.scene.id))
    case 'decor-out': {
      const out = DECORATION_SLOTS.filter((slot) => equippedIn(save, slot) !== null)
      return requirement.every ? out.length === DECORATION_SLOTS.length : out.length > 0
    }
    case 'mastery': {
      const recipes = recipesAtStage(save, requirement.stage)
        .map(findRecipeById)
        .filter((recipe): recipe is Recipe => recipe !== undefined)
      return recipes.length >= requirement.recipes && new Set(recipes.map((recipe) => recipe.family)).size >= requirement.families
    }
  }
}

export function hasAchievement(save: GameSave, id: AchievementId): boolean {
  return save.achievementIds.includes(id)
}

/** Whether the kitchen has done what a keepsake asks, earned yet or not. */
export function qualifiesFor(save: GameSave, achievement: AchievementDefinition): boolean {
  return meetsRequirement(save, achievement.requirement)
}

export type AchievementGrant = {
  save: GameSave
  /** What just arrived, in catalog order. Empty (and the same save back) when nothing did. */
  earned: AchievementDefinition[]
}

/**
 * Hands over every keepsake the kitchen qualifies for and doesn't have yet.
 * Deterministic and idempotent: call it as often as you like. Retroactive by
 * nature, since it only ever reads the save as it is.
 */
export function grantEarnedAchievements(save: GameSave): AchievementGrant {
  const earned = ACHIEVEMENTS.filter((achievement) => !hasAchievement(save, achievement.id) && qualifiesFor(save, achievement))
  if (earned.length === 0) return { save, earned }
  return { save: { ...save, achievementIds: [...save.achievementIds, ...earned.map((achievement) => achievement.id)] }, earned }
}

/**
 * What a change earned: the keepsakes in `after` that weren't in `before`,
 * in the order they were added. For telling the player, never for deciding.
 */
export function evaluateAchievements(before: GameSave, after: GameSave): AchievementDefinition[] {
  return after.achievementIds
    .filter((id) => !before.achievementIds.includes(id))
    .map(findAchievement)
    .filter((found): found is AchievementDefinition => found !== undefined)
}

// ---------------------------------------------------------------- the keepsake box

export type KeepsakeEntry =
  | { kind: 'earned'; achievement: AchievementDefinition }
  /** Visible but not yet earned. Hidden ones are never in the list until earned. */
  | { kind: 'not-yet'; achievement: AchievementDefinition }

export type KeepsakeGroup = { category: AchievementCategory; name: string; entries: KeepsakeEntry[] }

/**
 * The keepsakes the player is allowed to see, by category, in catalog order.
 * A hidden keepsake appears only once earned; a category with nothing to
 * show has no group.
 */
export function keepsakeGroups(save: GameSave): KeepsakeGroup[] {
  return CATEGORY_ORDER.map((category): KeepsakeGroup => {
    const entries: KeepsakeEntry[] = []
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.category !== category) continue
      if (hasAchievement(save, achievement.id)) entries.push({ kind: 'earned', achievement })
      else if (!achievement.hidden) entries.push({ kind: 'not-yet', achievement })
    }
    return { category, name: CATEGORY_NAMES[category], entries }
  }).filter((group) => group.entries.length > 0)
}

/** "6 of 13": earned (that the catalog knows) of what the player can see. Hidden ones count only once earned. */
export function keepsakeCounts(save: GameSave): { earned: number; total: number } {
  const entries = keepsakeGroups(save).flatMap((group) => group.entries)
  return { earned: entries.filter((entry) => entry.kind === 'earned').length, total: entries.length }
}

// ---------------------------------------------------------------- favourites

export function isFavourite(save: GameSave, recipeId: RecipeId): boolean {
  return save.favoriteRecipeIds.includes(recipeId)
}

/**
 * Marks or unmarks a discovered recipe as a favourite. The same save back
 * for a recipe that isn't in the book, so an undiscovered one can't be
 * marked (or given away). Touches nothing but the favourites list.
 */
export function setFavourite(save: GameSave, recipeId: RecipeId, favourite: boolean): GameSave {
  if (!save.discoveredRecipes.some((entry) => entry.recipeId === recipeId)) return save
  if (isFavourite(save, recipeId) === favourite) return save
  const favoriteRecipeIds = favourite ? [...save.favoriteRecipeIds, recipeId] : save.favoriteRecipeIds.filter((id) => id !== recipeId)
  return { ...save, favoriteRecipeIds }
}

/** Favourite recipes the catalog knows and the book has, in the order marked. */
export function favouriteRecipes(save: GameSave): Recipe[] {
  return save.favoriteRecipeIds
    .filter((id) => save.discoveredRecipes.some((entry) => entry.recipeId === id))
    .map(findRecipeById)
    .filter((recipe): recipe is Recipe => recipe !== undefined)
}

// ---------------------------------------------------------------- something to try

export type KitchenGoal = { line: string; recipeId?: RecipeId }

/**
 * One gentle suggestion for what to try next. Never timed, never reset,
 * never required: it's worked out from the save each time it's shown, so it
 * simply moves on once it's done. In order: a favourite closest to its next
 * mastery stage, the family nearest to finished, any card still blank, and
 * finally just baking something you love.
 */
export function kitchenGoal(save: GameSave): KitchenGoal {
  const favourite = favouriteRecipes(save)
    .map((recipe) => ({ recipe, next: nextStage(bakeCount(save, recipe.id)) }))
    .filter((entry) => entry.next !== null)
    .sort((a, b) => a.next!.more - b.next!.more)[0]
  if (favourite) {
    const { recipe, next } = favourite
    return { line: `Bake ${recipe.name} again. It’s ${next!.more === 1 ? 'one bake' : `${next!.more} bakes`} from ${next!.stage.label}.`, recipeId: recipe.id }
  }
  const nearest = bookSections(save)
    .filter((section) => section.found > 0 && section.found < section.total)
    .sort((a, b) => a.total - a.found - (b.total - b.found))[0]
  if (nearest) return { line: `Find another ${familyName(nearest.family.id)} recipe.` }
  const { found, total } = bookCounts(save)
  if (found < total) return { line: 'Try a mix you haven’t baked before.' }
  return { line: 'Bake one of your favourites, just because.' }
}
