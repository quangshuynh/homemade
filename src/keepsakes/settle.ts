import { grantEarnedDecorations } from '../decorating/rules'
import type { DecorationDefinition } from '../decorating/types'
import type { GameSave } from '../domain/types'
import { grantEarnedAchievements } from './rules'
import type { AchievementDefinition } from './types'

export type Settled = {
  save: GameSave
  /** Keepsakes that just arrived, in catalog order. */
  achievements: AchievementDefinition[]
  /** Decorations that just arrived for the cupboard, in catalog order (some come with a keepsake). */
  decor: DecorationDefinition[]
}

/**
 * The one "anything earned?" step, run after every change the player makes
 * (a bake, a scene, a decoration put out) and on every load or import.
 * Keepsakes first, then the cupboard, so a decoration that comes with a
 * keepsake arrives in the same save. Pure, deterministic and idempotent: a
 * second run finds nothing, so rewards can never be paid twice.
 */
export function settleSave(save: GameSave): Settled {
  const keepsakes = grantEarnedAchievements(save)
  const cupboard = grantEarnedDecorations(keepsakes.save)
  return { save: cupboard.save, achievements: keepsakes.earned, decor: cupboard.granted }
}
