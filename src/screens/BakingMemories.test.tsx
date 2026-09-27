import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import { bake, recordBake } from '../domain/baking'
import { MAX_BAKED_CREATIONS } from '../domain/creations'
import { defineId, type CreationId, type IngredientId } from '../domain/ids'
import { BUTTER, CINNAMON, EGG, FLOUR, SUGAR } from '../domain/ingredients'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { makeSave } from '../test/fixtures'

// jsdom doesn't scroll; give it the method so the Bake screen's scrolling can be observed.
Element.prototype.scrollIntoView ??= function scrollIntoView() {}

const stillSave = (overrides: Partial<GameSave> = {}) => makeSave({ settings: { soundEnabled: true, motion: 'reduced' }, ...overrides })

function renderGame(repository: ReturnType<typeof createMemorySaveRepository>['repository']) {
  return render(
    <GameProvider repository={repository}>
      <App />
    </GameProvider>,
  )
}

function startAt(hash: string, save: GameSave = stillSave()) {
  const memory = createMemorySaveRepository(save)
  window.location.hash = hash
  const view = renderGame(memory.repository)
  return { ...memory, view }
}

/** A save that has already baked these bowls, in order, a day apart. */
function withBakes(bowls: IngredientId[][], save: GameSave = stillSave()): GameSave {
  return bowls.reduce(
    (current, bowl, index) =>
      recordBake(current, bake(bowl), new Date(Date.UTC(2026, 3, 1 + index, 10)), `creation_seed-${index}` as CreationId).save,
    save,
  )
}

const SHORTBREAD = [FLOUR, SUGAR, BUTTER]
const SUGAR_COOKIE = [FLOUR, SUGAR, BUTTER, EGG]
const EXPERIMENT = [EGG, CINNAMON]
const jar = (name: string) => screen.getByRole('button', { name })
const stored = (state: { stored: unknown }) => state.stored as GameSave

describe('the cooling rack in the kitchen', () => {
  it('is warmly empty before anything has been baked', async () => {
    startAt('#/')
    expect(await screen.findByRole('heading', { level: 2, name: 'Cooling rack' })).toBeInTheDocument()
    expect(screen.getByText('Nothing on the cooling rack yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Just baked' })).not.toBeInTheDocument()
  })

  it('shows a fresh bake once you come back to the kitchen', async () => {
    const user = userEvent.setup()
    const { state } = startAt('#/bake')
    await screen.findByRole('heading', { name: 'From the shelf' })
    for (const name of ['Flour', 'Sugar', 'Butter']) await user.click(jar(name))
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    await user.click(screen.getByRole('button', { name: 'Bake it' }))
    expect(await screen.findByText('Left to cool on the rack in your kitchen.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('navigation', { name: 'Kitchen' })).getByRole('link', { name: 'Kitchen' }))

    const rack = await screen.findByRole('list', { name: 'Just baked' })
    const [item] = within(rack).getAllByRole('listitem')
    expect(item).toHaveTextContent(/^ShortbreadBaked Today, /)
    expect(stored(state).bakedCreations).toHaveLength(1)
    expect(stored(state).discoveredRecipes).toHaveLength(1)
  })

  it('holds only the three newest bakes, newest first, and tells recipes from experiments in words', async () => {
    startAt('#/', withBakes([SHORTBREAD, SHORTBREAD, SUGAR_COOKIE, EXPERIMENT]))
    const rack = await screen.findByRole('list', { name: 'Just baked' })
    const items = within(rack).getAllByRole('listitem')

    expect(items.map((item) => item.querySelector('.cooling-rack__name')?.textContent)).toEqual([
      'Kitchen Experiment',
      'Sugar Cookie',
      'Shortbread',
    ])
    expect(items[0]).toHaveClass('cooling-rack__spot--experiment')
    expect(items[1]).toHaveClass('cooling-rack__spot--recipe')
    expect(items[0]!.querySelector('time')).toHaveAttribute('datetime', '2026-04-04T10:00:00.000Z')
    expect(screen.getByRole('link', { name: 'All your baking memories' })).toBeInTheDocument()
  })

  it('is still there for a returning player', async () => {
    const { repository } = createMemorySaveRepository(withBakes([SHORTBREAD]))
    const first = renderGame(repository)
    await screen.findByRole('list', { name: 'Just baked' })
    first.unmount()

    renderGame(repository)
    const rack = await screen.findByRole('list', { name: 'Just baked' })
    expect(rack).toHaveTextContent('Shortbread')
  })
})

describe('saving a bake', () => {
  it('writes the discovery and the remembered batch together, in one write', async () => {
    const user = userEvent.setup()
    const memory = createMemorySaveRepository(stillSave())
    const writes: GameSave[] = []
    const write = memory.repository.write
    memory.repository.write = async (save) => {
      writes.push(structuredClone(save))
      return write(save)
    }
    window.location.hash = '#/bake'
    renderGame(memory.repository)

    await screen.findByRole('heading', { name: 'From the shelf' })
    for (const name of ['Flour', 'Sugar', 'Butter']) await user.click(jar(name))
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    expect(writes).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Bake it' }))

    await waitFor(() => expect(writes).toHaveLength(1))
    expect(writes[0]?.discoveredRecipes.map((entry) => entry.recipeId)).toEqual(['recipe_shortbread'])
    expect(writes[0]?.bakedCreations.map((entry) => entry.recipeId)).toEqual(['recipe_shortbread'])
  })
})

describe('Baking Memories', () => {
  it('lists every remembered bake newest first, with what went in and when', async () => {
    const user = userEvent.setup()
    startAt('#/', withBakes([SHORTBREAD, EXPERIMENT, SUGAR_COOKIE, SHORTBREAD]))
    await user.click(await screen.findByRole('link', { name: 'All your baking memories' }))

    const title = await screen.findByRole('heading', { level: 1, name: 'Baking Memories' })
    await waitFor(() => expect(title).toHaveFocus())
    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(names).toEqual(['Shortbread', 'Sugar Cookie', 'Kitchen Experiment', 'Shortbread'])

    const experiment = screen.getByRole('article', { name: 'Kitchen Experiment' })
    expect(within(experiment).getByText('Not in any recipe book')).toBeInTheDocument()
    expect(within(experiment).getByText(/Made with cinnamon and egg/)).toBeInTheDocument()

    const sugarCookie = screen.getByRole('article', { name: 'Sugar Cookie' })
    expect(within(sugarCookie).getByText('From the Recipe Book')).toBeInTheDocument()
    expect(within(sugarCookie).getByText('Made with flour, sugar, butter and egg.')).toBeInTheDocument()
    expect(sugarCookie.querySelector('.memory__when')).toHaveTextContent(/^Baked /)
    expect(sugarCookie.querySelector('.memory__when time')).toHaveAttribute('datetime', '2026-04-03T10:00:00.000Z')
    expect(screen.queryByText(/\b(rarity|score|xp|price|stars?)\b/i)).not.toBeInTheDocument()
  })

  it('shows at most the capped history', async () => {
    startAt('#/memories', withBakes(Array.from({ length: MAX_BAKED_CREATIONS + 5 }, () => EXPERIMENT)))
    await screen.findByRole('heading', { level: 1, name: 'Baking Memories' })
    expect(screen.getAllByRole('article')).toHaveLength(MAX_BAKED_CREATIONS)
  })

  it('has a short, warm empty state', async () => {
    startAt('#/memories')
    await screen.findByRole('heading', { level: 1, name: 'Baking Memories' })
    expect(screen.getByText('Nothing on the cooling rack yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go and bake' })).toBeInTheDocument()
  })
})

