import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { GameProvider } from '../app/GameProvider'
import type { AudioPlayer } from '../audio/audioPlayer'
import { CueSchedulerContext, type CueScheduler } from '../audio/cues'
import { SoundPlayerContext } from '../audio/soundContext'
import type { RecipeId, StorySceneId } from '../domain/ids'
import type { GameSave } from '../domain/types'
import { createMemorySaveRepository } from '../persistence/memorySaveRepository'
import { STORY_SCENES } from '../story/chapters'
import { makeSave, makeV6Save } from '../test/fixtures'
import { createManualCues, immediateCues } from '../test/soundCues'

type User = ReturnType<typeof userEvent.setup>

Element.prototype.scrollIntoView ??= function scrollIntoView() {}

const still = { soundEnabled: true, motion: 'reduced' } as const
const found = (...slugs: string[]) => slugs.map((slug) => ({ recipeId: `recipe_${slug}` as RecipeId, discoveredAt: '2026-10-01T10:00:00.000Z' }))
const SHORTBREAD = ['Flour', 'Sugar', 'Butter']

function startAt(stored: unknown, hash: string, cues: CueScheduler = immediateCues) {
  const memory = createMemorySaveRepository(stored)
  const played: string[] = []
  const player: AudioPlayer = { play: (id) => played.push(id), stopAll: vi.fn() }
  window.location.hash = hash
  render(
    <SoundPlayerContext value={player}>
      <CueSchedulerContext value={cues}>
        <GameProvider repository={memory.repository}>
          <App />
        </GameProvider>
      </CueSchedulerContext>
    </SoundPlayerContext>,
  )
  return { played, saved: () => memory.state.stored as GameSave }
}

async function bakeBowl(user: User, names: string[]) {
  await screen.findByRole('heading', { name: 'From the shelf' })
  for (const name of names) await user.click(screen.getByRole('button', { name }))
  await user.click(screen.getByRole('button', { name: 'Mix' }))
  await user.click(screen.getByRole('button', { name: 'Bake it' }))
}

/** The Bake screen's polite status line. */
const bakeStatus = () => document.querySelector('.bake [role="status"]')!

