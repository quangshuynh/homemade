import { hrefFor } from '../app/routes'
import { BrassKey } from './DecorArt'
import type { DecorationDefinition } from './types'
import './DecorNews.css'

/** "the old rolling pin", "the gold seal, framed and the little lemon tree" */
function listNames(pieces: readonly DecorationDefinition[]): string {
  const names = pieces.map((piece) => piece.name.charAt(0).toLowerCase() + piece.name.slice(1))
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/**
 * A kraft tag saying something new is waiting in the kitchen cupboard,
 * left under whatever earned it. Never opens anything by itself, and never
 * puts anything out for the player.
 */
export function DecorNews({ pieces, className }: { pieces: readonly DecorationDefinition[]; className?: string }) {
  if (pieces.length === 0) return null
  return (
    <p className={['decor-news', className].filter(Boolean).join(' ')}>
      <BrassKey className="decor-news__key" />
      <span>
        <span className="decor-news__label">For your kitchen:</span> {pieces.length === 1 ? 'something' : 'some things'} new in the old cupboard (
        {listNames(pieces)}).
      </span>{' '}
      <a href={hrefFor('decorate')}>Open the cupboard</a>
    </p>
  )
}
