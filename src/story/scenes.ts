import { defineId } from '../domain/ids'
import type { StoryBeat, StoryScene } from './types'

/**
 * What happens in each scene, beat by beat. Marmalade speaks in short lines,
 * one or two sentences, in her own voice: warm, curious, a little dramatic.
 * She knows the kitchen, not the whole story. She can be surprised, and
 * sometimes a discovery brings back something she'd forgotten. The notes
 * speak for themselves, in someone else's hand.
 *
 * Requirements and order live in chapters.ts; this file is only words.
 */

const note = (slug: string): StoryBeat => ({ speaker: 'note', noteId: defineId('note', slug) })

type SceneContent = Pick<StoryScene, 'beats' | 'nudge'>

export const FADED_BOX: SceneContent = {
  nudge: 'Marmalade has something to show you in the recipe box.',
  beats: [
    { speaker: 'marmalade', expression: 'thinking', line: 'Now you’re settled in, there’s something about the recipe box I didn’t mention.' },
    {
      speaker: 'marmalade',
      expression: 'idle',
      line: 'Most of the cards aren’t just old. They’re blank, as if someone wiped them clean. Baking brings them back, a card at a time.',
    },
    note('box-lid'),
    { speaker: 'marmalade', expression: 'surprised', line: 'That’s inside the lid. I’ve napped on this box for years and never once looked inside the lid.' },
    { speaker: 'marmalade', expression: 'thinking', line: 'I know every corner of this kitchen. I don’t know who wrote that. Let’s keep baking and see what comes back.' },
  ],
}

export const MARGINS: SceneContent = {
  nudge: 'There’s pencil in the margin of one of your cards.',
  beats: [
    { speaker: 'marmalade', expression: 'surprised', line: 'Look at the edge of this card. Someone’s written on it.' },
    note('less-sugar'),
    { speaker: 'marmalade', expression: 'proud', line: 'Not mine. I don’t have thumbs, and my handwriting is much nicer.' },
    { speaker: 'marmalade', expression: 'thinking', line: 'There was more, tucked behind a divider. Not a recipe. Something a recipe might grow out of.' },
    note('winter-fair'),
    { speaker: 'marmalade', expression: 'thinking', line: 'No card in the box matches it. Not yet, anyway.' },
  ],
}

export const MARGINS_SPICE: SceneContent = {
  nudge: 'The spiced card has writing on it too.',
  beats: [
    { speaker: 'marmalade', expression: 'happy', line: 'Cinnamon. Oh, I remember this smell.' },
    {
      speaker: 'marmalade',
      expression: 'thinking',
      line: 'Someone used to bake these when the leaves turned. I’d wait by the oven door for the broken ones. I never knew their name. Cats don’t ask.',
    },
    note('october'),
    { speaker: 'marmalade', expression: 'proud', line: 'The same hand as before. E., whoever you were, you were right about October.' },
  ],
}

export const SECOND_SHELF: SceneContent = {
  nudge: 'Something was stuck behind the new jars.',
  beats: [
    { speaker: 'marmalade', expression: 'surprised', line: 'I was nosing behind the new jars and found this. The pantry had a second shelf once.' },
    note('second-shelf'),
    { speaker: 'marmalade', expression: 'thinking', line: 'The good things. So there were more jars here, once. Somebody took them down, or used them up.' },
    note('lunchbox'),
    { speaker: 'marmalade', expression: 'happy', line: 'R.? Another initial. This kitchen was busier than I knew.' },
  ],
}

export const HIDDEN_RECIPES: SceneContent = {
  nudge: 'Marmalade has been counting the cards.',
  beats: [
    { speaker: 'marmalade', expression: 'thinking', line: 'I’ve been going through the box. The cards are numbered in the corner, in that same hand.' },
    { speaker: 'marmalade', expression: 'surprised', line: 'Some numbers just aren’t there. Not faded, not lost. Skipped, on purpose.' },
    note('not-for-the-box'),
    note('layers'),
    {
      speaker: 'marmalade',
      expression: 'proud',
      line: 'So that’s why some recipes only turn up once you’ve baked them. They were never meant to be filed. They were meant to be found.',
    },
  ],
}

export const LAST_CARD: SceneContent = {
  nudge: 'Something slipped out from behind the new card.',
  beats: [
    {
      speaker: 'marmalade',
      expression: 'surprised',
      line: 'When that card went back in the box, another one slid out from behind it. Not faded. There was hardly anything on it to fade.',
    },
    note('last-card'),
    note('key'),
    { speaker: 'marmalade', expression: 'thinking', line: 'M. I can think of one or two things that start with M.' },
    { speaker: 'marmalade', expression: 'proud', line: 'The key doesn’t fit anything in this kitchen. Nothing I’ve found. Not yet.' },
  ],
}
