import type { ReactNode } from 'react'
import { hrefFor } from '../app/routes'
import { BrassKey, DecorationArt, ShelfFixture, WindowFixture } from './DecorArt'
import { SLOT_INFO, type DecorationSlot } from './slots'
import type { DecorationDefinition } from './types'
import './KitchenScene.css'

/**
 * The kitchen around the counter: the tiled wall behind it (a frame, the
 * window, the shelf), the back of the counter (a jar, a plant, a crock) and
 * the cupboard doors at the front (a towel on the handle). Each spot is a
 * fixed zone; whatever is out in it is drawn there, layered back to front
 * with the `--layer-scene-*` tokens.
 *
 * In the kitchen it's scenery: hidden from assistive tech, with the counter
 * objects (real links) left exactly as they were. In edit mode every spot
 * becomes a button, so the same picture is how the player picks a spot.
 */

/** What to draw in each spot: what's out, or what's being tried there. */
export type ScenePieces = Partial<Record<DecorationSlot, DecorationDefinition>>

export type SceneEditing = {
  selected: DecorationSlot | null
  /** The spot showing something that isn't out yet, if any. */
  previewing: DecorationSlot | null
  onSelect: (slot: DecorationSlot) => void
}

type SpotProps = {
  slot: DecorationSlot
  pieces: ScenePieces
  editing?: SceneEditing
  children: ReactNode
}

/** One zone of the picture. In edit mode it's also a button for choosing that spot. */
function Spot({ slot, pieces, editing, children }: SpotProps) {
  const piece = pieces[slot]
  const selected = editing?.selected === slot
  const previewing = editing?.previewing === slot
  return (
    <div
      className="scene-spot"
      data-slot={slot}
      data-filled={piece ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-previewing={previewing ? '' : undefined}
    >
      {children}
      {previewing && (
        <span className="scene-spot__preview" aria-hidden="true">
          Trying it
        </span>
      )}
      {editing && (
        <button type="button" className="scene-spot__button" aria-pressed={selected} onClick={() => editing.onSelect(slot)}>
          <span className="scene-spot__label">{SLOT_INFO[slot].name}</span>
          <span className="visually-hidden">
            {`: ${piece ? piece.name : 'nothing out'}${previewing ? ', trying it here' : ''}`}
          </span>
        </button>
      )}
    </div>
  )
}

/** Whatever is out in a spot, drawn in its zone. */
function Piece({ piece, className }: { piece: DecorationDefinition | undefined; className: string }) {
  return piece ? <DecorationArt key={piece.id} look={piece.visual} className={className} /> : null
}

export function KitchenWall({ pieces, editing }: { pieces: ScenePieces; editing?: SceneEditing }) {
  const spot = (slot: DecorationSlot, children: ReactNode) => (
    <Spot slot={slot} pieces={pieces} editing={editing}>
      {children}
    </Spot>
  )
  return (
    <div
      className={['kitchen-wall', editing && 'kitchen-wall--editing'].filter(Boolean).join(' ')}
      // Scenery in the kitchen; a set of spot buttons in edit mode.
      aria-hidden={editing ? undefined : true}
      role={editing ? 'group' : undefined}
      aria-label={editing ? 'Spots on the wall and the back of the counter' : undefined}
    >
      {spot('wall', pieces.wall ? <Piece piece={pieces.wall} className="scene-spot__art scene-spot__art--hung" /> : <span className="kitchen-wall__nail" />)}
      {spot(
        'window',
        <>
          <WindowFixture className="scene-spot__fixture" />
          <Piece piece={pieces.window} className="scene-spot__fixture scene-spot__fixture--dressing" />
        </>,
      )}
      {spot(
        'shelf',
        <>
          <Piece piece={pieces.shelf} className="scene-spot__art scene-spot__art--on-shelf" />
          <ShelfFixture className="kitchen-wall__shelf" />
        </>,
      )}
      {spot('counter-left', <Piece piece={pieces['counter-left']} className="scene-spot__art" />)}
      {spot('plant', <Piece piece={pieces.plant} className="scene-spot__art" />)}
      {spot('counter-right', <Piece piece={pieces['counter-right']} className="scene-spot__art" />)}
    </div>
  )
}

type CupboardProps = {
  pieces: ScenePieces
  editing?: SceneEditing
  /**
   * `locked` before the brass key; `open` once it turns. In the kitchen an
   * open cupboard carries a tag that leads to decorating.
   */
  state: 'locked' | 'open'
  /** The tag's second line, when there is a tag. */
  tagDetail?: string
}

/** The cupboard doors under the counter, with a towel on the handle and, once it turns, the brass key in the lock. */
export function KitchenCupboard({ pieces, editing, state, tagDetail }: CupboardProps) {
  return (
    <div className={['kitchen-cupboard', editing && 'kitchen-cupboard--editing'].filter(Boolean).join(' ')} data-state={state}>
      <div className="kitchen-cupboard__doors" aria-hidden="true">
        <span className="kitchen-cupboard__door kitchen-cupboard__door--keyed">
          {state === 'open' ? <BrassKey className="kitchen-cupboard__key" /> : <span className="kitchen-cupboard__keyhole" />}
        </span>
        <span className="kitchen-cupboard__door" />
        <span className="kitchen-cupboard__door kitchen-cupboard__door--handle">
          <span className="kitchen-cupboard__handle" />
        </span>
      </div>
      <div className="kitchen-cupboard__towel" role={editing ? 'group' : undefined} aria-label={editing ? 'Spot on the cupboard door' : undefined}>
        <Spot slot="textile" pieces={pieces} editing={editing}>
          <Piece piece={pieces.textile} className="scene-spot__art" />
        </Spot>
      </div>
      {state === 'open' && !editing && (
        <a className="kitchen-cupboard__tag" href={hrefFor('decorate')}>
          <span className="kitchen-cupboard__tag-name">The old cupboard</span>
          {tagDetail && <span className="kitchen-cupboard__tag-detail">{tagDetail}</span>}
        </a>
      )}
    </div>
  )
}
