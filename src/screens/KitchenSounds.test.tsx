import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { SoundPlayerContext } from '../audio/soundContext'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeSave } from '../test/fixtures'

function recordingPlayer(): AudioPlayer & { played: string[] } {
  const played: string[] = []
  return { played, play: (id) => played.push(id), stopAll: vi.fn() }
}

function startBaking(save: GameSave, player: AudioPlayer) {
  const memory = createMemorySaveRepository(save)
  window.location.hash = '#/bake'
  render(
    <SoundPlayerContext value={player}>
      <GameProvider repository={memory.repository}>
        <App />
      </GameProvider>
    </SoundPlayerContext>,
  )
  return memory
}

const settings = (soundEnabled: boolean, motion: GameSave['settings']['motion'] = 'reduced') => makeSave({ settings: { soundEnabled, motion } })
const jar = (name: string) => screen.getByRole('button', { name })

async function bakeShortbread(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of ['Flour', 'Sugar', 'Butter', 'Egg']) await user.click(jar(name))
  await user.click(screen.getByRole('button', { name: 'Take the egg out' }))
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
  await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Shortbread' })
}

describe('kitchen sounds', () => {
  it('asks for a sound by meaning at each step of a bake when sound is on', async () => {
    const user = userEvent.setup()
    const player = recordingPlayer()
    startBaking(settings(true), player)

    await bakeShortbread(user)

    await waitFor(() => expect(player.played).toEqual(['pick', 'pick', 'pick', 'pick', 'remove', 'mix', 'ding', 'discover-common']))
  })

  it('plays nothing at all when sound is off, and the bake is unaffected', async () => {
    const user = userEvent.setup()
    const player = recordingPlayer()
    const { state } = startBaking(settings(false), player)

    await bakeShortbread(user)

    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(player.played).toEqual([])
    await waitFor(() => expect((state.stored as GameSave).discoveredRecipes).toHaveLength(1))
  })

  it('does not play on page load', async () => {
    const player = recordingPlayer()
    startBaking(settings(true), player)
    await screen.findByRole('heading', { name: 'From the shelf' })
    expect(player.played).toEqual([])
  })

  it('never lets a broken sound get in the way of baking', async () => {
    const user = userEvent.setup()
    const broken: AudioPlayer = {
      play: () => {
        throw new Error('audio exploded')
      },
      stopAll: () => {
        throw new Error('still exploded')
      },
    }
    const { state } = startBaking(settings(true), broken)

    await bakeShortbread(user)

    await waitFor(() => expect((state.stored as GameSave).bakedCreations).toHaveLength(1))
  })

  it('keeps sound and motion separate: sound still plays with motion reduced, and turning sound off keeps motion', async () => {
    const user = userEvent.setup()
    const player = recordingPlayer()
    const { state } = startBaking(settings(true, 'reduced'), player)
    await screen.findByRole('heading', { name: 'From the shelf' })
    await user.click(jar('Flour'))
    expect(player.played).toEqual(['pick'])

    window.location.hash = '#/settings'
    await user.click(await screen.findByRole('checkbox', { name: 'Play sounds' }))

    await waitFor(() => expect((state.stored as GameSave).settings).toEqual({ soundEnabled: false, motion: 'reduced' }))
    expect(player.stopAll).toHaveBeenCalled()
  })
})
