import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeSave } from '../test/fixtures'

const CHOC_CHIP = ['Flour', 'Sugar', 'Butter', 'Egg', 'Chocolate chips']

function startAt(hash: string, save: GameSave = makeSave()) {
  const memory = createMemorySaveRepository(save)
  window.location.hash = hash
  render(
    <GameProvider repository={memory.repository}>
      <App />
    </GameProvider>,
  )
  return memory
}

/** Most flows run with motion reduced, which skips the oven pause; one test covers the full-motion path. */
const stillSave = () => makeSave({ settings: { soundEnabled: true, motion: 'reduced' } })

const jar = (name: string) => screen.getByRole('button', { name })

async function fillBowl(user: ReturnType<typeof userEvent.setup>, names: string[]) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of names) await user.click(jar(name))
}

async function mixAndBake(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
}

describe('choosing ingredients', () => {
  it('puts jars in the bowl and takes them out again, saying so without relying on colour', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stillSave())
    await fillBowl(user, ['Flour', 'Cocoa powder'])

    expect(jar('Flour')).toHaveAttribute('aria-pressed', 'true')
    expect(jar('Sugar')).toHaveAttribute('aria-pressed', 'false')
    const inBowl = screen.getByRole('list', { name: 'In the bowl' })
    expect(within(inBowl).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Flour×', 'Cocoa powder×'])
    expect(screen.getByRole('status')).toHaveTextContent('Added the cocoa powder. Room for 3 more.')

    await user.click(screen.getByRole('button', { name: 'Take the flour out' }))
    expect(jar('Flour')).toHaveAttribute('aria-pressed', 'false')

    await user.click(jar('Cocoa powder'))
    expect(jar('Cocoa powder')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('list', { name: 'In the bowl' })).not.toBeInTheDocument()
  })

  it('stops at five ingredients and explains why', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stillSave())
    await fillBowl(user, CHOC_CHIP)
    await user.click(jar('Vanilla'))

    expect(jar('Vanilla')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('The bowl is full')
    expect(within(screen.getByRole('list', { name: 'In the bowl' })).getAllByRole('listitem')).toHaveLength(5)
  })

  it('needs two ingredients before mixing', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stillSave())
    await fillBowl(user, ['Flour'])

    expect(screen.getByRole('button', { name: 'Mix' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mix' })).toHaveAccessibleDescription('Add at least 2 things to mix.')
  })

  it('un-mixes the bowl if you change what is in it', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stillSave())
    await fillBowl(user, ['Flour', 'Sugar'])
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    expect(screen.getByRole('button', { name: 'Bake it' })).toBeInTheDocument()

    await user.click(jar('Butter'))
    expect(screen.queryByRole('button', { name: 'Bake it' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mix' })).toBeEnabled()
  })
})

