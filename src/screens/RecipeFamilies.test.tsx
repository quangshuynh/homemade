import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { SoundPlayerContext } from '../audio/soundContext'
import type { RecipeId } from '../domain/ids'
import { VISIBLE_RECIPES } from '../domain/recipeBook'
import { RECIPES } from '../domain/recipes'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeNewKitchen, makeSave } from '../test/fixtures'

type User = ReturnType<typeof userEvent.setup>

const still = { soundEnabled: true, motion: 'reduced' } as const
/** A kitchen that owns every ingredient, with nothing found yet. */
const stocked = (overrides: Partial<GameSave> = {}) => makeSave({ settings: still, ...overrides })
/** A brand-new kitchen past the tutorial: just the starter pantry. */
const fresh = (overrides: Partial<GameSave> = {}) =>
  makeNewKitchen({ tutorial: { completed: false, skipped: true }, settings: still, ...overrides })

const found = (...ids: string[]) => ids.map((id) => ({ recipeId: id as RecipeId, discoveredAt: '2026-09-01T10:00:00.000Z' }))
const SECRET_NAMES = RECIPES.filter((recipe) => recipe.isSecret).map((recipe) => recipe.name)

function startAt(hash: string, save: GameSave) {
  const memory = createMemorySaveRepository(save)
  const played: string[] = []
  const player: AudioPlayer = { play: (id) => played.push(id), stopAll: vi.fn() }
  window.location.hash = hash
  const view = render(
    <SoundPlayerContext value={player}>
      <GameProvider repository={memory.repository}>
        <App />
      </GameProvider>
    </SoundPlayerContext>,
  )
  return { played, saved: () => memory.state.stored as GameSave, container: view.container }
}

async function bake(user: User, names: string[]) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of names) await user.click(screen.getByRole('button', { name }))
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
}

const openBook = () => screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
const dividers = () => screen.getByRole('group', { name: 'Show recipes from' })
const familyRegions = () => screen.getAllByRole('region').filter((region) => region.classList.contains('book-family'))

