import { hrefFor } from '../app/routes'
import type { StoryNews } from './progress'
import './Story.css'

/**
 * A quiet "something's in the recipe box" slip, left where the player
 * already is. Never opens anything by itself: the story can wait.
 */
export function StoryNudge({ news, className }: { news: StoryNews; className?: string }) {
  return (
    <p className={['story-nudge', className].filter(Boolean).join(' ')}>
      <span className="story-nudge__flag" aria-hidden="true" />
      <span>
        <span className="story-nudge__label">New note:</span> {news.nudge}
      </span>{' '}
      <a href={hrefFor('notes')}>Open the Recipe Box Notes</a>
    </p>
  )
}
