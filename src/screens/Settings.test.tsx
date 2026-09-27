import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import { bake, recordBake } from '../domain/baking'
import type { CreationId } from '../domain/ids'
import { BUTTER, CINNAMON, EGG, FLOUR, SUGAR } from '../domain/ingredients'
import { CURRENT_SAVE_VERSION } from '../domain/save'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { SAVE_FILE_FORMAT } from '../persistence/portable'
import { makeSave, makeV2Save } from '../test/fixtures'

const still = (overrides: Partial<GameSave> = {}) => makeSave({ settings: { soundEnabled: false, motion: 'reduced' }, ...overrides })

function openSettings(save: GameSave = still()) {
  const memory = createMemorySaveRepository(save)
  window.location.hash = '#/settings'
  render(
    <GameProvider repository={memory.repository}>
      <App />
    </GameProvider>,
  )
  return memory
}

const stored = (state: { stored: unknown }) => state.stored as GameSave

/** Another kitchen, played a little: one recipe found, two bakes remembered. */
function otherKitchen(): GameSave {
  let save = makeSave({ profile: { id: 'player_11111111-2222-4333-8444-555555555555' as GameSave['profile']['id'], name: 'Sam', bakeryName: 'Oven Mitts' } })
  save = recordBake(save, bake([FLOUR, SUGAR, BUTTER]), new Date('2026-05-01T10:00:00.000Z'), 'creation_a' as CreationId).save
  save = recordBake(save, bake([EGG, CINNAMON]), new Date('2026-05-02T10:00:00.000Z'), 'creation_b' as CreationId).save
  return { ...save, updatedAt: '2026-05-02T10:00:00.000Z' }
}

const saveFile = (save: unknown, name = 'kitchen.json') =>
  new File([JSON.stringify({ format: SAVE_FILE_FORMAT, exportedAt: '2026-05-03T00:00:00.000Z', save })], name, { type: 'application/json' })

async function chooseFile(user: ReturnType<typeof userEvent.setup>, file: File) {
  await screen.findByRole('heading', { level: 1, name: 'Settings' })
  await user.upload(screen.getByTestId('save-file-input'), file)
}

