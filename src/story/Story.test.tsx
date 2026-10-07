import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { SoundPlayerContext } from '../audio/soundContext'
import type { IngredientId, RecipeId, StorySceneId } from '../domain/ids'
import { CINNAMON, STARTER_PANTRY } from '../domain/ingredients'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeNewKitchen, makeSave, makeV4Save } from '../test/fixtures'
import { STORY_NOTES } from './notes'

type User = ReturnType<typeof userEvent.setup>

const still = { soundEnabled: true, motion: 'reduced' } as const
const found = (...ids: string[]) => ids.map((id) => ({ recipeId: id as RecipeId, discoveredAt: '2026-09-01T10:00:00.000Z' }))
const seen = (...slugs: string[]) => ({ seenSceneIds: slugs.map((slug) => `scene_${slug}` as StorySceneId) })
const FOUR = found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss', 'recipe_vanilla-kiss')

function startAt(stored: unknown, hash = '#/') {
  const memory = createMemorySaveRepository(stored)
  const played: string[] = []
  const player: AudioPlayer = { play: (id) => played.push(id), stopAll: vi.fn() }
  window.location.hash = hash
  render(
    <SoundPlayerContext value={player}>
      <GameProvider repository={memory.repository}>
        <App />
      </GameProvider>
    </SoundPlayerContext>,
  )
  return { played, saved: () => memory.state.stored as GameSave }
}

const openNotes = () => screen.findByRole('heading', { level: 1, name: 'Recipe Box Notes' })
const sceneCard = (name: RegExp | string) => screen.getByRole('region', { name })
const notesOnPage = () => STORY_NOTES.filter((note) => document.body.textContent?.includes(note.text))

/** Clicks Next until the scene's last button, then that. */
async function readToEnd(user: User, finish = 'Put it back in the box') {
  while (!screen.queryByRole('button', { name: finish })) await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: finish }))
}

async function bake(user: User, names: string[]) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of names) await user.click(screen.getByRole('button', { name }))
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
}

describe('a new player', () => {
  it('finishes the tutorial, is pointed at the recipe box, and finds Chapter 1 waiting there', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(makeNewKitchen({ settings: still }))
    const guide = () => screen.getByRole('complementary', { name: 'Tutorial' })
    const next = (name: string) => user.click(within(guide()).getByRole('button', { name }))

    await screen.findByText(/I’m Marmalade/)
    // Nothing from the story while the tutorial is on.
    expect(screen.queryByText('A new note inside')).not.toBeInTheDocument()
    await next('Hello, Marmalade')
    await next('Let’s bake')
    await bake(user, ['Flour', 'Sugar', 'Butter'])
    await waitFor(() => within(guide()).getByText('Card 6 of 9'))
    expect(screen.queryByText(/New note:/)).not.toBeInTheDocument()
    await next('Where does it go?')
    await next('What are Crumbs?')
    await next('Next')
    expect(within(guide()).getByText(/look in the recipe box: there’s something I want to show you/)).toBeInTheDocument()
    await next('Off you go')

    await user.click(screen.getByRole('link', { name: /Kitchen/ }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.getByRole('link', { name: /Recipe Book.*A new note inside/ })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Recipe Book.*A new note inside/ }))
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
    await user.click(screen.getByRole('link', { name: 'Recipe Box Notes: New note' }))
    await openNotes()
    expect(screen.getByRole('heading', { level: 2, name: 'A new note' })).toBeInTheDocument()
    expect(saved().story.seenSceneIds).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    expect(sceneCard('Chapter 1: The Faded Recipe Box')).toBeInTheDocument()
    await readToEnd(user)
    await waitFor(() => expect(saved().story.seenSceneIds).toEqual(['scene_faded-box']))
    expect(screen.getByRole('heading', { level: 3, name: 'Inside the lid of the recipe box' })).toBeInTheDocument()
  })
})

