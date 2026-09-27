import { useSave } from './gameContext'
import { useMediaQuery } from './useMediaQuery'

/** The player's motion setting, falling back to their device's when set to "Match my device". */
export function useReducedMotion(): boolean {
  const { motion } = useSave().settings
  const deviceReduces = useMediaQuery('(prefers-reduced-motion: reduce)')
  return motion === 'reduced' || (motion === 'system' && deviceReduces)
}
