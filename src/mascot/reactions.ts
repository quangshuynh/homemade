import type { BakeOutcome } from '../domain/baking'
import { findIngredient, listIngredientNames } from '../domain/ingredients'
import type { LevelUp } from '../domain/progression'
import { familyName } from '../domain/recipeBook'
import type { IngredientId } from '../domain/ids'
import type { MascotExpression } from '../components/Mascot'

/**
 * What Marmalade says, and when. She's around for the moments that matter
 * (a first card, a new rarity, a first secret, a first finished family, a
 * new level, a new ingredient) and quiet the rest of the time: an ordinary
 * bake gets no reaction at all. Each milestone line is said once, because
 * each milestone only happens once.
 */
export type Reaction = { expression: MascotExpression; line: string }

const RARITY_LINES = {
  uncommon: 'Uncommon! Now we’re getting somewhere.',
  rare: 'A Rare card! Not many kitchens have one of those.',
  epic: 'Epic! My whiskers are actually tingling.',
  legendary: 'Legendary. Write that one down twice.',
  mythic: 'Mythic. I… need to sit down for a moment.',
} as const

/** The first Mythic is the biggest moment in the kitchen, so it gets a face all of its own. */
const FIRST_MYTHIC: Reaction = {
  expression: 'starstruck',
  line: 'A Mythic. In this kitchen. I’ve only ever heard of these. I… need to sit down for a moment.',
}

const FIRST_SECRET: Reaction = {
  expression: 'surprised',
  line: 'Now that one isn’t written in any book I know. A secret! Let’s keep it between us.',
}

/** "Baker Level 3! Oats and cocoa powder can go in the pantry now." */
export function describeLevelUp(levelUp: LevelUp): string {
  const level = `Baker Level ${levelUp.to}!`
  if (levelUp.newlyAvailable.length === 0) return level
  const names = listIngredientNames(levelUp.newlyAvailable)
  return `${level} ${names.charAt(0).toUpperCase()}${names.slice(1)} can go in the pantry now.`
}

/**
 * Her reaction to a bake, or null when she'd rather not interrupt. One line
 * at most, the biggest news first: a first Mythic, then a first secret, then
 * a first of any rarer tier, then a first finished family. A level-up has
 * its own ribbon on the card, so for that she just cheers.
 */
export function discoveryReaction(outcome: BakeOutcome, discoveredCount: number): Reaction | null {
  if (!outcome.newDiscovery || !outcome.reward) return null
  const { rarity } = outcome.reward
  if (outcome.firstOfRarity && rarity === 'mythic') return FIRST_MYTHIC
  if (outcome.firstSecret) return FIRST_SECRET
  if (outcome.firstOfRarity && rarity !== 'common') {
    const expression: MascotExpression = rarity === 'uncommon' ? 'excited' : rarity === 'rare' ? 'surprised' : 'celebrate'
    return { expression, line: RARITY_LINES[rarity] }
  }
  if (outcome.firstCompletedFamily && outcome.completedFamily) {
    return { expression: 'proud', line: `Every ${familyName(outcome.completedFamily)} card, back in the box. That’s a whole divider done.` }
  }
  if (outcome.levelUp) return { expression: 'excited', line: 'A new level! Look at you go.' }
  if (discoveredCount === 1) return { expression: 'happy', line: 'Your first card, back in the book. That’s how it starts.' }
  return null
}

/**
 * Her reaction to an ingredient joining the pantry. The very first addition
 * a kitchen ever makes gets its own line.
 */
export function unlockReaction(ingredientId: IngredientId, levelUp: LevelUp | null, firstAddition = false): Reaction {
  const name = findIngredient(ingredientId)?.name ?? 'Something new'
  const expression: MascotExpression = levelUp ? 'celebrate' : 'proud'
  if (firstAddition) return { expression, line: `${name}! Your first addition. The shelf’s starting to look like yours.` }
  return { expression, line: `${name}, on the shelf for good. I wonder what it goes with.` }
}
