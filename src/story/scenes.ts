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

export const OLD_CUPBOARD: SceneContent = {
  nudge: 'The brass key has been waiting for something.',
  beats: [
    { speaker: 'marmalade', expression: 'thinking', line: '“Not yet,” said the tag. I’ve been thinking about it, and I think it’s yet now.' },
    {
      speaker: 'marmalade',
      expression: 'surprised',
      line: 'The little cupboard under the counter. I always thought it was painted shut. It isn’t. It’s locked. Was locked.',
    },
    note('cupboard-door'),
    { speaker: 'marmalade', expression: 'happy', line: 'Oh. I wondered where these went. That jar always sat by the recipe box, and I used to sleep on that towel.' },
    { speaker: 'marmalade', expression: 'thinking', line: 'The frame, though. I’ve never seen that before in my life.' },
    { speaker: 'marmalade', expression: 'proud', line: 'They’re yours now. Put them out wherever makes the kitchen feel like yours.' },
  ],
}

// ---------------------------------------------------------------- Arc 2: the tin behind the cupboard (Interval 10)
//
// One object, opened a layer at a time: a flat biscuit tin hidden behind the
// cupboard's loose back board. Each chapter lifts the next thing out of it.
// Arc 2 answers who E. was (Edie, who wrote the notes) and who R. was (her
// son, whose lunches she packed), and moves M. on without saying who M. is.

export const BEHIND_CUPBOARD: SceneContent = {
  nudge: 'Something shifted at the back of the old cupboard.',
  beats: [
    {
      speaker: 'marmalade',
      expression: 'surprised',
      line: 'With half the cupboard out in the kitchen, I can see right to the back. The back board isn’t nailed. It’s only leaning there.',
    },
    note('back-board'),
    { speaker: 'marmalade', expression: 'thinking', line: 'Mind the tin? There’s a gap behind it, and something flat pushed right up to the wall.' },
    { speaker: 'marmalade', expression: 'happy', line: 'A biscuit tin. It rattles. Not biscuits, sadly. Paper.' },
    note('tin-card'),
    {
      speaker: 'marmalade',
      expression: 'thinking',
      line: 'Toasted and sticky. Oats, I think, and something golden. If the oven remembers this one, maybe the card will too.',
    },
  ],
}

export const EDIES_HAND: SceneContent = {
  nudge: 'The card from the tin has a name at the bottom.',
  beats: [
    { speaker: 'marmalade', expression: 'surprised', line: 'It came back. The card from the tin, written in again right to the bottom. And this one is signed.' },
    note('signed-card'),
    { speaker: 'marmalade', expression: 'thinking', line: 'I held it up against every note in the box. The same loop on the E. The same little dash before it.' },
    {
      speaker: 'marmalade',
      expression: 'wistful',
      line: 'Edie. The one who baked when the leaves turned and saved me the broken ones. I never knew her name until now.',
    },
    { speaker: 'marmalade', expression: 'proud', line: 'So E. was Edie. Every margin, every scrap, the inside of the lid. All her.' },
    note('lunch-bag'),
    { speaker: 'marmalade', expression: 'happy', line: 'R. again, in crayon this time. Wednesdays sound like a good day to be R.' },
  ],
}

export const RS_LUNCHBOX: SceneContent = {
  nudge: 'Something was folded up under the lunch bag.',
  beats: [
    { speaker: 'marmalade', expression: 'surprised', line: 'Those windows. That’s the Wednesday biscuit off the lunch bag. And look what was folded up underneath it.' },
    note('thank-you'),
    { speaker: 'marmalade', expression: 'happy', line: 'Mum. So R. was her boy, and these were his lunches.' },
    note('school-week'),
    { speaker: 'marmalade', expression: 'proud', line: 'He’d learned to swap the plain ones by Tuesday. Clever boy. By Friday he was getting two.' },
    { speaker: 'marmalade', expression: 'thinking', line: 'A lunch bag, a thank-you, a list. She kept all of it. Every small thing he ever said about a biscuit.' },
  ],
}

export const PHOTOGRAPH: SceneContent = {
  nudge: 'Marmalade remembered something about Sundays.',
  beats: [
    { speaker: 'marmalade', expression: 'thinking', line: 'You’ve baked the windows enough now that the kitchen smells right. And it brought something back.' },
    {
      speaker: 'marmalade',
      expression: 'wistful',
      line: 'Someone tall, on Sundays. He sat where you’re standing, and went home with a tin under his arm. He always dropped me the crumbs.',
    },
    {
      speaker: 'marmalade',
      expression: 'happy',
      line: 'That was R. All grown up, and still taking biscuits home from his mum. Then I found this, flat at the bottom of the tin.',
    },
    note('photograph'),
    note('photo-back'),
    { speaker: 'marmalade', expression: 'surprised', line: 'M. was there. At the first fair, outside this very window. Right about where that corner’s been torn away.' },
    { speaker: 'marmalade', expression: 'thinking', line: 'Dark, sticky squares, still warm. Spiced, I’d bet. If anyone can bake those again, it’s this kitchen.' },
  ],
}

export const FOR_M: SceneContent = {
  nudge: 'The paper at the bottom of the tin has lifted up.',
  beats: [
    {
      speaker: 'marmalade',
      expression: 'surprised',
      line: 'The parkin. The whole kitchen smells like a bonfire. And the paper lining the bottom of the tin just lifted up.',
    },
    note('returned-envelope'),
    { speaker: 'marmalade', expression: 'wistful', line: 'It went all the way to M., and it came all the way back.' },
    note('envelope-flap'),
    {
      speaker: 'marmalade',
      expression: 'thinking',
      line: 'When the box is full again. She meant all of it for M.: the cards, the tin, the cupboard. And R. knew. They both did.',
    },
    { speaker: 'marmalade', expression: 'thinking', line: 'It’s sealed. It isn’t mine to open, and I don’t think it’s yours either. Not yet.' },
    { speaker: 'marmalade', expression: 'proud', line: 'The photograph shouldn’t live in a tin, though. I found it a frame. Torn corner and all.' },
  ],
}
