import { defineId, type StoryNoteId } from '../domain/ids'
import type { StoryNote } from './types'

/**
 * Everything written down in the kitchen that isn't a recipe: labels, scraps
 * and pencil in the margins, all in the same unknown hand. Short and plain,
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
    text: 'A small brass key on a loop of kitchen string. Its tag says only: Not yet.',
  },
  {
    id: defineId('note', 'cupboard-door'),
    chapterId: chapter('old-cupboard'),
    kind: 'label',
    title: 'Inside the cupboard door',
    text: 'Put away, not thrown away. For when the kitchen is lived in again.',
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
