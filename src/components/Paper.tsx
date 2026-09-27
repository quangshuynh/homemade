import type { HTMLAttributes, ReactNode } from 'react'
import './Paper.css'

type RecipeCardProps = HTMLAttributes<HTMLElement> & {
  /** Ruled lines like a real recipe card. Off for dense content. */
  ruled?: boolean
  as?: 'section' | 'div'
}

/** A taped-down index card: the main surface for anything the player reads or fills in. */
export function RecipeCard({ children, className, ruled = true, as: Tag = 'div', ...rest }: RecipeCardProps) {
  return (
    <Tag className={['recipe-card', ruled && 'recipe-card--ruled', className].filter(Boolean).join(' ')} {...rest}>
      <span className="recipe-card__tape recipe-card__tape--left" aria-hidden="true" />
      <span className="recipe-card__tape recipe-card__tape--right" aria-hidden="true" />
      {children}
    </Tag>
  )
}

/** A handwritten note in pen. */
export function HandNote({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['hand-note', className].filter(Boolean).join(' ')}>{children}</div>
}
