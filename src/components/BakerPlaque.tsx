import { levelProgress, MAX_LEVEL } from '../domain/progression'
import type { Progression } from '../domain/types'
import './BakerPlaque.css'

/**
 * The player's Baker Level, XP and Crumbs, as a small stitched badge on a
 * kraft label rather than a dashboard. The words carry everything; the
 * ribbon underneath is decoration.
 */
export function BakerPlaque({ progression, className }: { progression: Progression; className?: string }) {
  const { level, xp, nextLevelXp, fraction } = levelProgress(progression.xp)
  const atTop = nextLevelXp === null
  return (
    <div className={['plaque', className].filter(Boolean).join(' ')} role="group" aria-label="Your baking progress">
      <p className="plaque__level">Baker Level {level}</p>
      <div className="plaque__ribbon" aria-hidden="true">
        <span className="plaque__ribbon-fill" style={{ inlineSize: `${Math.round(fraction * 100)}%` }} />
      </div>
      <p className="plaque__xp">
        {atTop ? (
          <>
            {xp} XP <span className="plaque__aside">· top level for now (of {MAX_LEVEL})</span>
          </>
        ) : (
          <>
            {xp} / {nextLevelXp} XP <span className="visually-hidden">towards Baker Level {level + 1}</span>
          </>
        )}
      </p>
      <p className="plaque__crumbs">
        <CrumbsMark className="plaque__crumbs-mark" />
        {progression.crumbs} {progression.crumbs === 1 ? 'Crumb' : 'Crumbs'}
      </p>
    </div>
  )
}

/** Three little cookie crumbs: the mark for Crumbs wherever they appear. */
export function CrumbsMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 20" aria-hidden="true" focusable="false">
      <path d="M3 13 Q4 8 9 9 Q12 11 10 15 Q6 18 3 13 Z" fill="var(--crumb)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M12 6 Q14 2 18 4 Q20 7 17 9 Q13 10 12 6 Z" fill="var(--crumb)" stroke="var(--ink)" strokeWidth="1.5" />
      <path d="M15 14 Q17 12 20 13.5 Q21 16.5 18 17 Q15 17 15 14 Z" fill="var(--crumb)" stroke="var(--ink)" strokeWidth="1.5" />
    </svg>
  )
}
