import type { CreationView } from '../domain/baking'
import { bakedAtLabel } from './bakedAt'
import { Cookie } from './kitchenArt'
import './CoolingRack.css'

type CoolingRackProps = {
  creations: readonly CreationView[]
  now: Date
  label: string
  className?: string
}

/**
 * A wire cooling rack with the latest batches on it, each with a grease-pencil
 * label. The cookie art is decorative; the label carries the words, and an
 * experiment says "Kitchen Experiment" (and is always wobbly), so recipes and
 * experiments never differ by colour alone.
 */
export function CoolingRack({ creations, now, label, className }: CoolingRackProps) {
  return (
    <ul className={['cooling-rack', className].filter(Boolean).join(' ')} aria-label={label}>
      {creations.map((view) => (
        <li key={view.creation.id} className={`cooling-rack__spot cooling-rack__spot--${view.kind}`}>
          <Cookie look={view.look} className="cooling-rack__cookie" />
          <span className="cooling-rack__tag">
            <span className="cooling-rack__name">{view.name}</span>
            <span className="cooling-rack__when">
              <span className="visually-hidden">Baked </span>
              <time dateTime={view.creation.bakedAt}>{bakedAtLabel(view.creation.bakedAt, now)}</time>
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
