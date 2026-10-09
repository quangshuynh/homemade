import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { SoundPlayerContext } from '../audio/soundContext'
import type { RecipeId, StorySceneId } from '../domain/ids'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeSave, makeV5Save } from '../test/fixtures'

type User = ReturnType<typeof userEvent.setup>

const still = { soundEnabled: true, motion: 'reduced' } as const
const found = (...ids: string[]) => ids.map((id) => ({ recipeId: id as RecipeId, discoveredAt: '2026-09-01T10:00:00.000Z' }))
const ARC = ['faded-box', 'margins', 'margins-spice', 'second-shelf', 'hidden-recipes', 'last-card']
const seen = (...slugs: string[]) => ({ seenSceneIds: slugs.map((slug) => `scene_${slug}` as StorySceneId) })
const NO_DECOR = { ownedDecorationIds: [], equippedBySlot: {}, noticedMomentIds: [] }

/** A late kitchen that has read Chapter 5 (the cupboard is open) and, optionally, the cupboard's own scene. */
function finished(overrides: Partial<GameSave> = {}, { cupboardRead = true } = {}): GameSave {
  return makeSave({
    discoveredRecipes: found('recipe_shortbread', 'recipe_millionaires-shortbread'),
    progression: { crumbs: 100, xp: 2000 },
    story: seen(...ARC, ...(cupboardRead ? ['old-cupboard'] : [])),
    settings: still,
    ...overrides,
  })
}

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

const openDecorating = () => screen.findByRole('heading', { level: 1, name: 'Make it yours' })
const spots = () => screen.getByRole('group', { name: 'Spots on the wall and the back of the counter' })
const spot = (name: RegExp) => within(spots()).getByRole('button', { name })
const chooser = () => screen.getByRole('region', { name: /Choosing for/ })
const piece = (name: string | RegExp) => within(chooser()).getByRole('button', { name })
/** The screen's polite status line (Marmalade's remark has a live region of its own). */
const announcement = () => document.querySelector('.decorate > [role="status"]')!

async function putOut(user: User, spotName: RegExp, pieceName: string) {
  await user.click(spot(spotName))
  await user.click(piece(new RegExp(`^${pieceName}`)))
  await user.click(within(chooser()).getByRole('button', { name: new RegExp(`^Put out the ${pieceName.toLowerCase()}`) }))
}

