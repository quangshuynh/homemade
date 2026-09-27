import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import type { SaveRepository } from '../persistence/repository'
import { makeSave } from '../test/fixtures'
import { App } from './App'
import { GameProvider } from './GameProvider'

function renderGame(repository: SaveRepository) {
  return render(
    <GameProvider repository={repository}>
      <App />
    </GameProvider>,
  )
}

async function fillOnboarding(user: ReturnType<typeof userEvent.setup>, name: string, kitchen: string) {
  await user.type(await screen.findByLabelText('What should the kitchen call you?'), name)
  await user.type(screen.getByLabelText('What’s your kitchen called?'), kitchen)
  await user.click(screen.getByRole('button', { name: 'Open the kitchen' }))
}

describe('first launch', () => {
  it('asks for names, saves them, and opens the kitchen', async () => {
    const user = userEvent.setup()
    const { repository, state } = createMemorySaveRepository()
    renderGame(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'A new kitchen' })).toBeInTheDocument()
    await fillOnboarding(user, '  Robin ', 'The Crumb Corner')

    const heading = await screen.findByRole('heading', { level: 1, name: 'The Crumb Corner' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText(/Robin\./)).toBeInTheDocument()
    expect(state.stored).toMatchObject({
      version: CURRENT_SAVE_VERSION,
      profile: { name: 'Robin', bakeryName: 'The Crumb Corner' },
    })
  })

  it('explains what is missing instead of saving blank names', async () => {
    const user = userEvent.setup()
    const { repository, state } = createMemorySaveRepository()
    renderGame(repository)

    await user.click(await screen.findByRole('button', { name: 'Open the kitchen' }))

    const nameInput = screen.getByLabelText('What should the kitchen call you?')
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveAccessibleDescription(/Write down a name/)
    expect(screen.getByLabelText('What’s your kitchen called?')).toHaveAttribute('aria-invalid', 'true')
    expect(state.stored).toBeUndefined()
  })
})

describe('returning player', () => {
  it('skips onboarding and restores the saved kitchen', async () => {
    const { repository } = createMemorySaveRepository(makeSave())
    renderGame(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })).toBeInTheDocument()
    expect(screen.getByText(/Robin\./)).toBeInTheDocument()
    expect(screen.queryByText('A new kitchen')).not.toBeInTheDocument()
  })

  it('keeps the names across a full reload of the game', async () => {
    const user = userEvent.setup()
    const { repository } = createMemorySaveRepository()
    const first = renderGame(repository)
    await fillOnboarding(user, 'Sam', 'Oven Mitts')
    await screen.findByRole('heading', { level: 1, name: 'Oven Mitts' })
    first.unmount()

    renderGame(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'Oven Mitts' })).toBeInTheDocument()
    expect(screen.getByText(/Sam\./)).toBeInTheDocument()
  })
})

describe('navigation', () => {
  it('reaches every part of the kitchen from the tabs and focuses the new screen', async () => {
    const user = userEvent.setup()
    const { repository } = createMemorySaveRepository(makeSave())
    renderGame(repository)
    const nav = await screen.findByRole('navigation', { name: 'Kitchen' })

    for (const place of ['Bake', 'Recipe Book', 'Pantry', 'Settings', 'Kitchen']) {
      await user.click(within(nav).getByRole('link', { name: place }))
      const heading = await screen.findByRole('heading', { level: 1 })
      await waitFor(() => expect(heading).toHaveFocus())
      expect(within(nav).getByRole('link', { name: place })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('makes Bake the main thing on the counter', async () => {
    const user = userEvent.setup()
    const { repository } = createMemorySaveRepository(makeSave())
    renderGame(repository)

    const counter = await screen.findByRole('list', { name: 'On the counter' })
    await user.click(within(counter).getByRole('link', { name: /Bake/ }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Bake' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'From the shelf' })).toBeInTheDocument()
  })
})

describe('settings', () => {
  it('persists preferences', async () => {
    const user = userEvent.setup()
    const { repository, state } = createMemorySaveRepository(makeSave())
    window.location.hash = '#/settings'
    renderGame(repository)

    await user.click(await screen.findByRole('checkbox', { name: 'Play sounds' }))
    await user.click(screen.getByRole('radio', { name: /Keep things still/ }))

    await waitFor(() => expect(state.stored).toMatchObject({ settings: { soundEnabled: false, motion: 'reduced' } }))
    expect(document.documentElement.dataset.motion).toBe('reduced')
  })

  it('only resets after the player confirms', async () => {
    const user = userEvent.setup()
    const { repository, state } = createMemorySaveRepository(makeSave())
    window.location.hash = '#/settings'
    renderGame(repository)

    await user.click(await screen.findByRole('button', { name: 'Start over…' }))
    const dialog = screen.getByRole('dialog', { name: 'Start over from scratch?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep my kitchen' }))
    expect(state.stored).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Start over…' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear my kitchen' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'A new kitchen' })).toBeInTheDocument()
    expect(state.stored).toBeUndefined()
  })
})

describe('saves that cannot be read', () => {
  it('explains the problem and does not throw the save away', async () => {
    const future = { ...makeSave(), version: CURRENT_SAVE_VERSION + 1 }
    const { repository, state } = createMemorySaveRepository(future)
    renderGame(repository)

    expect(await screen.findByRole('heading', { level: 1, name: 'Your kitchen couldn’t be opened' })).toBeInTheDocument()
    expect(screen.getByText(/newer version of Homemade/)).toBeInTheDocument()
    expect(state.stored).toEqual(future)
  })

  it('archives the old save when the player chooses to start over', async () => {
    const user = userEvent.setup()
    const damaged = { version: CURRENT_SAVE_VERSION, profile: null }
    const { repository, state } = createMemorySaveRepository(damaged)
    renderGame(repository)

    await user.click(await screen.findByRole('button', { name: 'Set it aside and start over…' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Set aside and start over' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'A new kitchen' })).toBeInTheDocument()
    expect(state.archive.map((entry) => entry.data)).toEqual([damaged])
  })

  it('tells the player when storage is unavailable', async () => {
    const broken: SaveRepository = {
      load: () => Promise.reject(new Error('The operation is insecure.')),
      write: () => Promise.reject(new Error('nope')),
      clear: () => Promise.resolve(),
      archiveAndClear: () => Promise.resolve(),
      replace: () => Promise.reject(new Error('nope')),
    }
    renderGame(broken)

    expect(await screen.findByRole('heading', { level: 1, name: 'This browser won’t let the kitchen save' })).toBeInTheDocument()
  })
})