describe('the new-note indicator', () => {
  it('says “A new note” in words in the kitchen and the Recipe Book, never just a dot, and goes once it’s read', async () => {
    const user = userEvent.setup()
    startAt(makeSave({ settings: still }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.getByText('A new note inside')).toBeInTheDocument()

    window.location.hash = '#/recipe-book'
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
    expect(screen.getByRole('link', { name: 'Recipe Box Notes: New note' })).toHaveAttribute('href', '#/recipe-book/notes')

    window.location.hash = '#/recipe-book/notes'
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    await readToEnd(user)

    window.location.hash = '#/recipe-book'
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
    expect(screen.getByRole('link', { name: 'Recipe Box Notes' })).toBeInTheDocument()
    window.location.hash = '#/'
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.queryByText('A new note inside')).not.toBeInTheDocument()
  })

  it('stays quiet while nothing is waiting', async () => {
    startAt(makeSave({ settings: still, story: seen('faded-box') }), '#/recipe-book')
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
    expect(screen.queryByText('New note')).not.toBeInTheDocument()
  })
})

describe('reading a scene', () => {
  it('works by keyboard alone: each line takes focus, Next is one Tab away, and the speaker is named', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(makeSave({ settings: still }), '#/recipe-book/notes')
    await openNotes()

    screen.getByRole('button', { name: 'Read it with Marmalade' }).focus()
    await user.keyboard('{Enter}')
    const card = sceneCard('Chapter 1: The Faded Recipe Box')
    expect(within(card).getByText('1 of 5')).toBeInTheDocument()
    const first = within(card).getByText(/Now you’re settled in/)
    expect(first).toHaveFocus()
    expect(first).toHaveTextContent(/^Marmalade: Now you’re settled in/)
    expect(within(card).getByRole('button', { name: 'Skip this scene' })).toBeInTheDocument()

    await user.tab()
    expect(within(card).getByRole('button', { name: 'Next' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(within(card).getByText(/Most of the cards aren’t just old/)).toHaveFocus()

    // A note is read out with where it was found, in someone else's hand.
    await user.tab()
    await user.keyboard('{Enter}')
    const note = within(card).getByText(/Please put them back where you found them/)
    expect(note).toHaveFocus()
    expect(note).toHaveTextContent('Inside the lid of the recipe box, in someone else’s handwriting: Recipes. Please put them back where you found them.')

    for (let beat = 4; beat <= 5; beat++) {
      await user.tab()
      await user.keyboard('{Enter}')
      expect(within(card).getByText(`${beat} of 5`)).toBeInTheDocument()
    }
    await user.tab()
    expect(within(card).getByRole('button', { name: 'Put it back in the box' })).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByText(/Put back in the box\. That’s the end of The Faded Recipe Box\./).parentElement).toHaveFocus())
    expect(saved().story.seenSceneIds).toEqual(['scene_faded-box'])
    expect(played.filter((id) => id === 'story-note')).toHaveLength(1)
    expect(played.filter((id) => id === 'tutorial-next')).toHaveLength(5)
  })

  it('shows every line straight away under reduced motion: no timers, no forced pauses', async () => {
    const user = userEvent.setup()
    startAt(makeSave({ settings: still }), '#/recipe-book/notes')
    await openNotes()
    expect(document.documentElement.dataset.motion).toBe('reduced')
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    // Each Next shows the next line in the same tick; nothing waits on an animation.
    for (const text of [/Now you’re settled in/, /Most of the cards/, /Please put them back/, /never once looked inside the lid/, /Let’s keep baking/]) {
      expect(screen.getByText(text)).toBeInTheDocument()
      if (screen.queryByRole('button', { name: 'Next' })) await user.click(screen.getByRole('button', { name: 'Next' }))
    }
  })

  it('opens a waiting scene only when asked, never by itself', async () => {
    startAt(makeSave({ settings: still }), '#/recipe-book/notes')
    await openNotes()
    expect(screen.queryByRole('region', { name: /Chapter 1/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Now you’re settled in/)).not.toBeInTheDocument()
  })
})

describe('skipping', () => {
  it('marks the scene seen, still files its notes and pays its chapter’s reward: skipping is never punished', async () => {
    const user = userEvent.setup()
    const start = makeSave({ settings: still, story: seen('faded-box', 'margins'), discoveredRecipes: [...FOUR, ...found('recipe_snickerdoodle')], progression: { crumbs: 4, xp: 300 } })
    const { saved, played } = startAt(start, '#/recipe-book/notes')
    await openNotes()

    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    await user.click(screen.getByRole('button', { name: 'Skip this scene' }))

    await waitFor(() => expect(saved().story.seenSceneIds).toEqual(['scene_faded-box', 'scene_margins', 'scene_margins-spice']))
    expect(saved().progression).toEqual({ crumbs: 14, xp: 300 })
    expect(screen.getByText(/Skipped\. Whatever was found is filed below/).parentElement).toHaveFocus()
    expect(screen.getByText('Tucked between the cards: 10 Crumbs.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Pencilled beside a spiced card' })).toBeInTheDocument()
    expect(played).toContain('story-note')
  })
})

