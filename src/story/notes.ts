import { defineId, type StoryNoteId } from '../domain/ids'
import type { StoryNote } from './types'

/**
 * Everything written down in the kitchen that isn't a recipe: labels, scraps
 * and pencil in the margins, nearly all in one hand: Edie's, as the second
 * arc shows (a few are R.'s, and say so). Short and plain,
 * like a note left for someone who already knows the kitchen. They hint;
 * they never explain.
 *
 * Clues to secret recipes are lore, not instructions: a feeling of the thing,
 * what it was for, what it was missing. Never an ingredient's name, and
 * never the whole combination (a content check enforces the first).
 *
 * Never reuse or rename an id once shipped.
 */

const chapter = (slug: string) => defineId('chapter', slug)

export const STORY_NOTES: readonly StoryNote[] = [
  {
    id: defineId('note', 'box-lid'),
    chapterId: chapter('faded-box'),
    kind: 'label',
    title: 'Inside the lid of the recipe box',
    text: 'Recipes. Please put them back where you found them.',
  },
  {
    id: defineId('note', 'less-sugar'),
    chapterId: chapter('margins'),
    kind: 'margin',
    title: 'Pencilled beside a card you found',
    text: 'A little less sweet next time. — E.',
  },
  {
    id: defineId('note', 'winter-fair'),
    chapterId: chapter('margins'),
    kind: 'scrap',
    title: 'A scrap tucked behind a divider',
    text: 'For the winter fair: little snowballs. No dough to speak of, they hold themselves together. Pale right through, and something sweeter hidden in the middle.',
    secretRecipeId: defineId('recipe', 'snowball'),
  },
  {
    id: defineId('note', 'october'),
    chapterId: chapter('margins'),
    kind: 'margin',
    title: 'Pencilled beside a spiced card',
    text: 'Better in October. Everything is. — E.',
  },
  {
    id: defineId('note', 'second-shelf'),
    chapterId: chapter('second-shelf'),
    kind: 'label',
    title: 'A label behind the new jars',
    text: 'Second shelf: the good things. Ask before you borrow.',
  },
  {
    id: defineId('note', 'lunchbox'),
    chapterId: chapter('second-shelf'),
    kind: 'scrap',
    title: 'Folded small, under the shelf paper',
    text: 'For R.’s lunchbox: the nutty ones, made the quick way, with something bright pressed into the middle. Not too much, or it runs.',
    secretRecipeId: defineId('recipe', 'peanut-butter-jam'),
  },
  {
    id: defineId('note', 'not-for-the-box'),
    chapterId: chapter('hidden-recipes'),
    kind: 'card',
    title: 'The back of a card with nothing on the front',
    text: 'Some recipes aren’t for the box. Some are for keeping.',
  },
  {
    id: defineId('note', 'layers'),
    chapterId: chapter('hidden-recipes'),
    kind: 'scrap',
    title: 'Slipped inside the empty card',
    text: 'Layer on layer, the way it was made at home. Nuts the colour of new leaves, a little warm spice, and something golden poured over while it’s hot.',
    secretRecipeId: defineId('recipe', 'baklava-bite'),
  },
  {
    id: defineId('note', 'last-card'),
    chapterId: chapter('last-card'),
    kind: 'card',
    title: 'The last card in the box',
    text: 'For M., when the box is full again.',
  },
  {
    id: defineId('note', 'key'),
    chapterId: chapter('last-card'),
    kind: 'label',
    title: 'Taped to the back of the last card',
    intro: 'described',
    text: 'A small brass key on a loop of kitchen string. Its tag says only: Not yet.',
  },
  {
    id: defineId('note', 'cupboard-door'),
    chapterId: chapter('old-cupboard'),
    kind: 'label',
    title: 'Inside the cupboard door',
    text: 'Put away, not thrown away. For when the kitchen is lived in again.',
  },

  // ---- Arc 2 (Interval 10): what's in the tin behind the cupboard. Edie's
  // pencil throughout, except the three in R.'s hand, which say so.
  {
    id: defineId('note', 'back-board'),
    chapterId: chapter('behind-cupboard'),
    kind: 'label',
    title: 'Pencilled on the cupboard’s back board',
    text: 'Loose on purpose. Mind the tin.',
  },
  {
    id: defineId('note', 'tin-card'),
    chapterId: chapter('behind-cupboard'),
    kind: 'card',
    title: 'On top, inside a flat biscuit tin',
    intro: 'described',
    text: 'A recipe card, wiped blank like the others. It smells of something toasted, and one corner is sticky where a warm spoon was put down on it.',
  },
  {
    id: defineId('note', 'signed-card'),
    chapterId: chapter('edies-hand'),
    kind: 'card',
    title: 'The card from the tin, written back in',
    text: 'Thin as you dare, the way my mother made them. Don’t walk away from the oven, not even for the door. — Edie',
  },
  {
    id: defineId('note', 'lunch-bag'),
    chapterId: chapter('edies-hand'),
    kind: 'scrap',
    title: 'A paper lunch bag, folded flat, with R. on it in crayon',
    text: 'Wednesdays: the speckled ones with a window cut in, and something red showing through. R. says the plain ones are only for swapping.',
  },
  {
    id: defineId('note', 'thank-you'),
    chapterId: chapter('rs-lunchbox'),
    kind: 'card',
    title: 'A folded card, in the same crayon',
    intro: 'hand-in-title',
    text: 'Thank you Mum for the lunches. The window ones are the best ones. I did not swap any. Love from R.',
  },
  {
    id: defineId('note', 'school-week'),
    chapterId: chapter('rs-lunchbox'),
    kind: 'label',
    title: 'Inside the lid of the tin, in Edie’s pencil',
    intro: 'hand-in-title',
    text: 'R.’s first week at school. Mon., plain. Tue., plain (swapped). Wed., windows. Thu., windows. Fri., windows, two, one for a friend.',
  },
  {
    id: defineId('note', 'photograph'),
    chapterId: chapter('photograph'),
    kind: 'photo',
    title: 'A small square photograph, curled at the edges',
    intro: 'described',
    text: 'This kitchen, years ago. A table under the window, a sign for the winter fair, a woman with her sleeves rolled up and a boy on a crate guarding a tray. One corner is torn off.',
  },
  {
    id: defineId('note', 'photo-back'),
    chapterId: chapter('photograph'),
    kind: 'margin',
    title: 'On the back of the photograph',
    text: 'First fair. R. sold out by noon. M. ate the profits: the dark, sticky squares, still warm, every last one. — E.',
  },
  {
    id: defineId('note', 'returned-envelope'),
    chapterId: chapter('for-m'),
    kind: 'card',
    title: 'Under the paper lining the tin, an envelope',
    intro: 'described',
    text: 'Addressed in Edie’s hand to M., at a street that has been crossed out. Stamped across the front: Returned, not known at this address. Never opened.',
  },
  {
    id: defineId('note', 'envelope-flap'),
    chapterId: chapter('for-m'),
    kind: 'margin',
    title: 'Pencilled on the back of the envelope, in a grown-up hand',
    intro: 'hand-in-title',
    text: 'Mum, keep it with the box. When M. comes back, it’ll be for the box. — R.',
  },
]

const byId = new Map(STORY_NOTES.map((note) => [note.id, note]))

export function findNote(id: StoryNoteId): StoryNote | undefined {
  return byId.get(id)
}

export function getNote(id: StoryNoteId): StoryNote {
  const note = byId.get(id)
  if (!note) throw new Error(`No story note with id ${id}`)
  return note
}
