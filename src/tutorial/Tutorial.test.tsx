import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { SoundPlayerContext } from '../audio/soundContext'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeNewKitchen, makeSave, makeV3Save } from '../test/fixtures'

type User = ReturnType<typeof userEvent.setup>

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
  return { ...memory, played, saved: () => memory.state.stored as GameSave }
}

const stillKitchen = (overrides: Partial<GameSave> = {}) => makeNewKitchen({ settings: { soundEnabled: true, motion: 'reduced' }, ...overrides })
const guide = () => screen.getByRole('complementary', { name: 'Tutorial' })
const queryGuide = () => screen.queryByRole('complementary', { name: 'Tutorial' })
const card = (n: number) => within(guide()).getByText(`Card ${n} of 9`)

async function next(user: User, name: string) {
  await user.click(within(guide()).getByRole('button', { name }))
}

async function pickShortbread(user: User) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of ['Flour', 'Sugar', 'Butter']) await user.click(screen.getByRole('button', { name }))
}

/** Plays the whole tutorial with the pointer. Lingers on the result long enough for its chime. */
async function playThrough(user: User) {
  expect(await screen.findByText(/I’m Marmalade/)).toBeInTheDocument()
  await next(user, 'Hello, Marmalade')
  await next(user, 'Let’s bake')
  await pickShortbread(user)
  await waitFor(() => card(4))
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await waitFor(() => card(5))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
  await waitFor(() => card(6))
  await new Promise((resolve) => setTimeout(resolve, 400))
  await next(user, 'Where does it go?')
  await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
  await next(user, 'What are Crumbs?')
  await screen.findByRole('heading', { level: 1, name: 'Pantry' })
  await next(user, 'Next')
  await next(user, 'Off you go')
}

