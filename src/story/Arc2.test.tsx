import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { CueSchedulerContext } from '../audio/cues'
import { SoundPlayerContext } from '../audio/soundContext'
import type { DecorationId, RecipeId, StorySceneId } from '../domain/ids'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeSave } from '../test/fixtures'
import { immediateCues } from '../test/soundCues'
import { STORY_SCENES } from './chapters'
import { STORY_NOTES } from './notes'

/**
 * Arc 2 in the real app: an Interval 9 kitchen (save version 7, the current
 * one) picks the story up where it left off, reads the new chapters with a
 * keyboard, skips and replays them, and is paid once.
 */

type User = ReturnType<typeof userEvent.setup>

const still = { soundEnabled: true, motion: 'reduced' } as const
const DAY = '2026-11-01T10:00:00.000Z'
const found = (...slugs: string[]) => slugs.map((slug) => ({ recipeId: `recipe_${slug}` as RecipeId, discoveredAt: DAY }))
const ids = (arc: 1 | 2) => STORY_SCENES.filter((placed) => placed.chapter.arc === arc).map((placed) => placed.scene.id)
const ARC_1 = ids(1)
const ARC_2 = ids(2)
const TOWEL = 'decoration_gingham-towel' as DecorationId
const STARTER = ['gingham-towel', 'cream-cookie-jar', 'framed-recipe-card', 'cafe-curtains', 'potted-thyme', 'wooden-spoon-crock'].map(
  (slug) => `decoration_${slug}` as DecorationId,
)

/** An Interval 9 kitchen that finished the first arc. Optionally with the towel out, and further into Arc 2. */
function interval9({ towelOut = true, arc2Seen = 0, recipes = [] as string[], crumbs = 50 } = {}): GameSave {
  return makeSave({
    settings: still,
    discoveredRecipes: found('shortbread', 'millionaires-shortbread', ...recipes),
    progression: { crumbs, xp: 3000 },
    story: { seenSceneIds: [...ARC_1, ...ARC_2.slice(0, arc2Seen)] as StorySceneId[] },
    decorating: { ownedDecorationIds: [...STARTER], equippedBySlot: towelOut ? { textile: TOWEL } : {}, noticedMomentIds: ['first-equip'] },
    achievementIds: ['achievement_last-page', 'achievement_make-it-yours'] as never,
    // Sparse, as saves keep it: only recipes actually baked. R.'s windows three times, if it's been found.
    recipeBakeCounts: recipes.includes('lunchbox-window') ? { ['recipe_lunchbox-window' as RecipeId]: 3 } : {},
  })
}

function startAt(stored: unknown, hash = '#/') {
  const memory = createMemorySaveRepository(stored)
  const played: string[] = []
  const player: AudioPlayer = { play: (id) => played.push(id), stopAll: vi.fn() }
  window.location.hash = hash
  render(
    <SoundPlayerContext value={player}>
      <CueSchedulerContext value={immediateCues}>
        <GameProvider repository={memory.repository}>
          <App />
        </GameProvider>
      </CueSchedulerContext>
    </SoundPlayerContext>,
  )
  return { played, saved: () => memory.state.stored as GameSave }
}

const openNotes = () => screen.findByRole('heading', { level: 1, name: 'Recipe Box Notes' })
const arc2NoteTexts = STORY_NOTES.filter((note) => ARC_2.some((id) => STORY_SCENES.find((placed) => placed.scene.id === id)!.chapter.id === note.chapterId)).map(
  (note) => note.text,
)

async function readToEnd(user: User, finish = 'Put it back in the box') {
  while (!screen.queryByRole('button', { name: finish })) await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: finish }))
}