describe('replay', () => {
  it('plays a finished scene again and changes nothing: no Crumbs, no XP, no sound of a new note', async () => {
    const user = userEvent.setup()
    const start = makeSave({ settings: still, story: seen('faded-box', 'margins', 'margins-spice'), discoveredRecipes: [...FOUR, ...found('recipe_snickerdoodle')], progression: { crumbs: 4, xp: 300 } })
    const { saved, played } = startAt(start, '#/recipe-book/notes')
    await openNotes()

    await user.click(screen.getByRole('button', { name: 'Replay chapter 2, Notes in the Margins, part 2, with Marmalade' }))
    const card = sceneCard('Chapter 2: Notes in the Margins, part 2 (replay)')
    expect(within(card).getByText(/Cinnamon\. Oh, I remember this smell\./)).toHaveFocus()
    await readToEnd(user, 'Close')

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Chapter 2 Notes in the Margins' })).toHaveFocus())
    expect(saved()).toEqual(start)
    expect(played).not.toContain('story-note')

    // Stopping a replay part-way changes nothing either.
    await user.click(screen.getByRole('button', { name: 'Replay chapter 1, The Faded Recipe Box, with Marmalade' }))
    await user.click(screen.getByRole('button', { name: 'Stop the replay' }))
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Chapter 1 The Faded Recipe Box' })).toHaveFocus())
    expect(saved()).toEqual(start)
  })
})

describe('Recipe Box Notes', () => {
  it('files notes under semantic chapter headings, and keeps later chapters and their notes out of the page', async () => {
    startAt(makeSave({ settings: still, story: seen('faded-box') }), '#/recipe-book/notes')
    await openNotes()

    const chapter = screen.getByRole('region', { name: 'Chapter 1 The Faded Recipe Box' })
    expect(within(chapter).getByRole('heading', { level: 3, name: 'Inside the lid of the recipe box' })).toBeInTheDocument()
    expect(within(chapter).getByText('Read')).toBeInTheDocument()
    expect(notesOnPage().map((note) => note.id)).toEqual(['note_box-lid'])
    for (const title of ['Notes in the Margins', 'The Second Shelf', 'Recipes Someone Hid', 'The Last Card']) {
      expect(screen.queryByText(new RegExp(title))).not.toBeInTheDocument()
    }
    expect(screen.getByText('The rest of the box is still too faded to read. Keep baking.')).toBeInTheDocument()
  })

  it('keeps a waiting scene’s notes out of the page until it’s been read', async () => {
    startAt(makeSave({ settings: still, story: seen('faded-box'), discoveredRecipes: FOUR }), '#/recipe-book/notes')
    await openNotes()
    expect(screen.getByText('There’s pencil in the margin of one of your cards.')).toBeInTheDocument()
    expect(notesOnPage().map((note) => note.id)).toEqual(['note_box-lid'])
  })

  it('says so quietly when the box has nothing to show yet', async () => {
    startAt(makeNewKitchen({ settings: still }), '#/recipe-book/notes')
    await openNotes()
    expect(screen.getByText('Nothing here yet. The box is still mostly blank. Keep baking.')).toBeInTheDocument()
  })
})