describe('first-time tutorial', () => {
  it('starts by itself for a brand-new kitchen and walks through a whole bake', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(stillKitchen())

    expect(await screen.findByText(/I’m Marmalade/)).toBeInTheDocument()
    card(1)
    await next(user, 'Hello, Marmalade')
    expect(within(guide()).getByText(/faded cards/)).toHaveFocus()
    await next(user, 'Let’s bake')

    // On the Bake bench, Marmalade waits for the shortbread jars; Mix waits too.
    await screen.findByRole('heading', { name: 'From the shelf' })
    card(3)
    await user.click(screen.getByRole('button', { name: 'Egg' }))
    await user.click(screen.getByRole('button', { name: 'Flour' }))
    expect(screen.getByRole('button', { name: 'Mix' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mix' })).toHaveAccessibleDescription('Marmalade asked for just flour, sugar and butter.')
    await user.click(screen.getByRole('button', { name: 'Egg' }))
    await user.click(screen.getByRole('button', { name: 'Sugar' }))
    await user.click(screen.getByRole('button', { name: 'Butter' }))
    await waitFor(() => card(4))
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    await waitFor(() => card(5))
    await user.click(screen.getByRole('button', { name: 'Bake it' }))

    // The first discovery, with its rarity and reward read out by Marmalade.
    await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Shortbread' })
    await waitFor(() => expect(within(guide()).getByText(/Shortbread! A Common card/)).toHaveFocus())
    expect(within(guide()).getByText(/15 Crumbs and 20 XP/)).toBeInTheDocument()
    expect(saved().progression).toEqual({ crumbs: 15, xp: 20 })

    await next(user, 'Where does it go?')
    expect(await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })).toBeInTheDocument()
    await next(user, 'What are Crumbs?')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pantry' })).toBeInTheDocument()
    expect(within(guide()).getByText(/First up: chocolate chips, at Baker Level 2 for 20 Crumbs/)).toBeInTheDocument()
    await next(user, 'Next')
    await next(user, 'Off you go')

    expect(queryGuide()).not.toBeInTheDocument()
    await waitFor(() => expect(saved().tutorial).toEqual({ completed: true, skipped: false }))
  })

  it('never starts for an established kitchen', async () => {
    startAt(makeSave())
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(queryGuide()).not.toBeInTheDocument()
  })

  it('never starts for a kitchen upgraded from Interval 4', async () => {
    const { saved } = startAt(makeV3Save())
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(queryGuide()).not.toBeInTheDocument()
    // Its discoveries, memories and every ingredient are still there.
    expect(saved().discoveredRecipes).toHaveLength(3)
    expect(saved().bakedCreations).toHaveLength(2)
    expect(saved().pantryIngredientIds).toHaveLength(12)
  })

  it('can be skipped from the keyboard, and stays skipped without taking anything away', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(stillKitchen())
    await screen.findByText(/I’m Marmalade/)

    // Skip sits just before Marmalade's line, so it's one Shift+Tab away.
    await user.tab({ shift: true })
    expect(within(guide()).getByRole('button', { name: 'Skip the tutorial' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(queryGuide()).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Crumb & Co.' })).toHaveFocus())
    await waitFor(() => expect(saved().tutorial).toEqual({ completed: false, skipped: true }))
    expect(saved().pantryIngredientIds).toHaveLength(5)
    expect(saved().progression).toEqual({ crumbs: 0, xp: 0 })
  })

  it('can be played with the keyboard alone', async () => {
    const user = userEvent.setup()
    startAt(stillKitchen())
    await screen.findByText(/I’m Marmalade/)

    // From the focused line, the next control is one Tab away.
    await user.tab()
    await user.keyboard('{Enter}')
    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('heading', { name: 'From the shelf' })
    for (const name of ['Flour', 'Sugar', 'Butter']) {
      screen.getByRole('button', { name }).focus()
      await user.keyboard('{Enter}')
    }
    await waitFor(() => card(4))
    screen.getByRole('button', { name: 'Mix' }).focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}') // Bake it takes Mix's place, still focused.
    await waitFor(() => expect(within(guide()).getByText(/Shortbread!/)).toHaveFocus())
    for (const _ of ['discovered', 'book', 'progress', 'finish']) {
      await user.tab()
      await user.keyboard('{Enter}')
    }
    expect(queryGuide()).not.toBeInTheDocument()
  })

  it('completes with motion reduced, and plays its paper-flick sound on each card', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(stillKitchen())
    await playThrough(user)
    await waitFor(() => expect(saved().tutorial.completed).toBe(true))
    expect(played.filter((id) => id === 'tutorial-next')).toHaveLength(6)
    expect(played).toContain('discover-common')
  })

  it('waits on whichever screen it belongs to, with a way back', async () => {
    const user = userEvent.setup()
    startAt(stillKitchen())
    await screen.findByText(/I’m Marmalade/)
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await screen.findByRole('heading', { level: 1, name: 'Settings' })

    await user.click(within(guide()).getByRole('button', { name: 'Back to the Kitchen' }))
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    card(1)
  })

  it('a replay from Settings teaches again without earning anything twice or resetting anything', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(stillKitchen())
    await playThrough(user)
    await waitFor(() => expect(saved().tutorial.completed).toBe(true))
    const before = saved()

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(await screen.findByRole('button', { name: 'Replay the tutorial' }))
    expect(await screen.findByText(/I’m Marmalade/)).toBeInTheDocument()
    await next(user, 'Hello, Marmalade')
    await next(user, 'Let’s bake')
    await pickShortbread(user)
    await waitFor(() => card(4))
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    await user.click(screen.getByRole('button', { name: 'Bake it' }))
    expect(await within(guide()).findByText(/already in the book, so no new Crumbs/)).toBeInTheDocument()
    await next(user, 'Where does it go?')
    await next(user, 'What are Crumbs?')
    await next(user, 'Next')
    await next(user, 'Off you go')

    await waitFor(() => expect(queryGuide()).not.toBeInTheDocument())
    const after = saved()
    expect(after.progression).toEqual(before.progression)
    expect(after.discoveredRecipes).toEqual(before.discoveredRecipes)
    expect(after.pantryIngredientIds).toEqual(before.pantryIngredientIds)
    expect(after.tutorial).toEqual({ completed: true, skipped: false })
    // The replay bake is remembered like any other.
    expect(after.bakedCreations).toHaveLength(before.bakedCreations.length + 1)
  })

  it('a skipped replay leaves the tutorial marked completed', async () => {
    const user = userEvent.setup()
    const { saved } = startAt(makeSave({ settings: { soundEnabled: false, motion: 'reduced' } }), '#/settings')
    await user.click(await screen.findByRole('button', { name: 'Replay the tutorial' }))
    await screen.findByText(/I’m Marmalade/)
    await user.click(within(guide()).getByRole('button', { name: 'Skip the tutorial' }))
    await waitFor(() => expect(saved().tutorial).toEqual({ completed: true, skipped: true }))
  })
})
