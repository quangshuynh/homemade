import type { BakeOutcome } from '../domain/baking'
import { findIngredient, listIngredientNames } from '../domain/ingredients'
import type { LevelUp } from '../domain/progression'
import type { IngredientId } from '../domain/ids'
import type { MascotExpression } from '../components/Mascot'

/**
 * What Marmalade says, and when. She's around for the moments that matter
 * (a first card, a new rarity, a new level, a new ingredient) and quiet the
 * rest of the time: an ordinary bake gets no reaction at all.
 */
export type Reaction = { expression: MascotExpression; line: string }

const RARITY_LINES = {
  uncommon: 'Uncommon! Now we’re getting somewhere.',
  rare: 'A Rare card! Not many kitchens have one of those.',
  epic: 'Epic! My whiskers are actually tingling.',
  legendary: 'Legendary. Write that one down twice.',
  mythic: 'Mythic. I… need to sit down for a moment.',
} as const

/** "Baker Level 3! Oats and cocoa powder can go in the pantry now." */
export function describeLevelUp(levelUp: LevelUp): string {
  const level = `Baker Level ${levelUp.to}!`
  if (levelUp.newlyAvailable.length === 0) return level
  const names = listIngredientNames(levelUp.newlyAvailable)
  return `${level} ${names.charAt(0).toUpperCase()}${names.slice(1)} can go in the pantry now.`
}

/**
 * Her reaction to a bake, or null when she'd rather not interrupt. One line
 * at most: a level-up has its own ribbon on the card, so she just cheers.
 */
export function discoveryReaction(outcome: BakeOutcome, discoveredCount: number): Reaction | null {
  if (!outcome.newDiscovery || !outcome.reward) return null
  const { rarity } = outcome.reward
  if (outcome.firstOfRarity && rarity !== 'common') {
    const expression: MascotExpression = rarity === 'uncommon' ? 'excited' : rarity === 'rare' ? 'surprised' : 'celebrate'
    return { expression, line: RARITY_LINES[rarity] }
  }
  if (outcome.levelUp) return { expression: 'excited', line: 'A new level! Look at you go.' }
  if (discoveredCount === 1) return { expression: 'happy', line: 'Your first card, back in the book. That’s how it starts.' }
  return null
}

export function unlockReaction(ingredientId: IngredientId, levelUp: LevelUp | null): Reaction {
  const name = findIngredient(ingredientId)?.name ?? 'Something new'
  return { expression: levelUp ? 'celebrate' : 'proud', line: `${name}, on the shelf for good. I wonder what it goes with.` }
}
