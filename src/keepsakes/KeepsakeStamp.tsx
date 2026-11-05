import type { AchievementCategory } from './types'

const INK = 'var(--ink)'

/** A little motif per category, drawn inside the stamp. */
const MOTIFS: Record<AchievementCategory, string> = {
  // a whisk
  baking: 'M20 30 V22 M20 22 C13 17 14 9 20 9 C26 9 27 17 20 22 M20 22 C17 16 18 11 20 9 C22 11 23 16 20 22',
  // a four-point star
  discovery: 'M20 8 L22.4 17.6 L32 20 L22.4 22.4 L20 32 L17.6 22.4 L8 20 L17.6 17.6 Z',
  // an index card on a divider
  'recipe-book': 'M10 14 H30 V28 H10 Z M10 14 L13 10 H20 L22 14 M14 19 H26 M14 23 H22',
  // a heart
  mastery: 'M20 30 C10 23 9 16 13 13 C16 11 19 12 20 15 C21 12 24 11 27 13 C31 16 30 23 20 30 Z',
  // a little house
  decorating: 'M10 20 L20 11 L30 20 M13 18 V30 H27 V18 M18 30 V24 H22 V30',
  // an open book
  story: 'M20 13 C16 11 12 11 9 12 V28 C12 27 16 27 20 29 C24 27 28 27 31 28 V12 C28 11 24 11 20 13 Z M20 13 V29',
}

/**
 * A rubber-stamped keepsake mark: a scalloped ring with a small motif.
 * Decorative only; the keepsake's name and status are always written beside it.
 * A keepsake not earned yet is drawn as a faint pencil outline.
 */
export function KeepsakeStamp({ category, earned, className }: { category: AchievementCategory; earned: boolean; className?: string }) {
  const scallops = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2
    return [20 + Math.cos(angle) * 17, 20 + Math.sin(angle) * 17] as const
  })
  return (
    <svg
      className={['keepsake-stamp', earned ? 'keepsake-stamp--earned' : 'keepsake-stamp--not-yet', className].filter(Boolean).join(' ')}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      {scallops.map(([x, y]) => (
        <circle key={`${x.toFixed(2)}-${y.toFixed(2)}`} cx={x} cy={y} r="3.2" className="keepsake-stamp__edge" />
      ))}
      <circle cx="20" cy="20" r="16" className="keepsake-stamp__face" />
      <circle cx="20" cy="20" r="13" fill="none" stroke={earned ? 'var(--paper)' : 'var(--pencil)'} strokeWidth="1" strokeDasharray="2 1.6" />
      <path d={MOTIFS[category]} fill="none" stroke={earned ? 'var(--paper)' : 'var(--pencil)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {!earned && <circle cx="20" cy="20" r="16" fill="none" stroke={INK} strokeWidth="0.6" opacity="0.4" />}
    </svg>
  )
}