describe('a keepsake earned at the oven', () => {
  it('shows one quiet label, reads it out, rings once and leaves focus on the result', async () => {
    const user = userEvent.setup()
    const { played, saved } = startAt(makeSave({ settings: still }), '#/bake')
    await bakeBowl(user, ['Egg', 'Vanilla'])

    const heading = await screen.findByRole('heading', { level: 2, name: 'Kitchen Experiment' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText('A keepsake for the recipe box:')).toBeInTheDocument()
    expect(screen.getByText('Happy Accident')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See your keepsakes' })).toHaveAttribute('href', '#/recipe-book/keepsakes')
    expect(bakeStatus()).toHaveTextContent('A keepsake for the recipe box: Happy Accident.')
    // Her first-keepsake line, since it's the kitchen's very first.
    expect(screen.getByText(/I’ll tuck it in behind the cards/)).toBeInTheDocument()
    await waitFor(() => expect(played.filter((id) => id === 'achievement-unlock')).toHaveLength(1))
    expect(saved().achievementIds).toEqual(['achievement_happy-accident'])

    // A second experiment earns nothing more and says nothing more.
    await user.click(screen.getByRole('button', { name: 'Bake another batch' }))
    await bakeBowl(user, ['Egg', 'Cinnamon'])
    await screen.findByRole('heading', { level: 2, name: 'Kitchen Experiment' })
    expect(screen.queryByText('A keepsake for the recipe box:')).not.toBeInTheDocument()
    expect(played.filter((id) => id === 'achievement-unlock')).toHaveLength(1)
  })

  it('names a mastery stage only when one is reached, with its own small sound', async () => {
    const user = userEvent.setup()
    const save = makeSave({ settings: still, discoveredRecipes: found('shortbread'), recipeBakeCounts: { recipe_shortbread: 2 } as never })
    const { played, saved } = startAt(save, '#/bake')

    await bakeBowl(user, SHORTBREAD)
    await screen.findByRole('heading', { level: 2, name: 'Shortbread' })
    expect(document.querySelector('.bake-result__mastery')).toHaveTextContent('Familiar Shortbread is Familiar now: baked 3 times.')
    expect(bakeStatus()).toHaveTextContent('Shortbread is Familiar now: baked 3 times.')
    expect(bakeStatus()).toHaveTextContent('A keepsake for the recipe box: Getting Familiar.')
    // The stage's sound, then the keepsake's stamp, and nothing else.
    expect(played).toEqual(['pick', 'pick', 'pick', 'mix', 'ding', 'mastery-up', 'achievement-unlock'])
    await waitFor(() => expect(saved().recipeBakeCounts).toEqual({ recipe_shortbread: 3 }))

    // The next one is routine: just the count, no stage, no sound.
    played.length = 0
    await user.click(screen.getByRole('button', { name: 'Bake another batch' }))
    await bakeBowl(user, SHORTBREAD)
    await screen.findByRole('heading', { level: 2, name: 'Shortbread' })
    expect(screen.getByText('Already in your Recipe Book, under Classics. Baked 4 times.')).toBeInTheDocument()
    expect(screen.queryByText(/is Familiar now/)).not.toBeInTheDocument()
    expect(played).toEqual(['pick', 'pick', 'pick', 'mix', 'ding'])
  })

  it('never lets one bake’s sounds ring into the next: moving on cancels anything still to come', async () => {
    // Regression: these sounds used to be bare timers that a test (or a quick
    // player) could outrun, so a stamp from one bake could land after the next began.
    const user = userEvent.setup()
    const clock = createManualCues()
    const save = makeSave({ settings: still, discoveredRecipes: found('shortbread'), recipeBakeCounts: { recipe_shortbread: 2 } as never })
    const { played } = startAt(save, '#/bake', clock.schedule)

    await bakeBowl(user, SHORTBREAD)
    await screen.findByRole('heading', { level: 2, name: 'Shortbread' })
    expect(played.at(-1)).toBe('ding')
    expect(clock.waiting()).toEqual(['mastery-up', 'achievement-unlock'])

    await user.click(screen.getByRole('button', { name: 'Bake another batch' }))
    expect(clock.waiting()).toEqual([])
    clock.ringAll()
    expect(played).not.toContain('mastery-up')
    expect(played).not.toContain('achievement-unlock')
  })
})

describe('the Kitchen Keepsakes screen', () => {
  it('shows stamped and not-yet keepsakes in words, and never a hidden one before it’s earned', async () => {
    startAt(makeSave({ settings: still, achievementIds: ['achievement_happy-accident'] as never }), '#/recipe-book/keepsakes')
    await screen.findByRole('heading', { level: 1, name: 'Kitchen Keepsakes' })

    const baking = screen.getByRole('region', { name: 'Baking' })
    expect(within(baking).getByRole('heading', { level: 3, name: 'Happy Accident' })).toBeInTheDocument()
    expect(within(baking).getByText('Stamped')).toBeInTheDocument()
    const discovery = screen.getByRole('region', { name: 'Discovery' })
    expect(within(discovery).getByRole('heading', { level: 3, name: 'Recipe Keeper' }).closest('li')).toHaveTextContent('Not yet')
    expect(within(discovery).getByText('Comes with the cookie tin.')).toBeInTheDocument()
    // Hidden ones aren't anywhere in the page, not even for a screen reader.
    expect(document.body.textContent).not.toMatch(/Secret Ingredient|Written in Gold/)
    expect(screen.getByText('1 of 13 keepsakes stamped.')).toBeInTheDocument()
  })

  it('shows a hidden keepsake once it’s earned, and the recipes the kitchen knows best', async () => {
    const save = makeSave({
      settings: still,
      discoveredRecipes: found('shortbread', 'snowball'),
      recipeBakeCounts: { recipe_shortbread: 10, recipe_snowball: 1 } as never,
    })
    const { saved } = startAt(save, '#/recipe-book/keepsakes')
    await screen.findByRole('heading', { level: 1, name: 'Kitchen Keepsakes' })
    // Earned on load, without baking anything again.
    await screen.findByRole('heading', { level: 3, name: 'Secret Ingredient' })
    expect(saved().achievementIds).toEqual(['achievement_secret-ingredient', 'achievement_getting-familiar', 'achievement_house-speciality'])
    const known = screen.getByRole('region', { name: 'Recipes you know by heart' })
    expect(within(known).getByText('House Favourite · Baked 10 times')).toBeInTheDocument()
    expect(within(known).getByText('As loved as a recipe gets.')).toBeInTheDocument()
  })

  it('is reached from the Recipe Book and works from the keyboard alone', async () => {
    const user = userEvent.setup()
    startAt(makeSave({ settings: still }), '#/recipe-book')
    const link = await screen.findByRole('link', { name: /Kitchen Keepsakes: 0 of 13 stamped/ })
    link.focus()
    await user.keyboard('{Enter}')
    const heading = await screen.findByRole('heading', { level: 1, name: 'Kitchen Keepsakes' })
    await waitFor(() => expect(heading).toHaveFocus())
    await user.tab()
    expect(screen.getByRole('link', { name: 'Back to the Recipe Book' })).toHaveFocus()
  })

  it('suggests something to try, with Bake again for a favourite, that never bakes by itself', async () => {
    const user = userEvent.setup()
    const save = makeSave({
      settings: still,
      discoveredRecipes: found('blondie'),
      recipeBakeCounts: { recipe_blondie: 4 } as never,
      favoriteRecipeIds: ['recipe_blondie'] as never,
    })
    const { saved } = startAt(save, '#/recipe-book/keepsakes')
    const goal = await screen.findByRole('region', { name: 'Something to try' })
    expect(goal).toHaveTextContent('Bake Blondie again. It’s one bake from Well-Loved.')
    await user.click(within(goal).getByRole('button', { name: 'Bake again: Blondie' }))
    await screen.findByRole('heading', { level: 1, name: 'Bake' })
    // Laid out, not baked: Bake again never counts towards mastery.
    expect(saved().recipeBakeCounts).toEqual({ recipe_blondie: 4 })
    expect(saved().bakedCreations).toEqual([])
  })
})

describe('mastery and favourites in the Recipe Book', () => {
  it('says each card’s stage in words, and leaves blank cards blank', async () => {
    startAt(makeSave({ settings: still, discoveredRecipes: found('shortbread'), recipeBakeCounts: { recipe_shortbread: 5 } as never }), '#/recipe-book')
    const card = (await screen.findByRole('article', { name: 'Shortbread' })).closest('li')!
    expect(card).toHaveAttribute('data-mastery', 'well-loved')
    expect(within(card).getByText('Well-Loved')).toBeInTheDocument()
    expect(card).toHaveTextContent('Baked 5 times')
    const blanks = document.querySelectorAll('.book-card--blank')
    expect(blanks.length).toBeGreaterThan(0)
    for (const blank of blanks) {
      expect(blank.querySelector('.book-card__mastery, .book-card__favourite')).toBeNull()
    }
  })

  it('marks a favourite with a real toggle, keeps it, files it under Favourites and puts it in the kitchen', async () => {
    const user = userEvent.setup()
    const { saved, played } = startAt(makeSave({ settings: still, discoveredRecipes: found('shortbread', 'blondie') }), '#/recipe-book')
    const toggle = await screen.findByRole('button', { name: 'Favourite: Blondie' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: /Favourites/ })).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(saved().favoriteRecipeIds).toEqual(['recipe_blondie']))
    expect(played).toContain('favorite')
    // Nothing else moved: no Crumbs, no XP, no bakes.
    expect(saved().progression).toEqual({ crumbs: 0, xp: 0 })
    expect(saved().recipeBakeCounts).toEqual({})

    await user.click(screen.getByRole('button', { name: /Favourites/ }))
    const shelf = screen.getByRole('region', { name: 'Favourites' })
    expect(within(shelf).getByRole('article', { name: 'Blondie' })).toBeInTheDocument()
    expect(within(shelf).queryByRole('article', { name: 'Shortbread' })).not.toBeInTheDocument()

    window.location.hash = '#/'
    await screen.findByRole('heading', { level: 1, name: 'Crumb & Co.' })
    const kitchenFavourites = await screen.findByRole('region', { name: 'Favourites' })
    expect(within(kitchenFavourites).getByRole('button', { name: 'Bake again: Blondie' })).toBeInTheDocument()

    window.location.hash = '#/recipe-book'
    await user.click(await screen.findByRole('button', { name: 'Favourite: Blondie' }))
    await waitFor(() => expect(saved().favoriteRecipeIds).toEqual([]))
  })
})

