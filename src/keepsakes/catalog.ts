import { defineId, type AchievementId } from '../domain/ids'
import type { AchievementCategory, AchievementDefinition } from './types'

/**
 * The keepsake catalog. Sixteen in all, on purpose: each one marks
 * something worth remembering, and none asks for a grind. The biggest
 * mastery ask is one recipe baked ten times.
 *
 * Rewards are cosmetic: seven of them come with a decoration for the old
 * cupboard; the rest are the stamped card itself. None pays Crumbs or XP.
 *
 * Three are hidden until earned (a first secret, a first Mythic and the end
 * of the second story arc), so their names can't give anything away.
 *
 * Never reuse or rename an id once shipped; saves record keepsakes by id.
 */

export const CATEGORY_NAMES: Record<AchievementCategory, string> = {
  baking: 'Baking',
  discovery: 'Discovery',
  'recipe-book': 'Recipe Book',
  story: 'Story',
  decorating: 'Decorating',
  mastery: 'Mastery',
}

/** The order categories are shown in. */
export const CATEGORY_ORDER: readonly AchievementCategory[] = ['baking', 'discovery', 'recipe-book', 'mastery', 'decorating', 'story']

const decor = (slug: string) => ({ type: 'decoration', decorationId: defineId('decoration', slug) }) as const

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  // ---- Baking
  {
    id: defineId('achievement', 'happy-accident'),
    name: 'Happy Accident',
    description: 'Bake a Kitchen Experiment: something no recipe card has.',
    category: 'baking',
    requirement: { type: 'experiment-baked' },
    hidden: false,
  },

  // ---- Discovery
  {
    id: defineId('achievement', 'recipe-keeper'),
    name: 'Recipe Keeper',
    description: 'Bring ten recipe cards back into the box.',
    category: 'discovery',
    requirement: { type: 'recipes-discovered', count: 10 },
    hidden: false,
    reward: decor('cookie-tin'),
  },
  {
    id: defineId('achievement', 'half-full'),
    name: 'Recipe Box Half Full',
    description: 'Find half of the recipes in the box.',
    category: 'discovery',
    requirement: { type: 'visible-share', share: 0.5 },
    hidden: false,
    reward: decor('embroidered-mitt'),
  },
  {
    id: defineId('achievement', 'every-card'),
    name: 'Every Card Home',
    description: 'Find every recipe in the box.',
    category: 'discovery',
    requirement: { type: 'visible-share', share: 1 },
    hidden: false,
  },
  {
    id: defineId('achievement', 'something-special'),
    name: 'Something Special',
    description: 'Find your first Legendary recipe.',
    category: 'discovery',
    requirement: { type: 'first-rarity', rarity: 'legendary' },
    hidden: false,
  },
  {
    id: defineId('achievement', 'secret-ingredient'),
    name: 'Secret Ingredient',
    description: 'Found a recipe nobody wrote down.',
    category: 'discovery',
    requirement: { type: 'first-secret' },
    hidden: true,
  },
  {
    id: defineId('achievement', 'written-in-gold'),
    name: 'Written in Gold',
    description: 'Found a Mythic recipe.',
    category: 'discovery',
    requirement: { type: 'first-rarity', rarity: 'mythic' },
    hidden: true,
  },

  // ---- Recipe Book
  {
    id: defineId('achievement', 'family-recipe'),
    name: 'Family Recipe',
    description: 'Find every card behind one divider.',
    category: 'recipe-book',
    requirement: { type: 'families-complete', count: 1 },
    hidden: false,
  },
  {
    id: defineId('achievement', 'full-shelf'),
    name: 'Full Shelf',
    description: 'Find every card behind four dividers.',
    category: 'recipe-book',
    requirement: { type: 'families-complete', count: 4 },
    hidden: false,
    reward: decor('ribboned-bundle'),
  },

  // ---- Mastery
  {
    id: defineId('achievement', 'getting-familiar'),
    name: 'Getting Familiar',
    description: 'Bake one recipe three times, until it’s Familiar.',
    category: 'mastery',
    requirement: { type: 'mastery', stage: 'familiar', recipes: 1, families: 1 },
    hidden: false,
    reward: decor('cookie-plate'),
  },
  {
    id: defineId('achievement', 'something-for-everyone'),
    name: 'Something for Everyone',
    description: 'Get Familiar with recipes from three different families.',
    category: 'mastery',
    requirement: { type: 'mastery', stage: 'familiar', recipes: 3, families: 3 },
    hidden: false,
  },
  {
    id: defineId('achievement', 'house-speciality'),
    name: 'House Speciality',
    description: 'Bake one recipe ten times, until it’s a House Favourite.',
    category: 'mastery',
    requirement: { type: 'mastery', stage: 'house-favourite', recipes: 1, families: 1 },
    hidden: false,
    reward: decor('trophy-spoon'),
  },

  // ---- Decorating
  {
    id: defineId('achievement', 'make-it-yours'),
    name: 'Make It Yours',
    description: 'Put something of your own out in the kitchen.',
    category: 'decorating',
    requirement: { type: 'decor-out', every: false },
    hidden: false,
  },
  {
    id: defineId('achievement', 'lived-in'),
    name: 'Lived In',
    description: 'Have something out in every spot in the kitchen.',
    category: 'decorating',
    requirement: { type: 'decor-out', every: true },
    hidden: false,
    reward: decor('marmalade-figurine'),
  },

  // ---- Story
  {
    id: defineId('achievement', 'last-page'),
    name: 'The Last Page',
    // The first arc, as it was when this keepsake was made: a second arc doesn't take it back or move it on.
    description: 'Read the recipe box’s first story, all the way to the old cupboard.',
    category: 'story',
    requirement: { type: 'chapter-complete', chapterId: defineId('chapter', 'old-cupboard') },
    hidden: false,
  },
  // Interval 10. Hidden until earned: its name and its frame would give the second arc away.
  {
    id: defineId('achievement', 'kept-in-the-tin'),
    name: 'Kept in the Tin',
    description: 'Read everything in the tin behind the old cupboard.',
    category: 'story',
    requirement: { type: 'chapter-complete', chapterId: defineId('chapter', 'for-m') },
    hidden: true,
    reward: decor('fair-day-photograph'),
  },
]

const byId = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]))

/** Undefined for an id the catalog doesn't have: it stays in the save and simply isn't shown. */
export function findAchievement(id: AchievementId): AchievementDefinition | undefined {
  return byId.get(id)
}

/** The keepsake that comes with a decoration, if one does. */
export function achievementForDecoration(decorationId: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.reward?.decorationId === decorationId)
}