describe('the Recipe Book’s families', () => {
  it('files every card behind a family divider, each a heading with its progress', async () => {
    startAt('#/recipe-book', fresh({ discoveredRecipes: found('recipe_shortbread', 'recipe_chocolate-chip') }))
    await openBook()

    expect(familyRegions().map((region) => within(region).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Classics',
      'Chocolate',
      'Warm & Spiced',
      'Nutty',
      'Fruity',
      'Sweet & Sticky',
      'Strange & Wonderful',
    ])
    const classics = screen.getByRole('region', { name: 'Classics' })
    expect(classics).toHaveTextContent('1 of 5 discovered')
    expect(within(classics).getByRole('heading', { level: 3, name: 'Shortbread' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Chocolate' })).toHaveTextContent('1 of 4 discovered')
    // A family with nothing found yet says so quietly, and still keeps its blank cards.
    const nutty = screen.getByRole('region', { name: 'Nutty' })
    expect(nutty).toHaveTextContent('No recipes written here yet.')
    expect(within(nutty).getAllByText('Not discovered yet')).toHaveLength(4)
    expect(screen.getByText('2 of 31 recipes written down.')).toBeInTheDocument()
  })

  it('shows one family at a time from the dividers, by keyboard alone, and says what it shows', async () => {
    const user = userEvent.setup()
    startAt('#/recipe-book', fresh({ discoveredRecipes: found('recipe_shortbread') }))
    await openBook()

    const every = within(dividers()).getByRole('button', { name: 'Every family' })
    expect(every).toHaveAttribute('aria-pressed', 'true')
    every.focus()
    await user.tab()
    const classics = within(dividers()).getByRole('button', { name: 'Classics' })
    expect(classics).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(classics).toHaveAttribute('aria-pressed', 'true')
    expect(every).toHaveAttribute('aria-pressed', 'false')
    expect(familyRegions()).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Showing Classics: 1 of 5 discovered.')

    await user.tab()
    await user.keyboard(' ')
    expect(within(dividers()).getByRole('button', { name: 'Chocolate' })).toHaveAttribute('aria-pressed', 'true')
    expect(familyRegions().map((region) => region.getAttribute('aria-labelledby'))).toEqual(['family-chocolate'])

    await user.click(every)
    expect(familyRegions()).toHaveLength(7)
    expect(screen.getByRole('status')).toHaveTextContent('Showing every family: 1 of 31 recipes.')
  })
})

describe('clues on blank cards', () => {
  it('always give the ingredient count, and Marmalade’s note once everything needed is on the shelf', async () => {
    startAt('#/recipe-book', fresh())
    await openBook()

    const classics = screen.getByRole('region', { name: 'Classics' })
    const shortbreadCard = within(classics).getAllByRole('listitem')[0]!
    expect(shortbreadCard).toHaveTextContent('Needs 3 ingredients')
    expect(shortbreadCard).toHaveTextContent('Marmalade scribbled: “Plain in the best way. Just the basics.”')

    // Lemon isn't on a new kitchen's shelf, so the Fruity cards only say how many.
    const fruity = screen.getByRole('region', { name: 'Fruity' })
    expect(within(fruity).queryByText(/Marmalade scribbled/)).not.toBeInTheDocument()
    expect(within(fruity).getAllByText(/^Needs \d ingredients$/)).toHaveLength(5)
  })

  it('never name an ingredient, a rarity or a recipe', async () => {
    startAt('#/recipe-book', stocked())
    await openBook()
    const notes = screen.getAllByText(/Marmalade scribbled/).map((note) => note.textContent ?? '')
    expect(notes).toHaveLength(VISIBLE_RECIPES.length)
    for (const note of notes) {
      expect(note).not.toMatch(/common|rare|epic|legendary|mythic|secret/i)
      for (const recipe of RECIPES) expect(note).not.toContain(recipe.name)
    }
  })
})

describe('secret recipes in the book', () => {
  it('are nowhere in the page before they’re found: no card, count, clue, divider or word', async () => {
    const { container } = startAt('#/recipe-book', stocked())
    await openBook()
    const text = container.textContent ?? ''
    for (const name of SECRET_NAMES) expect(text).not.toContain(name)
    expect(text).not.toMatch(/secret/i)
    expect(screen.getAllByText('Not discovered yet')).toHaveLength(VISIBLE_RECIPES.length)
    expect(screen.getByText('Nothing written down yet. Bake something and see.')).toBeInTheDocument()
    expect(container.querySelector('[data-secret]')).toBeNull()
  })

  it('appear once found, marked Secret in words, and counted on their own', async () => {
    startAt('#/recipe-book', stocked({ discoveredRecipes: found('recipe_shortbread', 'recipe_snowball') }))
    await openBook()

    expect(screen.getByText('1 of 31 recipes written down.')).toBeInTheDocument()
    expect(screen.getByText('Secrets found: 1')).toBeInTheDocument()
    const curious = screen.getByRole('region', { name: 'Strange & Wonderful' })
    expect(curious).toHaveTextContent('0 of 4 discovered · 1 secret')
    const card = within(curious).getByRole('heading', { level: 3, name: 'Snowball' }).closest('li')!
    expect(within(card).getByText('Secret')).toBeInTheDocument()
    expect(within(card).getByText('Rare')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Bake again: Snowball' })).toBeInTheDocument()
    // The other secrets are still nowhere to be seen.
    expect(document.body).not.toHaveTextContent('Baklava')
  })
})

describe('the secret reveal', () => {
  it('says something unexpected, stamps it Secret, reads it all out in order, and plays its hush before the chime', async () => {
    const user = userEvent.setup()
    const { played, saved } = startAt('#/bake', stocked({ progression: { crumbs: 0, xp: 1200 } }))
    await bake(user, ['Coconut', 'Sugar', 'Egg', 'White chocolate'])

    const heading = await screen.findByRole('heading', { level: 2, name: 'Secret recipe discovered: Snowball' })
    await waitFor(() => expect(heading).toHaveFocus())
    const result = heading.closest('section')!
    expect(result).toHaveAttribute('data-secret')
    expect(within(result).getByText('Something unexpected…')).toBeInTheDocument()
    expect(within(result).getByText('Secret')).toBeInTheDocument()
    expect(within(result).getByText('Rare')).toBeInTheDocument()
    expect(result).toHaveTextContent('+40 Crumbs · +70 XP')
    expect(within(result).getByText('Copied into your Recipe Book, under Strange & Wonderful.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Something unexpected: a secret recipe! Rare recipe. Earned 40 Crumbs and 70 XP.')
    // Marmalade's first-secret line, said once.
    expect(within(result).getByText(/A secret! Let’s keep it between us./)).toBeInTheDocument()

    await waitFor(() => expect(played).toContain('discover-rare'), { timeout: 2500 })
    expect(played.indexOf('discover-secret')).toBeGreaterThan(-1)
    expect(played.indexOf('discover-secret')).toBeLessThan(played.indexOf('discover-rare'))
    expect(saved().progression).toEqual({ crumbs: 40, xp: 1270 })
  })

  it('doesn’t repeat Marmalade’s secret line for a second secret', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stocked({ discoveredRecipes: found('recipe_snowball'), progression: { crumbs: 40, xp: 1270 } }))
    await bake(user, ['Peanut butter', 'Sugar', 'Egg', 'Strawberry jam'])

    const result = (await screen.findByRole('heading', { level: 2, name: 'Secret recipe discovered: Peanut Butter & Jam Thumbprint' })).closest('section')!
    expect(within(result).queryByText(/keep it between us/)).not.toBeInTheDocument()
    // It's still the first Epic in this book, so Marmalade has that to say instead.
    expect(within(result).getByText('Epic! My whiskers are actually tingling.')).toBeInTheDocument()
  })

  it('bakes again like any other recipe, without the secret fanfare', async () => {
    const user = userEvent.setup()
    const { played } = startAt('#/bake', stocked({ discoveredRecipes: found('recipe_snowball') }))
    await bake(user, ['Coconut', 'Sugar', 'Egg', 'White chocolate'])

    const result = (await screen.findByRole('heading', { level: 2, name: 'Snowball' })).closest('section')!
    expect(within(result).queryByText('Something unexpected…')).not.toBeInTheDocument()
    expect(within(result).getByText('Secret')).toBeInTheDocument()
    expect(within(result).queryByText(/Crumbs ·/)).not.toBeInTheDocument()
    await waitFor(() => expect(played).toContain('ding'))
    expect(played).not.toContain('discover-secret')
  })
})

describe('the first Mythic', () => {
  it('gets the gold-leaf card, its own words and sound, and Marmalade starstruck', async () => {
    const user = userEvent.setup()
    const { played, saved, container } = startAt('#/bake', stocked({ progression: { crumbs: 0, xp: 1200 } }))
    await bake(user, ['Flour', 'Butter', 'Brown sugar', 'Sea salt', 'Chocolate chips'])

    const heading = await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Millionaire’s Shortbread' })
    const result = heading.closest('section')!
    expect(result).toHaveAttribute('data-rarity', 'mythic')
    expect(result).not.toHaveAttribute('data-secret')
    expect(within(result).getByText('Mythic')).toBeInTheDocument()
    expect(within(result).getByText(/A Mythic recipe. Hardly any kitchen ever writes one down./)).toBeInTheDocument()
    expect(result).toHaveTextContent('+300 Crumbs · +320 XP')
    expect(screen.getByRole('status')).toHaveTextContent('Mythic recipe. Earned 300 Crumbs and 320 XP.')
    expect(within(result).getByText(/A Mythic. In this kitchen./)).toBeInTheDocument()
    expect(container.querySelector('.bake-result__mascot [data-expression="starstruck"]')).not.toBeNull()

    await waitFor(() => expect(played).toContain('discover-mythic'), { timeout: 2500 })
    expect(saved().progression).toEqual({ crumbs: 300, xp: 1520 })
  })

  it('shows every part of the reveal straight away with motion reduced: nothing is held back', async () => {
    const user = userEvent.setup()
    startAt('#/bake', stocked())
    await bake(user, ['Flour', 'Butter', 'Brown sugar', 'Sea salt', 'Chocolate chips'])
    const result = (await screen.findByRole('heading', { level: 2, name: /Millionaire’s Shortbread/ })).closest('section')!
    // Under reduced motion there's no oven pause and every beat is zero (see layout.node.test).
    for (const text of ['Mythic', '+300 Crumbs', 'A Mythic recipe', 'Marmalade']) expect(result).toHaveTextContent(text)
  })
})

describe('Marmalade’s milestones', () => {
  it('notices the first family finished, once', async () => {
    const user = userEvent.setup()
    // Everything Fruity found but the Lemon Crinkle; no other family finished; a rarity she's seen before.
    startAt(
      '#/bake',
      stocked({
        discoveredRecipes: found('recipe_jam-thumbprint', 'recipe_lemon-shortbread', 'recipe_jam-sandwich', 'recipe_lemon-white-chocolate', 'recipe_vanilla-kiss'),
        progression: { crumbs: 0, xp: 1200 },
      }),
    )
    await bake(user, ['Flour', 'Sugar', 'Butter', 'Egg', 'Lemon'])
    const result = (await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Lemon Crinkle' })).closest('section')!
    expect(within(result).getByText('Every Fruity card, back in the box. That’s a whole divider done.')).toBeInTheDocument()
  })

  it('says something special for a kitchen’s very first pantry addition', async () => {
    const user = userEvent.setup()
    startAt('#/pantry', fresh({ progression: { crumbs: 50, xp: 100 } }))
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })
    const additions = screen.getByRole('region', { name: 'Pantry additions' })
    await user.click(within(additions).getByRole('button', { name: 'Add strawberry jam to the pantry for 20 Crumbs' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Add it' }))
    const news = await screen.findByRole('generic', { name: 'Added strawberry jam to the pantry' })
    expect(news).toHaveTextContent('Strawberry jam! Your first addition.')
  })

  it('shows a new ingredient’s level and cost in the Pantry, and names it when a level opens it', async () => {
    const user = userEvent.setup()
    startAt('#/bake', fresh({ discoveredRecipes: found('recipe_shortbread', 'recipe_sugar-cookie'), progression: { crumbs: 30, xp: 90 } }))
    await bake(user, ['Egg', 'Sugar'])
    const result = (await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Meringue Kiss' })).closest('section')!
    expect(within(result).getByText('Baker Level 3! Strawberry jam, oats and cocoa powder can go in the pantry now.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Baker Level 3! Strawberry jam, oats and cocoa powder can go in the pantry now.')

    await user.click(within(result).getByRole('link', { name: 'See what’s new in the Pantry' }))
    const additions = await screen.findByRole('region', { name: 'Pantry additions' })
    const jam = within(additions).getByRole('heading', { level: 3, name: 'Strawberry jam' }).closest('li')!
    expect(jam).toHaveTextContent('Baker Level 3')
    expect(jam).toHaveTextContent('20 Crumbs')
    expect(jam).not.toHaveTextContent(/thumbprint|recipe|cookie/i)
  })
})