describe('renaming', () => {
  it('renames the player and the kitchen, keeps the player id, and updates the kitchen straight away', async () => {
    const user = userEvent.setup()
    const { state } = openSettings()
    const id = stored(state).profile.id

    const kitchen = await screen.findByLabelText('Your kitchen’s name')
    await user.clear(kitchen)
    await user.type(kitchen, '  The   Rolling Pin ')
    const player = screen.getByLabelText('What the kitchen calls you')
    await user.clear(player)
    await user.type(player, 'Robbie')
    await user.click(screen.getByRole('button', { name: 'Save names' }))

    expect(await screen.findByText('Saved. The sign over the door now says The Rolling Pin.')).toBeInTheDocument()
    await waitFor(() => expect(stored(state).profile).toEqual({ id, name: 'Robbie', bakeryName: 'The Rolling Pin' }))
    expect(kitchen).toHaveValue('The Rolling Pin')
    // The sign in the header (a way home) already says the new name.
    expect(screen.getByRole('link', { name: 'The Rolling Pin, back to the kitchen' })).toBeInTheDocument()

    await user.click(within(screen.getByRole('navigation', { name: 'Kitchen' })).getByRole('link', { name: 'Kitchen' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'The Rolling Pin' })).toBeInTheDocument()
    expect(screen.getByText(/Robbie\./)).toBeInTheDocument()
  })

  it('changes nothing else in the save', async () => {
    const user = userEvent.setup()
    const before = otherKitchen()
    const { state } = openSettings({ ...before, settings: { soundEnabled: false, motion: 'reduced' } })

    const player = await screen.findByLabelText('What the kitchen calls you')
    await user.clear(player)
    await user.type(player, 'Samantha')
    await user.click(screen.getByRole('button', { name: 'Save names' }))

    await waitFor(() => expect(stored(state).profile.name).toBe('Samantha'))
    const { profile, updatedAt: _updated, settings: _settings, ...rest } = stored(state)
    const { profile: oldProfile, updatedAt: _oldUpdated, settings: _oldSettings, ...oldRest } = before
    expect(rest).toEqual(oldRest)
    expect(profile).toEqual({ ...oldProfile, name: 'Samantha' })
  })

  it('uses the onboarding rules and explains what’s wrong without saving', async () => {
    const user = userEvent.setup()
    const { state } = openSettings()

    const kitchen = await screen.findByLabelText('Your kitchen’s name')
    await user.clear(kitchen)
    await user.type(kitchen, '   ')
    await user.click(screen.getByRole('button', { name: 'Save names' }))

    expect(kitchen).toHaveAttribute('aria-invalid', 'true')
    expect(kitchen).toHaveFocus()
    expect(kitchen).toHaveAccessibleDescription('Every kitchen needs a name. You can keep it simple.')
    expect(stored(state).profile.bakeryName).toBe('Crumb & Co.')

    await user.clear(kitchen)
    await user.type(kitchen, 'x'.repeat(33))
    await user.click(screen.getByRole('button', { name: 'Save names' }))
    expect(kitchen).toHaveAccessibleDescription(/Keep it to 32 letters or fewer/)
    expect(stored(state).profile.bakeryName).toBe('Crumb & Co.')
  })

  it('persists across a reload', async () => {
    const user = userEvent.setup()
    const memory = openSettings()
    const player = await screen.findByLabelText('What the kitchen calls you')
    await user.clear(player)
    await user.type(player, 'Jo')
    await user.click(screen.getByRole('button', { name: 'Save names' }))
    await waitFor(() => expect(stored(memory.state).profile.name).toBe('Jo'))

    const reloaded = await memory.repository.load()
    expect(reloaded).toMatchObject({ kind: 'loaded', save: { profile: { name: 'Jo', bakeryName: 'Crumb & Co.' } } })
  })
})

describe('downloading the kitchen', () => {
  let blobs: Blob[]
  beforeEach(() => {
    blobs = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:homemade'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('downloads a named, versioned save file that opens again as the same kitchen', async () => {
    const user = userEvent.setup()
    const kitchen = { ...otherKitchen(), settings: { soundEnabled: false, motion: 'reduced' as const } }
    openSettings(kitchen)

    await user.click(await screen.findByRole('button', { name: 'Download my kitchen' }))

    expect(await screen.findByText('Downloaded homemade-oven-mitts.json.')).toBeInTheDocument()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
    const file = JSON.parse(await blobs[0]!.text())
    expect(file).toMatchObject({ format: SAVE_FILE_FORMAT, save: { version: CURRENT_SAVE_VERSION } })
    expect(file.save).toEqual(kitchen)
  })

  it('round-trips into a different browser: names, ids, discoveries and memories all arrive', async () => {
    const user = userEvent.setup()
    const kitchen = { ...otherKitchen(), settings: { soundEnabled: false, motion: 'reduced' as const } }
    openSettings(kitchen)
    await user.click(await screen.findByRole('button', { name: 'Download my kitchen' }))
    const text = await blobs[0]!.text()
    document.body.innerHTML = ''

    const elsewhere = openSettings(still())
    await chooseFile(user, new File([text], 'homemade-oven-mitts.json'))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace my kitchen' }))

    await waitFor(() => expect(stored(elsewhere.state)).toEqual(kitchen))
  })
})

