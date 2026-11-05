import { findDecoration } from '../decorating/catalog'
import type { AchievementDefinition } from './types'

/**
 * How keepsakes and mastery are put into words, shared by every screen
 * that mentions them, so the status line and the page always agree.
 */

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/** "Baked once", "Baked twice", "Baked 4 times". */
export function bakedTimes(count: number): string {
  return `Baked ${count === 1 ? 'once' : count === 2 ? 'twice' : `${count} times`}`
}

/** "Recipe Keeper", "Recipe Keeper and Family Recipe", "A, B and C". */
export function listKeepsakeNames(keepsakes: readonly AchievementDefinition[]): string {
  const names = keepsakes.map((keepsake) => keepsake.name)
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/**
 * What a keepsake's reward is, in words: "Comes with the cookie tin." before
 * it's earned, and where it went once it is (in the old cupboard, or kept
 * until the cupboard opens). Null for a keepsake that is its own reward.
 */
export function describeReward(keepsake: AchievementDefinition, cupboardOpen: boolean, earned = true): string | null {
  if (!keepsake.reward) return null
  const piece = findDecoration(keepsake.reward.decorationId)
  if (!piece) return null
  const name = lowerFirst(piece.name)
  if (!earned) return `Comes with the ${name}.`
  return cupboardOpen ? `Came with the ${name}, now in the old cupboard.` : `Came with the ${name}, kept for when the old cupboard opens.`
}

/** The status-line sentence for keepsakes, read out after everything else. Empty when none arrived. */
export function describeKeepsakes(keepsakes: readonly AchievementDefinition[]): string {
  if (keepsakes.length === 0) return ''
  if (keepsakes.length === 1) return `A keepsake for the recipe box: ${keepsakes[0]!.name}.`
  return `${keepsakes.length} keepsakes added to your recipe box: ${listKeepsakeNames(keepsakes)}.`
}