const discovered = (...slugs: string[]) =>
  stillSave({ discoveredRecipes: slugs.map((slug) => ({ recipeId: defineId('recipe', slug), discoveredAt: '2026-04-01T12:00:00.000Z' })) })

describe('Bake again', () => {
  it('lays out the recipe in the bowl without mixing or baking it', async () => {
    const user = userEvent.setup()
    const { state } = startAt('#/recipe-book', discovered('sugar-cookie'))
    await user.click(await screen.findByRole('button', { name: 'Bake again: Sugar Cookie' }))

    await screen.findByRole('heading', { level: 1, name: 'Bake' })
    // Focus lands on the note by the bowl, so the prepared bowl is the first thing seen and heard.
    const note = screen.getByText(/^Laid out for Sugar Cookie\./)
    await waitFor(() => expect(note).toHaveFocus())
    expect(note).toHaveTextContent('Laid out for Sugar Cookie. Flour, sugar, butter and egg are in the bowl. Mix when you’re ready.')
    for (const name of ['Flour', 'Sugar', 'Butter', 'Egg']) expect(jar(name)).toHaveAttribute('aria-pressed', 'true')
    expect(jar('Vanilla')).toHaveAttribute('aria-pressed', 'false')
    expect(within(screen.getByRole('list', { name: 'In the bowl' })).getAllByRole('listitem')).toHaveLength(4)

    // Not mixed, not baked, nothing written.
    expect(screen.getByRole('button', { name: 'Mix' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Bake it' })).not.toBeInTheDocument()
    expect(stored(state).bakedCreations).toEqual([])
  })

  it('lets the player change the prepared bowl before mixing and baking it themselves', async () => {
    const user = userEvent.setup()
    const { state } = startAt('#/recipe-book', discovered('sugar-cookie'))
    await user.click(await screen.findByRole('button', { name: 'Bake again: Sugar Cookie' }))
    await screen.findByRole('heading', { level: 1, name: 'Bake' })

    await user.click(jar('Vanilla'))
    expect(screen.queryByText(/Laid out for Sugar Cookie/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mix' }))
    expect(stored(state).bakedCreations).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Bake it' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'New recipe discovered: Vanilla Kiss' })).toBeInTheDocument()
    await waitFor(() => expect(stored(state).bakedCreations.map((creation) => creation.recipeId)).toEqual(['recipe_vanilla-kiss']))
  })

  it('works from the keyboard alone', async () => {
    const user = userEvent.setup()
    startAt('#/recipe-book', discovered('shortbread'))
    const again = await screen.findByRole('button', { name: 'Bake again: Shortbread' })
    again.focus()
    await user.keyboard('{Enter}')

    await screen.findByRole('heading', { level: 1, name: 'Bake' })
    await waitFor(() => expect(screen.getByText(/^Laid out for Shortbread\./)).toHaveFocus())
    // The bowl's controls follow the note in tab order: the take-out buttons, then Mix.
    await user.tab()
    expect(screen.getByRole('button', { name: 'Take the flour out' })).toHaveFocus()
    screen.getByRole('button', { name: 'Mix' }).focus()
    await user.keyboard('{Enter}')
    screen.getByRole('button', { name: 'Bake it' }).focus()
    await user.keyboard('{Enter}')

    // Reduced motion: the result is there straight away, focused.
    const heading = await screen.findByRole('heading', { level: 2, name: 'Shortbread' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText('Already in your Recipe Book.')).toBeInTheDocument()
  })

  it('brings the prepared bowl into view when it starts off screen, without animating when motion is reduced', async () => {
    const user = userEvent.setup()
    const scrolled: { element: Element; options: unknown }[] = []
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element, options) {
      scrolled.push({ element: this, options })
    })
    // As on a phone: the bowl sits below the shelf, beyond the bottom of the screen.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const below = this.classList.contains('bake__station')
      return { top: below ? 1200 : 0, bottom: below ? 1600 : 40, height: below ? 400 : 40, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => ({}) }
    })
    startAt('#/recipe-book', discovered('shortbread'))
    await user.click(await screen.findByRole('button', { name: 'Bake again: Shortbread' }))

    await waitFor(() => expect(screen.getByText(/^Laid out for Shortbread\./)).toHaveFocus())
    expect(scrolled).toHaveLength(1)
    expect(scrolled[0]!.element).toHaveClass('bake__station')
    expect(scrolled[0]!.options).toEqual({ block: 'center', behavior: 'auto' })
  })

  it('leaves the page where it is when the prepared bowl is already in view', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    startAt('#/recipe-book', discovered('shortbread'))
    await user.click(await screen.findByRole('button', { name: 'Bake again: Shortbread' }))

    await waitFor(() => expect(screen.getByText(/^Laid out for Shortbread\./)).toHaveFocus())
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('is never offered for recipes that have not been discovered', async () => {
    startAt('#/recipe-book', discovered('shortbread'))
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })
    expect(screen.getAllByRole('button', { name: /^Bake again/ })).toHaveLength(1)
  })

  it('does not survive a refresh: the bowl starts empty again', async () => {
    const user = userEvent.setup()
    const { repository, view } = startAt('#/recipe-book', discovered('shortbread'))
    await user.click(await screen.findByRole('button', { name: 'Bake again: Shortbread' }))
    await screen.findByRole('heading', { level: 1, name: 'Bake' })
    view.unmount()

    renderGame(repository)
    await screen.findByRole('heading', { name: 'From the shelf' })
    expect(jar('Flour')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('list', { name: 'In the bowl' })).not.toBeInTheDocument()
  })

  it('does not lay the bowl out again on the next visit to Bake', async () => {
    const user = userEvent.setup()
    startAt('#/recipe-book', discovered('shortbread'))
    await user.click(await screen.findByRole('button', { name: 'Bake again: Shortbread' }))
    await screen.findByRole('heading', { level: 1, name: 'Bake' })
    const nav = screen.getByRole('navigation', { name: 'Kitchen' })

    await user.click(within(nav).getByRole('link', { name: 'Pantry' }))
    await screen.findByRole('heading', { level: 1, name: 'Pantry' })
    await user.click(within(nav).getByRole('link', { name: 'Bake' }))
    await screen.findByRole('heading', { name: 'From the shelf' })
    expect(jar('Flour')).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('undiscovered recipe hints', () => {
  it('say only how many ingredients a recipe needs', async () => {
    startAt('#/recipe-book', discovered())
    await screen.findByRole('heading', { level: 1, name: 'Recipe Book' })

    const hints = screen.getAllByText(/^Needs \d ingredients$/)
    expect(hints).toHaveLength(12)
    expect(hints.map((hint) => hint.textContent)).toContain('Needs 3 ingredients')
    expect(screen.queryByText(/Shortbread|Peanut|Macaroon|Flapjack|Oatmeal/)).not.toBeInTheDocument()
    expect(document.querySelectorAll('.book-card--blank svg')).toHaveLength(0)
  })
})