describe('opening a save file', () => {
  it('shows what is in the file and changes nothing until the player confirms', async () => {
    const user = userEvent.setup()
    const current = still()
    const { state } = openSettings(current)

    await chooseFile(user, saveFile(otherKitchen()))

    const dialog = await screen.findByRole('dialog', { name: 'Replace this kitchen?' })
    expect(within(dialog).getByText('Oven Mitts')).toBeInTheDocument()
    expect(within(dialog).getByText('Sam')).toBeInTheDocument()
    expect(within(dialog).getByText('1 of 12 recipes')).toBeInTheDocument()
    expect(within(dialog).getByText('2 bakes')).toBeInTheDocument()
    expect(within(dialog).getByText(/will be set aside in this browser’s archive rather than deleted/)).toBeInTheDocument()
    // The safe choice has focus, and nothing has been touched yet.
    expect(within(dialog).getByRole('button', { name: 'Keep my kitchen' })).toHaveFocus()
    expect(stored(state)).toEqual(current)
    expect(state.archive).toEqual([])
  })

  it('keeps the current kitchen when the player backs out', async () => {
    const user = userEvent.setup()
    const current = still()
    const { state } = openSettings(current)
    await chooseFile(user, saveFile(otherKitchen()))

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Keep my kitchen' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored(state)).toEqual(current)
    expect(state.archive).toEqual([])
  })

  it('on confirmation, archives the current kitchen, installs the file and opens the new kitchen', async () => {
    const user = userEvent.setup()
    const current = still()
    const incoming = otherKitchen()
    const { state } = openSettings(current)
    await chooseFile(user, saveFile(incoming))

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace my kitchen' }))

    const heading = await screen.findByRole('heading', { level: 1, name: 'Oven Mitts' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(stored(state)).toEqual(incoming)
    expect(state.archive.map((entry) => entry.data)).toEqual([current])
    // The imported memories are on the rack.
    expect(screen.getByRole('link', { name: 'All your baking memories' })).toBeInTheDocument()
  })

  it('upgrades an older save file, archiving both the current kitchen and the file’s original', async () => {
    const user = userEvent.setup()
    const current = still()
    const v2 = makeV2Save()
    const { state } = openSettings(current)
    await chooseFile(user, saveFile(v2))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/older version of Homemade and will be brought up to date/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Replace my kitchen' }))

    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    expect(stored(state)).toMatchObject({ version: CURRENT_SAVE_VERSION, discoveredRecipes: v2.discoveredRecipes, bakedCreations: [] })
    expect(state.archive.map((entry) => entry.data)).toEqual([current, v2])
  })

  it.each([
    ['malformed JSON', new File(['{ not json'], 'broken.json'), 'That file isn’t a Homemade save. It couldn’t be read as a save file at all. Nothing was changed.'],
    ['a different app’s JSON', new File(['{"name":"my-app","dependencies":{}}'], 'package.json'), 'That file doesn’t look like a Homemade save. Nothing was changed.'],
    [
      'a save from a newer Homemade',
      saveFile({ ...otherKitchen(), version: CURRENT_SAVE_VERSION + 1 }),
      'This save was made by a newer version of Homemade and can’t be opened here yet. Nothing was changed.',
    ],
    ['a damaged save', saveFile({ ...otherKitchen(), discoveredRecipes: 'many' }), 'This save looks damaged, so it can’t be opened safely. Nothing was changed.'],
  ])('refuses %s in plain words and leaves the current save alone', async (_label, file, message) => {
    const user = userEvent.setup()
    const current = still()
    const { state } = openSettings(current)

    await chooseFile(user, file)

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(stored(state)).toEqual(current)
    expect(state.archive).toEqual([])
  })

  it('leaves the current kitchen exactly as it was if storing the import fails', async () => {
    const user = userEvent.setup()
    const current = still()
    const memory = openSettings(current)
    memory.state.failNextReplace = true
    await chooseFile(user, saveFile(otherKitchen()))

    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace my kitchen' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('your kitchen was left exactly as it was')
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(stored(memory.state)).toEqual(current)
    expect(memory.state.archive).toEqual([])
    expect(screen.getByLabelText('Your kitchen’s name')).toHaveValue('Crumb & Co.')
  })
})

describe('install', () => {
  it('offers no install button where the browser has not offered one', async () => {
    openSettings()
    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    expect(screen.queryByRole('button', { name: 'Install Homemade' })).not.toBeInTheDocument()
  })
})
