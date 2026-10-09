/**
 * The places in the kitchen a decoration can go. Curated, not freeform: each
 * spot is a fixed zone of the Home Kitchen picture, so the composition holds
 * on every screen, nothing overlaps, and a save only has to say which thing
 * is in which spot.
 *
 * The picture reads back to front: the tiled wall (with a frame on it, the
 * window and the shelf), the back of the counter (a jar, a plant, a crock),
 * the counter objects the player uses, then the cupboard doors at the front
 * (a towel on the handle). See DESIGN.md, "Decorating".
 *
 * Never rename a slot once shipped; saves key equipped decorations by it.
 */

export const DECORATION_SLOTS = ['wall', 'window', 'shelf', 'counter-left', 'plant', 'counter-right', 'textile'] as const

export type DecorationSlot = (typeof DECORATION_SLOTS)[number]

export type SlotInfo = {
  id: DecorationSlot
  /** Short, for the slot's tag in edit mode: "Wall". */
  name: string
  /** What goes there, for the chooser: "Something to hang beside the window." */
  hint: string
}

/** In reading order: the wall from left to right, the back of the counter, then the cupboard at the front. */
export const SLOT_INFO: Record<DecorationSlot, SlotInfo> = {
  wall: { id: 'wall', name: 'Wall', hint: 'Something to hang beside the window.' },
  window: { id: 'window', name: 'Window', hint: 'Something for the window: curtains, or herbs to dry.' },
  shelf: { id: 'shelf', name: 'Shelf', hint: 'A little something for the wall shelf.' },
  'counter-left': { id: 'counter-left', name: 'Counter, left', hint: 'Something to stand at the back of the counter, by the recipe box.' },
  plant: { id: 'plant', name: 'Plant', hint: 'Something growing, under the window.' },
  'counter-right': { id: 'counter-right', name: 'Counter, right', hint: 'Something to stand at the back of the counter, by the pantry jar.' },
  textile: { id: 'textile', name: 'Tea towel', hint: 'A towel for the cupboard door handle.' },
}

export function isDecorationSlot(value: unknown): value is DecorationSlot {
  return typeof value === 'string' && (DECORATION_SLOTS as readonly string[]).includes(value)
}