describe('baking', () => {
  it('bakes a known recipe, announces the discovery and writes it into the Recipe Book', async () => {
    const user = userEvent.setup()
    const { state } = startAt('#/bake', stillSave())
    await fillBowl(user, CHOC_CHIP)
    await mixAndBake(user)

    const heading = await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Chocolate Chip Cookie' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText('Copied into your Recipe Book, under Chocolate.')).toBeInTheDocument()
    expect((state.stored as GameSave).discoveredRecipes.map((entry) => entry.recipeId)).toEqual(['recipe_chocolate-chip'])

    await user.click(screen.getByRole('link', { name: 'Open the Recipe Book' }))
    expect(await screen.findByRole('heading', { level: 3, name: 'Chocolate Chip Cookie' })).toBeInTheDocument()
    expect(screen.getByText('1 of 24 recipes written down.')).toBeInTheDocument()
  })

  it('does not rediscover a recipe baked a second time', async () => {
    const user = userEvent.setup()
    const { state } = startAt('#/bake', stillSave())
    await fillBowl(user, CHOC_CHIP)
    await mixAndBake(user)
    await screen.findByRole('heading', { name: /New recipe discovered/ })
    const firstDate = (state.stored as GameSave).discoveredRecipes[0]?.discoveredAt

    await user.click(screen.getByRole('button', { name: 'Bake another batch' }))
    // A different order, same ingredients.
    await fillBowl(user, [...CHOC_CHIP].reverse())
    await mixAndBake(user)

    const heading = await screen.findByRole('heading', { level: 2, name: 'Chocolate Chip Cookie' })
    expect(heading).not.toHaveTextContent(/New recipe/)
    expect(screen.getByText('Already in your Recipe Book, under Chocolate.')).toBeInTheDocument()
    expect((state.stored as GameSave).discoveredRecipes).toEqual([{ recipeId: 'recipe_chocolate-chip', discoveredAt: firstDate }])
  })

  it('bakes an experiment from an unknown mix, without adding it to the Recipe Book', async () => {
    const user = userEvent.setup()
    const { state } = startAt('#/bake', stillSave())
    await fillBowl(user, ['Egg', 'Cinnamon'])
    await mixAndBake(user)

    expect(await screen.findByRole('heading', { level: 2, name: 'Kitchen Experiment' })).toBeInTheDocument()
    expect(screen.getByText(/Made with cinnamon and egg/)).toBeInTheDocument()
    expect((state.stored as GameSave).discoveredRecipes).toEqual([])

    await user.click(screen.getByRole('link', { name: 'Open the Recipe Book' }))
    expect(await screen.findByText('Nothing written down yet. Bake something and see.')).toBeInTheDocument()
  })

  it('shows the oven with full motion, then the result', async () => {
    const user = userEvent.setup()
    startAt('#/bake', makeSave({ settings: { soundEnabled: true, motion: 'full' } }))
    await fillBowl(user, ['Flour', 'Sugar', 'Butter'])
    await mixAndBake(user)

    expect(screen.getByText('In the oven…', { selector: '.hand-note' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: /Shortbread/ }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('skips the oven pause entirely with reduced motion', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stillSave())
    await fillBowl(user, ['Flour', 'Sugar', 'Butter'])
    await mixAndBake(user)

    expect(screen.queryByText('In the oven…', { selector: '.hand-note' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Shortbread/ })).toBeInTheDocument()
  })

  it('can be played start to finish with the keyboard alone', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stillSave())
    await screen.findByRole('heading', { name: 'From the shelf' })

    // Flour, Sugar and Butter are the first three jars on the shelf.
    jar('Flour').focus()
    await user.keyboard('{Enter}')
    await user.tab()
    await user.keyboard(' ')
    await user.tab()
    await user.keyboard('{Enter}')
    expect(jar('Butter')).toHaveAttribute('aria-pressed', 'true')

    screen.getByRole('button', { name: 'Mix' }).focus()
    await user.keyboard('{Enter}')
    // Mixing swaps Mix for "Bake it" in the same place.
    screen.getByRole('button', { name: 'Bake it' }).focus()
    await user.keyboard('{Enter}')

    const heading = await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Shortbread' })
    await waitFor(() => expect(heading).toHaveFocus())
    await user.tab()
    expect(screen.getByRole('button', { name: 'Bake another batch' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('heading', { name: 'From the shelf' })).toBeInTheDocument()
  })
})

describe('recipe book', () => {
  it('keeps undiscovered recipes blank, with no names or ingredients', async () => {
    startAt('#/recipe-book', stillSave())
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })

    // Every recipe that isn't a secret has a blank card; secrets have nothing at all.
    expect(screen.getAllByText('Not discovered yet')).toHaveLength(24)
    expect(screen.queryByText(/Shortbread|Snickerdoodle|Chocolate Chip/)).not.toBeInTheDocument()
    expect(screen.queryByText('Ingredients')).not.toBeInTheDocument()
  })

  it('shows what a returning player has already discovered', async () => {
    startAt(
      '#/recipe-book',
      makeSave({ discoveredRecipes: [{ recipeId: 'recipe_snickerdoodle' as never, discoveredAt: '2026-04-01T12:00:00.000Z' }] }),
    )
    const card = (await screen.findByRole('heading', { level: 3, name: 'Snickerdoodle' })).closest('article')!
    expect(within(card).getByRole('list')).toHaveTextContent('FlourSugarButterEggCinnamon')
    expect(screen.getAllByText('Not discovered yet')).toHaveLength(23)
  })
})

describe('pantry', () => {
  it('lists every ingredient on the shelves with its description', async () => {
    startAt('#/pantry')
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })

    expect(screen.getByRole('heading', { level: 2, name: 'Baking basics' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(19)
    expect(screen.getByText('Plain white flour. Holds everything else together.')).toBeInTheDocument()
  })
})