describe('an Interval 9 kitchen', () => {
  it('needs no migration: its save loads as it is, with the first arc, keepsakes and decorations untouched', async () => {
    const stored = interval9()
    expect(stored.version).toBe(CURRENT_SAVE_VERSION)
    expect(CURRENT_SAVE_VERSION).toBe(7)
    startAt(stored, '#/recipe-book/notes')
    await openNotes()
    // Every first-arc chapter is still there to replay; the second arc's first chapter waits as a slip.
    for (const name of ['The Faded Recipe Box', 'The Last Card', 'The Old Cupboard']) {
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(name) })).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { level: 2, name: 'A new note' })).toBeInTheDocument()
    expect(screen.getByText('Something shifted at the back of the old cupboard.')).toBeInTheDocument()
  })

  it('is told about the cupboard’s back board in the kitchen, in words', async () => {
    startAt(interval9())
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.getByRole('link', { name: /The old cupboard.*Something at the back/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Recipe Book.*A new note inside/ })).toBeInTheDocument()
  })

  it('keeps every Arc 2 title and note out of the page until it’s read', async () => {
    startAt(interval9(), '#/recipe-book/notes')
    await openNotes()
    // No chapter heading, number or title from the second arc. ("For M." is also the first arc's last card, so titles are checked as headings.)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent ?? '')
    for (const title of ['Behind the Cupboard', 'E.’s Handwriting', 'R.’s Lunchbox', 'The Photograph', 'For M.']) {
      expect(headings.some((heading) => heading.endsWith(title)), title).toBe(false)
    }
    for (const n of [7, 8, 9, 10, 11]) expect(screen.queryByText(`Chapter ${n}`)).not.toBeInTheDocument()
    for (const text of arc2NoteTexts) expect(document.body.textContent).not.toContain(text)
  })
})

describe('Chapter 7', () => {
  it('opens from the decorating screen the moment something is first put out, said once under it', async () => {
    const user = userEvent.setup()
    startAt(interval9({ towelOut: false }), '#/decorate')
    await screen.findByRole('heading', { level: 1, name: 'Make it yours' })
    const spots = screen.getByRole('group', { name: 'Spots on the wall and the back of the counter' })
    await user.click(within(spots).getByRole('button', { name: /^Window/ }))
    const chooser = screen.getByRole('region', { name: /Choosing for/ })
    await user.click(within(chooser).getByRole('button', { name: /^Café curtains/ }))
    await user.click(within(chooser).getByRole('button', { name: /^Put out the café curtains/ }))
    expect(await within(chooser).findByText(/Something shifted at the back of the old cupboard/)).toBeInTheDocument()
    expect(within(chooser).getByRole('link', { name: 'Open the Recipe Box Notes' })).toBeInTheDocument()
  })

  it('reads by keyboard alone, files its notes under a chapter heading, and pays its small reward once', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(interval9(), '#/recipe-book/notes')
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    const scene = screen.getByRole('region', { name: 'Chapter 7: Behind the Cupboard' })
    // Each line takes focus; Next is reached and pressed from the keyboard.
    expect(within(scene).getByText(/The back board isn’t nailed/)).toHaveFocus()
    while (!within(scene).queryByRole('button', { name: 'Put it back in the box' })) {
      await user.tab()
      expect(document.activeElement).toHaveAccessibleName('Next')
      await user.keyboard('{Enter}')
      expect(document.activeElement?.tagName).toBe('P')
    }
    await user.click(within(scene).getByRole('button', { name: 'Put it back in the box' }))

    await waitFor(() => expect(saved().story.seenSceneIds).toContain('scene_behind-cupboard'))
    expect(saved().progression.crumbs).toBe(60)
    expect(played).toContain('story-note')
    expect(screen.getByText(/Tucked between the cards: 10 Crumbs/)).toBeInTheDocument()
    const chapter = screen.getByRole('region', { name: 'Chapter 7 Behind the Cupboard' })
    expect(within(chapter).getByRole('heading', { level: 3, name: 'Pencilled on the cupboard’s back board' })).toBeInTheDocument()
    expect(within(chapter).getByRole('heading', { level: 3, name: 'On top, inside a flat biscuit tin' })).toBeInTheDocument()
    // The next chapter isn't in the page at all.
    expect(screen.queryByText(/E\.’s Handwriting/)).not.toBeInTheDocument()
  })

  it('can be skipped, losing nothing, and replayed without paying again', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(interval9(), '#/recipe-book/notes')
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    await user.click(screen.getByRole('button', { name: 'Skip this scene' }))
    await waitFor(() => expect(saved().progression.crumbs).toBe(60))
    expect(screen.getByText(/Skipped\. Whatever was found is filed below/)).toBeInTheDocument()
    expect(screen.getByText(STORY_NOTES.find((note) => note.id === 'note_tin-card')!.text)).toBeInTheDocument()

    const before = saved()
    const soundsBefore = played.length
    await user.click(screen.getByRole('button', { name: 'Replay chapter 7, Behind the Cupboard, with Marmalade' }))
    expect(screen.getByRole('region', { name: 'Chapter 7: Behind the Cupboard (replay)' })).toBeInTheDocument()
    await readToEnd(user, 'Close')
    expect(saved()).toBe(before)
    expect(played.slice(soundsBefore).filter((id) => id === 'story-note' || id === 'arc-complete')).toEqual([])
  })
})

