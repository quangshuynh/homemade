import type { ReactNode } from 'react'
import { hrefFor } from '../app/routes'
import { LinkButton } from './Button'
import { HandNote, RecipeCard } from './Paper'
import { ScreenTitle } from './ScreenTitle'
import './EmptyRoom.css'

type EmptyRoomProps = {
  title: string
  art: ReactNode
  /** The short handwritten line: what the player sees here right now. */
  note: string
  children: ReactNode
}

/**
 * The honest empty state for parts of the kitchen that exist as places but
 * have nothing in them yet. No fake content; it says what is (and isn't) here.
 */
export function EmptyRoom({ title, art, note, children }: EmptyRoomProps) {
  return (
    <RecipeCard as="section" className="empty-room" aria-labelledby="screen-title">
      <ScreenTitle className="empty-room__title">{title}</ScreenTitle>
      <div className="empty-room__art">{art}</div>
      <div className="empty-room__text">
        <HandNote>{note}</HandNote>
        {children}
      </div>
      <LinkButton className="empty-room__back" href={hrefFor('kitchen')}>
        Back to the counter
      </LinkButton>
    </RecipeCard>
  )
}
