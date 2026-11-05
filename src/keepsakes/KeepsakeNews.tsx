import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { decoratingOpen } from '../decorating/rules'
import { KeepsakeStamp } from './KeepsakeStamp'
import type { AchievementDefinition } from './types'
import { describeReward, listKeepsakeNames } from './words'
import './Keepsakes.css'

/**
 * A small stamped label saying a keepsake (or a few) just went into the
 * recipe box, left under whatever earned it. One label however many arrive,
 * so nothing ever stacks up, and it never takes focus: the page's status
 * line reads it out. The stamp presses down once; with reduced motion it's
 * simply there.
 */
export function KeepsakeNews({ keepsakes, className }: { keepsakes: readonly AchievementDefinition[]; className?: string }) {
  const save = useSave()
  const [first] = keepsakes
  if (!first) return null
  const open = decoratingOpen(save)
  const reward = describeReward(first, open)
  return (
    <div className={['keepsake-news', className].filter(Boolean).join(' ')}>
      <KeepsakeStamp category={first.category} earned className="keepsake-news__stamp" />
      <div className="keepsake-news__text">
        {keepsakes.length === 1 ? (
          <>
            <p>
              <span className="keepsake-news__label">A keepsake for the recipe box:</span> <strong>{first.name}</strong>
            </p>
            <p className="keepsake-news__detail">{first.description}</p>
            {reward && <p className="keepsake-news__detail">{reward}</p>}
          </>
        ) : (
          <>
            <p>
              <span className="keepsake-news__label">{keepsakes.length} keepsakes added to your recipe box:</span> {listKeepsakeNames(keepsakes)}.
            </p>
            {keepsakes.some((keepsake) => keepsake.reward) && (
              <p className="keepsake-news__detail">
                {open ? 'Something for the old cupboard came with them.' : 'Something for the old cupboard came with them, kept for when it opens.'}
              </p>
            )}
          </>
        )}
        <a href={hrefFor('keepsakes')}>See your keepsakes</a>
      </div>
    </div>
  )
}