describe('the photograph', () => {
  it('is drawn as a photograph, with its words as a real heading and text, and Marmalade’s wistful face', async () => {
    const user = userEvent.setup()
    startAt(interval9({ arc2Seen: 3, recipes: ['edies-oat-crisp', 'lunchbox-window'] }), '#/recipe-book/notes')
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    const scene = screen.getByRole('region', { name: 'Chapter 10: The Photograph' })
    await user.click(within(scene).getByRole('button', { name: 'Next' }))
    expect(document.querySelector('.mascot--wistful')).not.toBeNull()
    await readToEnd(user)
    const chapter = screen.getByRole('region', { name: 'Chapter 10 The Photograph' })
    const photo = within(chapter).getByRole('article', { name: 'A small square photograph, curled at the edges' })
    expect(photo).toHaveAttribute('data-kind', 'photo')
    expect(photo).toHaveTextContent('One corner is torn off.')
  })
})

describe('For M.', () => {
  it('ends the arc with its own sound, the keepsake and the framed photograph, once', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(interval9({ arc2Seen: 4, recipes: ['edies-oat-crisp', 'lunchbox-window', 'fair-day-parkin'] }), '#/recipe-book/notes')
    await openNotes()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    expect(screen.getByRole('region', { name: 'Chapter 11: For M.' })).toBeInTheDocument()
    await readToEnd(user)

    await waitFor(() => expect(saved().story.seenSceneIds).toContain('scene_for-m'))
    expect(played).toContain('arc-complete')
    expect(played).not.toContain('story-note')
    expect(screen.getByText(/That’s the end of For M\./)).toBeInTheDocument()
    expect(screen.getByText(/The tin is empty now, all but the letter/)).toBeInTheDocument()
    expect(screen.getByText('Kept in the Tin')).toBeInTheDocument()
    expect(saved().achievementIds.filter((id) => id === 'achievement_kept-in-the-tin')).toHaveLength(1)
    expect(saved().decorating.ownedDecorationIds.filter((id) => id === 'decoration_fair-day-photograph')).toHaveLength(1)
    // Nothing is left waiting, and the faded-box line has gone: the story so far is all read.
    expect(screen.queryByRole('button', { name: 'Read it with Marmalade' })).not.toBeInTheDocument()
    expect(screen.queryByText(/still too faded to read/)).not.toBeInTheDocument()

    const after = saved()
    await user.click(screen.getByRole('button', { name: 'Replay chapter 11, For M., with Marmalade' }))
    await readToEnd(user, 'Close')
    expect(saved()).toBe(after)
  })
})

describe('the story’s keepsake and decoration', () => {
  it('stay out of the keepsake box and the cupboard until earned, then show like any other', async () => {
    const user = userEvent.setup()
    startAt(interval9(), '#/recipe-book/keepsakes')
    await screen.findByRole('heading', { level: 1, name: 'Kitchen Keepsakes' })
    expect(screen.queryByText('Kept in the Tin')).not.toBeInTheDocument()
    expect(screen.getByText('The Last Page')).toBeInTheDocument()

    window.location.hash = '#/decorate'
    await screen.findByRole('heading', { level: 1, name: 'Make it yours' })
    const spots = screen.getByRole('group', { name: 'Spots on the wall and the back of the counter' })
    await user.click(within(spots).getByRole('button', { name: /^Wall/ }))
    expect(screen.queryByText('Fair-day photograph')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/torn corner/)
  })

  it('puts the framed photograph in the cupboard for a kitchen that finished Arc 2, ready to hang', async () => {
    const user = userEvent.setup()
    startAt(
      { ...interval9({ arc2Seen: 5, recipes: ['edies-oat-crisp', 'lunchbox-window', 'fair-day-parkin'] }), achievementIds: ['achievement_last-page'] },
      '#/decorate',
    )
    await screen.findByRole('heading', { level: 1, name: 'Make it yours' })
    const spots = screen.getByRole('group', { name: 'Spots on the wall and the back of the counter' })
    await user.click(within(spots).getByRole('button', { name: /^Wall/ }))
    const chooser = screen.getByRole('region', { name: /Choosing for/ })
    await user.click(within(chooser).getByRole('button', { name: /^Fair-day photograph/ }))
    await user.click(within(chooser).getByRole('button', { name: /^Put out the fair-day photograph/ }))
    await waitFor(() => expect(document.querySelector('.kitchen-wall [data-slot="wall"]')).toHaveAttribute('data-filled'))
  })
})