describe('the old cupboard in the kitchen', () => {
  it('is just locked doors, with no way in, until Chapter 5 is finished', async () => {
    startAt(makeSave({ settings: still, story: seen(...ARC.slice(0, -1)) }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.queryByRole('link', { name: /old cupboard/i })).not.toBeInTheDocument()
  })

  it('opens for a kitchen that had already finished Chapter 5, with what it earned waiting inside', async () => {
    // An Interval 7 save: read the whole arc, found the first Mythic and a Legendary.
    const v5 = makeV5Save({
      discoveredRecipes: found('recipe_shortbread', 'recipe_honey-flapjack', 'recipe_millionaires-shortbread'),
      story: seen(...ARC),
      settings: still,
    })
    const { saved } = startAt(v5)
    const tag = await screen.findByRole('link', { name: /The old cupboard.*The brass key fits/ })
    expect(tag).toHaveAttribute('href', '#/decorate')
    // Granted on the first look after loading, and written straight away. Nothing put out, nothing replayed.
    await waitFor(() => expect(saved().decorating.ownedDecorationIds).toContain('decoration_gingham-towel'))
    expect(saved().decorating.ownedDecorationIds).toEqual(expect.arrayContaining(['decoration_gold-seal-frame', 'decoration_little-lemon-tree']))
    expect(saved().decorating.equippedBySlot).toEqual({})
    expect(saved().story).toEqual(v5.story)
  })

  it('says it’s locked if the decorating page is reached before then', async () => {
    startAt(makeSave({ settings: still }), '#/decorate')
    await screen.findByRole('heading', { level: 1, name: 'The old cupboard' })
    expect(screen.getByText('It’s locked. Whatever’s inside will keep.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Spots/ })).not.toBeInTheDocument()
  })
})

describe('opening the cupboard for the first time', () => {
  it('reads what’s inside with Marmalade, then opens the cupboard; skipping costs nothing', async () => {
    const user = userEvent.setup()
    const { played, saved } = startAt(finished({}, { cupboardRead: false }), '#/decorate')
    await screen.findByRole('heading', { level: 1, name: 'The old cupboard' })
    expect(screen.getByRole('heading', { name: 'Chapter 6: The Old Cupboard' })).toBeInTheDocument()
    expect(screen.getByText(/“Not yet,” said the tag/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Skip this scene' }))
    await openDecorating()
    expect(screen.getByText(/The cupboard’s open, and everything in it is yours to put out/).closest('div')).toHaveFocus()
    expect(played).toContain('decor-open')
    expect(saved().story.seenSceneIds).toContain('scene_old-cupboard')
  })

  it('goes straight to the cupboard once the scene has been read, in the kitchen or the notes', async () => {
    startAt(finished(), '#/decorate')
    await openDecorating()
    expect(screen.queryByRole('heading', { name: /Chapter 6/ })).not.toBeInTheDocument()
  })
})

describe('edit mode', () => {
  it('shows every spot as a button over the kitchen, with one chosen at a time', async () => {
    const user = userEvent.setup()
    startAt(finished(), '#/decorate')
    await openDecorating()
    const buttons = within(spots()).getAllByRole('button')
    expect(buttons.map((button) => button.textContent?.split(':')[0])).toEqual(['Wall', 'Window', 'Shelf', 'Counter, left', 'Plant', 'Counter, right'])
    expect(screen.getByRole('group', { name: 'Spot on the cupboard door' })).toBeInTheDocument()
    expect(spot(/^Wall/)).toHaveAttribute('aria-pressed', 'true')

    await user.click(spot(/^Window/))
    expect(spot(/^Window/)).toHaveAttribute('aria-pressed', 'true')
    expect(spot(/^Wall/)).toHaveAttribute('aria-pressed', 'false')
    expect(within(chooser()).getByRole('heading', { level: 2 })).toHaveTextContent('Choosing for Window')
    expect(announcement()).toHaveTextContent('Choosing for the window. 1 thing in your cupboard fits here.')
  })

  it('tries a piece in its spot without saving anything, then puts it out in one write', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(finished(), '#/decorate')
    await openDecorating()
    const before = saved().updatedAt

    await user.click(piece(/^Framed recipe card/))
    expect(piece(/^Framed recipe card/)).toHaveAttribute('aria-pressed', 'true')
    expect(spot(/^Wall/)).toHaveAccessibleName('Wall: Framed recipe card, trying it here')
    expect(screen.getByText('Trying it', { selector: '.scene-spot__preview' })).toBeInTheDocument()
    expect(saved().decorating.equippedBySlot).toEqual({})
    expect(saved().updatedAt).toBe(before)

    await user.click(within(chooser()).getByRole('button', { name: 'Put out the framed recipe card' }))
    await waitFor(() => expect(saved().decorating.equippedBySlot).toEqual({ wall: 'decoration_framed-recipe-card' }))
    expect(within(chooser()).getByText('Out now: Framed recipe card')).toBeInTheDocument()
    expect(spot(/^Wall/)).toHaveAccessibleName('Wall: Framed recipe card')
    expect(played).toContain('decor-equip')
  })

  it('swaps and clears a spot, keeping everything owned', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(finished(), '#/decorate')
    await openDecorating()
    await putOut(user, /^Wall/, 'Framed recipe card')
    await putOut(user, /^Wall/, 'The gold seal, framed')
    await waitFor(() => expect(saved().decorating.equippedBySlot).toEqual({ wall: 'decoration_gold-seal-frame' }))
    expect(announcement()).toHaveTextContent('The framed recipe card went back in the cupboard.')

    await user.click(within(chooser()).getByRole('button', { name: 'Clear this spot' }))
    await waitFor(() => expect(saved().decorating.equippedBySlot).toEqual({}))
    expect(within(chooser()).getByText('Nothing out here.')).toBeInTheDocument()
    expect(saved().decorating.ownedDecorationIds).toEqual(expect.arrayContaining(['decoration_framed-recipe-card', 'decoration_gold-seal-frame']))
    // Clearing an empty spot says why it can't, rather than doing nothing silently.
    expect(within(chooser()).getByRole('button', { name: 'Clear this spot' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(chooser()).getByRole('button', { name: 'Clear this spot' })).toHaveAccessibleDescription('Nothing’s out here to clear.')
  })

  it('shows what’s out in the real kitchen, and reads it out', async () => {
    const user = userEvent.setup()
    startAt(finished(), '#/decorate')
    await openDecorating()
    await putOut(user, /^Window/, 'Café curtains')
    await putOut(user, /^Plant/, 'Potted thyme')
    await user.click(screen.getByRole('link', { name: 'Done' }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(screen.getByText('Out in your kitchen: Café curtains, Potted thyme.')).toBeInTheDocument()
    expect(document.querySelector('.kitchen-wall [data-slot="window"]')).toHaveAttribute('data-filled')
    expect(document.querySelector('.kitchen-wall [data-slot="wall"]')).not.toHaveAttribute('data-filled')
    // The counter objects are still the same links, in the same order.
    expect(within(screen.getByRole('list', { name: 'On the counter' })).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#/recipe-book',
      '#/bake',
      '#/pantry',
    ])
    expect(screen.getByRole('link', { name: /The old cupboard.*Make it yours/ })).toBeInTheDocument()
  })

  it('works with a keyboard alone: Tab to a spot, Enter, Tab to a piece, Space, Tab to put it out', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(finished(), '#/decorate')
    await openDecorating()
    const towel = within(screen.getByRole('group', { name: 'Spot on the cupboard door' })).getByRole('button')
    while (document.activeElement !== towel) await user.tab()
    await user.keyboard('{Enter}')
    expect(towel).toHaveAttribute('aria-pressed', 'true')
    while (document.activeElement !== piece(/^Gingham tea towel/)) await user.tab()
    await user.keyboard(' ')
    const put = within(chooser()).getByRole('button', { name: 'Put out the gingham tea towel' })
    while (document.activeElement !== put) await user.tab()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(saved().decorating.equippedBySlot).toEqual({ textile: 'decoration_gingham-towel' }))
    // Focus stays where the player is: the button is still there to press again.
    expect(put).toHaveFocus()
  })

  it('never needs dragging: every control is a button or a link', async () => {
    startAt(finished(), '#/decorate')
    await openDecorating()
    expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0)
    for (const element of document.querySelectorAll('.scene-spot__button, .cupboard-piece')) expect(element.tagName).toBe('BUTTON')
  })
})

describe('Marmalade and decorating', () => {
  it('says something about the first thing put out, then nothing for the next', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(finished(), '#/decorate')
    await openDecorating()
    await putOut(user, /^Wall/, 'Framed recipe card')
    expect(within(chooser()).getByText(/Oh, that looks like it’s always been there\./)).toBeInTheDocument()
    await waitFor(() => expect(saved().decorating.noticedMomentIds).toEqual(['first-equip']))
    await putOut(user, /^Plant/, 'Potted thyme')
    expect(within(chooser()).queryByText(/Marmalade/)).not.toBeInTheDocument()
  })

  it('notices a whole set out together, once', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(finished(), '#/decorate')
    await openDecorating()
    await putOut(user, /^Wall/, 'Framed recipe card')
    await putOut(user, /^Window/, 'Café curtains')
    await putOut(user, /^Counter, left/, 'Cream cookie jar')
    await user.click(within(screen.getByRole('group', { name: 'Spot on the cupboard door' })).getByRole('button'))
    await user.click(piece(/^Gingham tea towel/))
    await user.click(within(chooser()).getByRole('button', { name: 'Put out the gingham tea towel' }))
    expect(within(chooser()).getByText(/The whole Cottage set, out at once\./)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cottage' })).toHaveTextContent('4 of 4 out')
    await waitFor(() => expect(saved().decorating.noticedMomentIds).toEqual(['first-equip', 'first-set']))
  })
})

describe('buying with Crumbs', () => {
  it('asks first, then takes the Crumbs and hands the piece over in one write, ready to try', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(finished({ progression: { crumbs: 100, xp: 2000 } }), '#/decorate')
    await openDecorating()
    await user.click(spot(/^Counter, right/))
    await user.click(within(chooser()).getByRole('button', { name: 'Buy the copper utensil crock for 60 Crumbs' }))

    const dialog = await screen.findByRole('dialog', { name: 'Buy the copper utensil crock?' })
    expect(dialog).toHaveTextContent('It costs 60 Crumbs and stays in your cupboard for good. It’s just for looks: it won’t change any bake.')
    expect(dialog).toHaveTextContent('You’ll have 40 Crumbs left.')
    expect(within(dialog).getByRole('button', { name: 'Not now' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Buy it' }))

    await waitFor(() => expect(saved().progression).toEqual({ crumbs: 40, xp: 2000 }))
    expect(saved().decorating.ownedDecorationIds).toContain('decoration_copper-crock')
    expect(played).toContain('decor-unlock')
    // It's in the cupboard now, being tried in its spot, and focus is on it.
    expect(piece(/^Copper utensil crock/)).toHaveFocus()
    expect(piece(/^Copper utensil crock/)).toHaveAttribute('aria-pressed', 'true')
    expect(saved().decorating.equippedBySlot).toEqual({})
  })

  it('changes nothing when the player says not now, and says what’s short when they can’t afford it', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(finished({ progression: { crumbs: 50, xp: 2000 } }), '#/decorate')
    await openDecorating()
    await user.click(spot(/^Counter, right/))
    const copper = within(chooser()).getByRole('button', { name: 'Buy the copper utensil crock for 60 Crumbs' })
    expect(copper).toHaveAttribute('aria-disabled', 'true')
    expect(copper).toHaveAccessibleDescription('You need 10 more Crumbs. New recipes earn them.')
    await user.click(copper)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(spot(/^Wall/))
    await user.click(within(chooser()).getByRole('button', { name: 'Buy the botanical print for 50 Crumbs' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Not now' }))
    expect(saved().progression.crumbs).toBe(50)
    expect(saved().decorating.ownedDecorationIds).not.toContain('decoration_botanical-print')
  })

  it('never sells what’s earned: keepsakes say how they arrive instead', async () => {
    const user = userEvent.setup()
    startAt(finished(), '#/decorate')
    await openDecorating()
    await user.click(within(screen.getByRole('group', { name: 'Spot on the cupboard door' })).getByRole('button'))
    const later = within(chooser()).getByRole('heading', { name: 'Fruit-print towel' }).closest('li')!
    expect(later).toHaveTextContent('For finding every Fruity card.')
    expect(within(later).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('earning decorations by playing', () => {
  it('mentions a keepsake under the bake that earned it, and puts it in the cupboard, not the kitchen', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(finished({ discoveredRecipes: found('recipe_millionaires-shortbread') }), '#/bake')
    await screen.findByRole('heading', { name: 'From the shelf' })
    for (const name of ['Oats', 'Butter', 'Honey']) await user.click(screen.getByRole('button', { name }))
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    await user.click(screen.getByRole('button', { name: 'Bake it' }))
    const result = (await screen.findByRole('heading', { level: 2, name: /Honey Flapjack/ })).closest('section')!
    expect(within(result).getByText(/For your kitchen:/).closest('p')).toHaveTextContent('For your kitchen: something new in the old cupboard (little lemon tree).')
    expect(within(result).getByRole('link', { name: 'Open the cupboard' })).toHaveAttribute('href', '#/decorate')
    await waitFor(() => expect(played).toContain('decor-unlock'), { timeout: 3000 })
    expect(saved().decorating.ownedDecorationIds).toContain('decoration_little-lemon-tree')
    expect(saved().decorating.equippedBySlot).toEqual({})
  })

  it('says nothing about the cupboard for an ordinary bake, or before the cupboard is open', async () => {
    const user = userEvent.setup()
    startAt(makeSave({ settings: still, decorating: NO_DECOR }), '#/bake')
    await screen.findByRole('heading', { name: 'From the shelf' })
    for (const name of ['Oats', 'Butter', 'Honey']) await user.click(screen.getByRole('button', { name }))
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    await user.click(screen.getByRole('button', { name: 'Bake it' }))
    await screen.findByRole('heading', { level: 2, name: /Honey Flapjack/ })
    expect(screen.queryByText(/For your kitchen:/)).not.toBeInTheDocument()
  })
})

describe('the cupboard in the Recipe Box Notes', () => {
  it('waits there as the next note once Chapter 5 is read, and points back to the kitchen afterwards', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(finished({}, { cupboardRead: false }), '#/recipe-book/notes')
    await screen.findByRole('heading', { level: 1, name: 'Recipe Box Notes' })
    expect(screen.getByText('The brass key has been waiting for something.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Read it with Marmalade' }))
    while (!screen.queryByRole('button', { name: 'Put it back in the box' })) await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Put it back in the box' }))

    expect(screen.getByText(/That’s the end of The Old Cupboard\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Make it yours' })).toHaveAttribute('href', '#/decorate')
    expect(screen.getByText('Put away, not thrown away. For when the kitchen is lived in again.')).toBeInTheDocument()
    // It pays nothing: the cupboard is the reward, and it was already open.
    expect(saved().progression.crumbs).toBe(100)
  })
})