describe('story while baking', () => {
  it('mentions a new note on the bake result without opening it, once, however many milestones the bake crossed', async () => {
    const user = userEvent.setup()
    // Three cards back and the box read: Snickerdoodle is both a fourth card and the first spiced one.
    const start = makeNewKitchen({
      settings: still,
      tutorial: { completed: true, skipped: false },
      pantryIngredientIds: [...STARTER_PANTRY, CINNAMON],
      discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie', 'recipe_meringue-kiss'),
      story: seen('faded-box'),
    })
    startAt(start, '#/bake')
    await bake(user, ['Flour', 'Sugar', 'Butter', 'Egg', 'Cinnamon'])

    await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Snickerdoodle' })
    expect(screen.getAllByText(/New note:/)).toHaveLength(1)
    expect(screen.getByText(/There’s pencil in the margin of one of your cards\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the Recipe Box Notes' })).toHaveAttribute('href', '#/recipe-book/notes')
    expect(screen.queryByRole('region', { name: /Chapter 2/ })).not.toBeInTheDocument()

    // The second milestone is queued behind the first, and opens as soon as it's read.
    await user.click(screen.getByRole('link', { name: 'Open the Recipe Box Notes' }))
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    await readToEnd(user)
    expect(await screen.findByRole('heading', { level: 2, name: 'Another note is waiting' })).toBeInTheDocument()
    expect(screen.getByText('The spiced card has writing on it too.')).toBeInTheDocument()
  })

  it('says nothing about the story on an ordinary bake', async () => {
    const user = userEvent.setup()
    startAt(makeSave({ settings: still, story: seen('faded-box'), discoveredRecipes: found('recipe_shortbread') }), '#/bake')
    await bake(user, ['Flour', 'Sugar', 'Butter'])
    await screen.findByRole('heading', { level: 2, name: 'Shortbread' })
    expect(screen.queryByText(/New note:/)).not.toBeInTheDocument()
  })

  it('mentions a new note in the Pantry when an addition opens one', async () => {
    const user = userEvent.setup()
    const start = makeNewKitchen({
      settings: still,
      tutorial: { completed: true, skipped: false },
      pantryIngredientIds: [...STARTER_PANTRY, CINNAMON, 'ingredient_chocolate-chips' as IngredientId],
      discoveredRecipes: [...FOUR, ...found('recipe_snickerdoodle')],
      progression: { crumbs: 100, xp: 300 },
      story: seen('faded-box', 'margins', 'margins-spice'),
    })
    startAt(start, '#/pantry')
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })
    await user.click(screen.getByRole('button', { name: /Add strawberry jam/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Add it/i }))
    expect(await screen.findByText(/Something was stuck behind the new jars\./)).toBeInTheDocument()
  })
})

describe('an existing player', () => {
  it('arrives from an Interval 6 save with no tutorial, everything kept, and the story to catch up on', async () => {
    const user = userEvent.setup()
    const v4 = makeV4Save({ settings: still })
    const { saved } = startAt(v4)
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.queryByRole('complementary', { name: 'Tutorial' })).not.toBeInTheDocument()
    expect(screen.getByText('A new note inside')).toBeInTheDocument()
    expect(screen.getByText('5 recipes')).toBeInTheDocument()

    window.location.hash = '#/recipe-book/notes'
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    await readToEnd(user)
    expect(await screen.findByRole('heading', { level: 2, name: 'Another note is waiting' })).toBeInTheDocument()
    await waitFor(() => expect(saved().story.seenSceneIds).toEqual(['scene_faded-box']))
    expect(saved().progression).toEqual(v4.progression)
    expect(saved().discoveredRecipes).toEqual(v4.discoveredRecipes)
  })
})

describe('secret clues from the story', () => {
  it('appear only through the story, stay vague, and never give the secret away until it’s baked', async () => {
    const user = userEvent.setup()
    const start = makeSave({ settings: still, story: seen('faded-box'), discoveredRecipes: FOUR })
    startAt(start, '#/recipe-book/notes')
    await openNotes()
    expect(screen.queryByText(/winter fair/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    await readToEnd(user)
    const clue = await screen.findByRole('article', { name: 'A scrap tucked behind a divider' })
    expect(clue).toHaveTextContent(/little snowballs/)
    expect(clue).not.toHaveTextContent(/Snowball\b(?!s)/)
    expect(screen.queryByText(/Found it/)).not.toBeInTheDocument()

    // Reading the clue found nothing: the Recipe Book still has no secret in it.
    window.location.hash = '#/recipe-book'
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
    expect(screen.queryByText(/Snowball/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Secrets found/)).not.toBeInTheDocument()

    // Baked the ordinary way, the secret is found, and Marmalade pencils it beside the clue.
    window.location.hash = '#/bake'
    await bake(user, ['Coconut', 'Sugar', 'Egg', 'White chocolate'])
    await screen.findByRole('heading', { level: 2, name: 'Secret recipe discovered: Snowball' })
    window.location.hash = '#/recipe-book/notes'
    await openNotes()
    expect(screen.getByRole('article', { name: 'A scrap tucked behind a divider' })).toHaveTextContent('Marmalade pencilled beside it: “Found it. Snowball.”')
  })
})
