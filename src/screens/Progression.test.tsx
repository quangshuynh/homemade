import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { SoundPlayerContext } from '../audio/soundContext'
import { CHOCOLATE_CHIPS } from '../domain/ingredients'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeNewKitchen, makeSave } from '../test/fixtures'

type User = ReturnType<typeof userEvent.setup>

/** A new Interval 5 kitchen that has already skipped the tutorial: starter pantry, nothing earned. */
const fresh = (overrides: Partial<GameSave> = {}) =>
  makeNewKitchen({ tutorial: { completed: false, skipped: true }, settings: { soundEnabled: true, motion: 'reduced' }, ...overrides })

function startAt(hash: string, save: GameSave) {
  const memory = createMemorySaveRepository(save)
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

async function bake(user: User, names: string[]) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of names) await user.click(screen.getByRole('button', { name }))
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
}

const plaque = () => screen.getByRole('group', { name: 'Your baking progress' })

describe('progress on the counter', () => {
  it('shows Baker Level, XP and Crumbs in the kitchen, in words', async () => {
    startAt('#/', fresh({ progression: { crumbs: 45, xp: 140 } }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(within(plaque()).getByText('Baker Level 3')).toBeInTheDocument()
    expect(plaque()).toHaveTextContent('140 / 170 XP towards Baker Level 4')
    expect(plaque()).toHaveTextContent('45 Crumbs')
  })

  it('says when the top level is reached rather than showing a target that doesn’t exist', async () => {
    startAt('#/', fresh({ progression: { crumbs: 0, xp: 1200 } }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(plaque()).toHaveTextContent('Baker Level 11')
    expect(plaque()).toHaveTextContent('1200 XP · top level for now (of 11)')
  })
})

describe('the discovery reveal', () => {
  it('shows the rarity and what a first discovery earned, and reads it out', async () => {
    const user = userEvent.setup()
    const { saved } = startAt('#/bake', fresh())
    await bake(user, ['Flour', 'Sugar', 'Butter'])

    const result = (await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Shortbread' })).closest('section')!
    expect(within(result).getByText('Common')).toBeInTheDocument()
    expect(result).toHaveTextContent('+15 Crumbs · +20 XP')
    expect(screen.getByRole('status')).toHaveTextContent('Common recipe. Earned 15 Crumbs and 20 XP.')
    // Marmalade only speaks up for the very first card.
    expect(within(result).getByText(/Your first card, back in the book/)).toBeInTheDocument()
    await waitFor(() => expect(saved().progression).toEqual({ crumbs: 15, xp: 20 }))
  })

  it('earns nothing, and says nothing extra, for a rebake or an experiment', async () => {
    const user = userEvent.setup()
    const first = fresh()
    const { saved } = startAt('#/bake', { ...first, discoveredRecipes: [{ recipeId: 'recipe_shortbread' as never, discoveredAt: first.createdAt }] })
    await bake(user, ['Flour', 'Sugar', 'Butter'])

    const result = (await screen.findByRole('heading', { level: 2, name: 'Shortbread' })).closest('section')!
    expect(within(result).getByText('Common')).toBeInTheDocument()
    expect(within(result).queryByText(/Crumbs ·/)).not.toBeInTheDocument()
    expect(within(result).queryByText('Marmalade')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bake another batch' }))
    await bake(user, ['Flour', 'Vanilla'])
    const experiment = (await screen.findByRole('heading', { level: 2, name: 'Kitchen Experiment' })).closest('section')!
    expect(within(experiment).queryByText(/Crumbs/)).not.toBeInTheDocument()
    expect(within(experiment).queryByText('Common')).not.toBeInTheDocument()
    await waitFor(() => expect(saved().bakedCreations).toHaveLength(2))
    expect(saved().progression).toEqual({ crumbs: 0, xp: 0 })
  })

  it('celebrates a level-up once, naming what it opens up, with a sound after the chime', async () => {
    const user = userEvent.setup()
    const { played, saved } = startAt('#/bake', fresh({ progression: { crumbs: 0, xp: 30 } }))
    await bake(user, ['Flour', 'Sugar', 'Butter'])

    const result = (await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Shortbread' })).closest('section')!
    expect(within(result).getByText('Baker Level 2! Chocolate chips and cinnamon can go in the pantry now.')).toBeInTheDocument()
    expect(within(result).getByRole('link', { name: 'See what’s new in the Pantry' })).toHaveAttribute('href', '#/pantry')
    expect(within(result).getByText('A new level! Look at you go.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Baker Level 2!')
    await waitFor(() => expect(played).toEqual(expect.arrayContaining(['ding', 'discover-common', 'level-up'])), { timeout: 2500 })
    expect(played.indexOf('level-up')).toBeGreaterThan(played.indexOf('discover-common'))
    expect(saved().progression.xp).toBe(50)
  })

  it('plays the chime for the recipe’s rarity, and Marmalade notices a first Uncommon', async () => {
    const user = userEvent.setup()
    const { played } = startAt('#/bake', fresh({ progression: { crumbs: 0, xp: 0 } }))
    await bake(user, ['Flour', 'Sugar', 'Butter', 'Egg', 'Vanilla'])

    const result = (await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Vanilla Kiss' })).closest('section')!
    expect(result).toHaveAttribute('data-rarity', 'uncommon')
    expect(within(result).getByText('Uncommon')).toBeInTheDocument()
    expect(within(result).getByText('Uncommon! Now we’re getting somewhere.')).toBeInTheDocument()
    await waitFor(() => expect(played).toContain('discover-uncommon'))
  })
})

describe('pantry additions', () => {
  const additions = () => screen.getByRole('region', { name: 'Pantry additions' })
  const addButton = (name: string, crumbs: number) =>
    within(additions()).getByRole('button', { name: `Add ${name} to the pantry for ${crumbs} Crumbs` })

  it('shows what each locked ingredient needs, without spoiling any recipe', async () => {
    startAt('#/pantry', fresh())
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })

    const chips = within(additions()).getByRole('heading', { level: 3, name: 'Chocolate chips' }).closest('li')!
    expect(within(chips).getByRole('list', { name: 'What chocolate chips needs' })).toHaveTextContent('Baker Level 2')
    expect(chips).toHaveTextContent('20 Crumbs')
    expect(chips).not.toHaveTextContent(/cookie|recipe/i)
    // Only the five starter ingredients are on the shelves.
    expect(screen.getByRole('region', { name: 'Baking basics' })).toHaveTextContent('Flour')
    expect(within(additions()).getAllByRole('listitem').filter((item) => item.classList.contains('addition'))).toHaveLength(14)
  })

  it('explains, in words a screen reader reaches, why an addition isn’t possible yet', async () => {
    const user = userEvent.setup()
    startAt('#/pantry', fresh({ progression: { crumbs: 5, xp: 40 } }))
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })

    const chips = addButton('chocolate chips', 20)
    expect(chips).toHaveAttribute('aria-disabled', 'true')
    expect(chips).toHaveAccessibleDescription('You need 15 more Crumbs. New recipes earn them.')
    expect(addButton('oats', 25)).toHaveAccessibleDescription('Opens at Baker Level 3. You’re Level 2.')

    await user.click(chips)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds an ingredient for good after confirming: Crumbs once, onto the shelf, into the Bake shelf', async () => {
    const user = userEvent.setup()
    const { played, saved } = startAt('#/pantry', fresh({ progression: { crumbs: 50, xp: 40 } }))
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })

    await user.click(addButton('chocolate chips', 20))
    const dialog = await screen.findByRole('dialog', { name: 'Add chocolate chips to the pantry?' })
    expect(dialog).toHaveTextContent('It costs 20 Crumbs and stays on your shelf for good.')
    expect(dialog).toHaveTextContent('You’ll have 30 Crumbs left.')
    expect(within(dialog).getByRole('button', { name: 'Not yet' })).toHaveFocus()
    await user.click(within(dialog).getByRole('button', { name: 'Add it' }))

    const news = await screen.findByRole('generic', { name: 'Added chocolate chips to the pantry' })
    await waitFor(() => expect(news).toHaveFocus())
    expect(news).toHaveTextContent('Chocolate chips! Your first addition. The shelf’s starting to look like yours.')
    expect(news).toHaveTextContent('+10 XP')
    expect(played).toContain('ingredient-unlock')
    expect(screen.getByRole('region', { name: 'Flavourings' })).toHaveTextContent('Chocolate chips')
    expect(within(additions()).queryByRole('heading', { name: 'Chocolate chips' })).not.toBeInTheDocument()
    expect(plaque()).toHaveTextContent('30 Crumbs')

    await waitFor(() => expect(saved().pantryIngredientIds).toContain(CHOCOLATE_CHIPS))
    expect(saved().progression).toEqual({ crumbs: 30, xp: 50 })

    await user.click(screen.getByRole('link', { name: 'Take them to the bowl' }))
    expect(await screen.findByRole('button', { name: 'Chocolate chips' })).toBeInTheDocument()
  })

  it('changes nothing when the player says not yet', async () => {
    const user = userEvent.setup()
    const save = fresh({ progression: { crumbs: 50, xp: 40 } })
    const { saved } = startAt('#/pantry', save)
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })

    const add = addButton('cinnamon', 20)
    await user.click(add)
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Not yet' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(add).toHaveFocus())
    expect(saved()).toEqual(save)
  })

  it('announces a level-up that an addition’s XP brings', async () => {
    const user = userEvent.setup()
    const { played } = startAt('#/pantry', fresh({ progression: { crumbs: 50, xp: 95 } }))
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })
    await user.click(addButton('chocolate chips', 20))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Add it' }))

    const news = await screen.findByRole('generic', { name: 'Added chocolate chips to the pantry' })
    expect(news).toHaveTextContent('Baker Level 3! Strawberry jam, oats and cocoa powder can go in the pantry now.')
    await waitFor(() => expect(played).toContain('level-up'))
  })

  it('isn’t shown at all in a kitchen that already owns everything', async () => {
    startAt('#/pantry', makeSave())
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })
    expect(screen.queryByRole('region', { name: 'Pantry additions' })).not.toBeInTheDocument()
  })

  it('keeps locked ingredients off the Bake shelf and points to the Pantry', async () => {
    startAt('#/bake', fresh())
    await screen.findByRole('heading', { name: 'From the shelf' })
    expect(screen.queryByRole('button', { name: 'Chocolate chips' })).not.toBeInTheDocument()
    const shelf = screen.getByRole('region', { name: 'From the shelf' })
    expect(within(shelf).getByRole('link', { name: 'Pantry' })).toHaveAttribute('href', '#/pantry')
  })
})

describe('the Recipe Book', () => {
  it('stamps each found recipe with its rarity, and never shows rarity or ingredients for a blank card', async () => {
    const first = fresh()
    startAt('#/recipe-book', {
      ...first,
      discoveredRecipes: [{ recipeId: 'recipe_vanilla-kiss' as never, discoveredAt: first.createdAt }],
    })
    const card = (await screen.findByRole('heading', { level: 3, name: 'Vanilla Kiss' })).closest('li')!
    expect(within(card).getByText('Uncommon')).toBeInTheDocument()

    const blanks = screen.getAllByText('Not discovered yet').map((text) => text.closest('li')!)
    expect(blanks).toHaveLength(23)
    for (const blank of blanks) {
      expect(blank).not.toHaveTextContent(/common|rare|epic|legendary|mythic|peanut|honey|chocolate/i)
    }
    expect(screen.getByText(/cards faded to nothing/)).toBeInTheDocument()
  })
})
