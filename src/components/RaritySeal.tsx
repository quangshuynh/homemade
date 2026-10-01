import { RARITIES, RARITY_LABELS } from '../domain/progression'
import type { CookieRarity } from '../domain/types'
import './RaritySeal.css'

/**
 * A recipe's rarity as an ink stamp on the card. Each tier is told apart by
 * its word first, then by shape (borders, stitching, a wax or gold-leaf
 * seal) and a count of hand-painted stars, so colour is never the only cue.
 */
export function RaritySeal({ rarity, className }: { rarity: CookieRarity; className?: string }) {
  const stars = RARITIES.indexOf(rarity)
  return (
    <span className={['rarity-seal', `rarity-seal--${rarity}`, className].filter(Boolean).join(' ')} data-rarity={rarity}>
      {stars > 0 && (
        <span className="rarity-seal__stars" aria-hidden="true">
          {Array.from({ length: stars }, (_, index) => (
            <svg key={index} className="rarity-seal__star" viewBox="0 0 20 20" focusable="false">
              <path d="M10 1.5 L12.4 7.2 L18.6 7.6 L13.8 11.5 L15.4 17.6 L10 14.2 L4.7 17.8 L6.2 11.6 L1.4 7.8 L7.6 7.1 Z" />
            </svg>
          ))}
        </span>
      )}
      <span className="rarity-seal__label">{RARITY_LABELS[rarity]}</span>
    </span>
  )
}
