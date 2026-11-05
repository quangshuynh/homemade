import type { AchievementId, DecorationId, StoryChapterId } from '../domain/ids'
import type { CookieRarity } from '../domain/types'
import type { MasteryStage } from '../domain/mastery'

/**
 * Kitchen Keepsakes (Interval 9): a short, curated list of milestones worth
 * remembering. Each is earned once, for good, by something the kitchen has
 * actually done. They are tucked into the recipe box as little stamped
 * cards, never shown as trophies, and never needed for anything.
 */

export type AchievementCategory = 'baking' | 'discovery' | 'recipe-book' | 'story' | 'decorating' | 'mastery'

/**
 * What earns a keepsake. Always a fact about the save as it is now, so the
 * same save always earns the same keepsakes (an older kitchen that already
 * did the thing gets the keepsake on load) and evaluating twice changes
 * nothing. Never a count of clicks, a time, a streak or chance.
 */
export type AchievementRequirement =
  /** A Kitchen Experiment is among the remembered bakes. */
  | { type: 'experiment-baked' }
  /** At least this many recipes in the book, secrets included. */
  | { type: 'recipes-discovered'; count: number }
  /** At least this fraction of the recipes the book admits to (never secrets). */
  | { type: 'visible-share'; share: number }
  | { type: 'first-rarity'; rarity: CookieRarity }
  | { type: 'first-secret' }
  /** At least this many families with every non-secret card found. */
  | { type: 'families-complete'; count: number }
  /**
   * Every scene of one chapter seen (Interval 10; until then, "every scene of
   * the story"). Each arc's keepsake names its own last chapter, so a new arc
   * never moves a keepsake an older kitchen already has.
   */
  | { type: 'chapter-complete'; chapterId: StoryChapterId }
  /** Something out in at least this many spots (all of them when `every` is set). */
  | { type: 'decor-out'; every: boolean }
  /** At least `recipes` different recipes at this mastery stage or past it, from at least `families` families. */
  | { type: 'mastery'; stage: MasteryStage; recipes: number; families: number }

/** Cosmetic only. A keepsake never pays Crumbs or XP, and never opens an ingredient. */
export type AchievementReward = { type: 'decoration'; decorationId: DecorationId }

/**
 * Hand-authored, static catalog data. Saves store only the id, so the
 * wording can change here without touching anyone's save.
 */
export type AchievementDefinition = {
  id: AchievementId
  name: string
  /** What it's for, said plainly. Shown before it's earned for a visible keepsake. */
  description: string
  category: AchievementCategory
  requirement: AchievementRequirement
  /**
   * Hidden until earned: no card, no name, no count. For keepsakes whose
   * name alone would give away a secret, the story or a Mythic.
   */
  hidden: boolean
  reward?: AchievementReward
}