describe('an Interval 8 kitchen', () => {
  it('gets what it already earned on its first load, with mastery counted only from what it can prove', async () => {
    const v6 = makeV6Save({
      settings: still,
      discoveredRecipes: [
        { recipeId: 'recipe_shortbread', discoveredAt: '2026-08-10T10:00:00.000Z' },
        { recipeId: 'recipe_blondie', discoveredAt: '2026-08-11T10:00:00.000Z' },
      ],
      bakedCreations: [1, 2, 3].map((n) => ({
        id: `creation_00000000-0000-4000-8000-00000000000${n}`,
        ingredientIds: ['ingredient_butter', 'ingredient_flour', 'ingredient_sugar'],
        recipeId: 'recipe_shortbread',
        bakedAt: `2026-08-1${n}T10:00:00.000Z`,
      })),
      // The whole story as Interval 8 had it: the first arc.
      story: { seenSceneIds: STORY_SCENES.filter((placed) => placed.chapter.arc === 1).map((placed) => placed.scene.id) as StorySceneId[] },
    })
    const { saved } = startAt(v6, '#/recipe-book')
    await screen.findByRole('article', { name: 'Shortbread' })
    await waitFor(() => expect(saved().version).toBe(7))
    expect(saved().recipeBakeCounts).toEqual({ recipe_shortbread: 3, recipe_blondie: 1 })
    expect(saved().achievementIds).toEqual(['achievement_getting-familiar', 'achievement_last-page'])
    // The keepsake's plate went into the open cupboard, once, alongside the starter set.
    expect(saved().decorating.ownedDecorationIds.filter((id) => id === 'decoration_cookie-plate')).toHaveLength(1)
    expect(saved().decorating.equippedBySlot).toEqual({})
    expect(saved().progression).toEqual(v6.progression)
  })
})
