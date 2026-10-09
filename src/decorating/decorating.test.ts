import { describe, expect, it } from 'vitest'
import { bake, recordBake } from '../domain/baking'
import { defineId, type CreationId, type DecorationId, type RecipeId } from '../domain/ids'
import { RARITIES } from '../domain/progression'
import { RECIPE_FAMILIES, VISIBLE_RECIPES } from '../domain/recipeBook'
import { findRecipeById, RECIPES } from '../domain/recipes'
import type { GameSave } from '../domain/types'
import { findChapter, STORY_SCENES } from '../story/chapters'
import { seeScene } from '../story/progress'
import { makeSave } from '../test/fixtures'
import { CUPBOARD_CHAPTER_ID, DECORATION_THEMES, DECORATIONS, findDecoration, themeDecorations } from './catalog'
import {
  clearSlot,
  decoratingOpen,
  decorationStatus,
  equipDecoration,
  equippedIn,
  grantEarnedDecorations,
  ownedForSlot,
  purchaseDecoration,
} from './rules'
import { DECORATION_SLOTS, SLOT_INFO } from './slots'

const NOW = new Date('2026-10-01T12:00:00.000Z')
const decoration = (slug: string) => defineId('decoration', slug)
const found = (...ids: string[]) => ids.map((recipeId) => ({ recipeId: recipeId as RecipeId, discoveredAt: NOW.toISOString() }))

/** Every scene up to and including the one that ends Chapter 5: the cupboard is open. */
const SCENES_TO_CUPBOARD = STORY_SCENES.slice(0, STORY_SCENES.findIndex((placed) => placed.chapter.id === CUPBOARD_CHAPTER_ID) + 1).map(
  (placed) => placed.scene.id,
)

const STARTER = DECORATIONS.filter((entry) => entry.unlock.type === 'chapter-complete')

/** A late kitchen with the brass key's chapter read and the starter set handed over. */
function openKitchen(overrides: Partial<GameSave> = {}): GameSave {
  const save = makeSave({
    discoveredRecipes: found('recipe_shortbread', 'recipe_millionaires-shortbread'),
    progression: { crumbs: 200, xp: 2000 },
    story: { seenSceneIds: [...SCENES_TO_CUPBOARD] },
    ...overrides,
  })
  return grantEarnedDecorations(save).save
}

function equip(save: GameSave, slug: string): GameSave {
  const id = decoration(slug)
  const result = equipDecoration(save, findDecoration(id)!.slot, id)
  if (!result.ok) throw new Error(result.reason)
  return result.save
}

describe('the decoration catalog', () => {
  it('is small and curated: 12–18 pieces, with unique ids and names', () => {
    expect(DECORATIONS.length).toBeGreaterThanOrEqual(12)
    expect(DECORATIONS.length).toBeLessThanOrEqual(18)
    expect(new Set(DECORATIONS.map((entry) => entry.id)).size).toBe(DECORATIONS.length)
    expect(new Set(DECORATIONS.map((entry) => entry.name)).size).toBe(DECORATIONS.length)
    for (const entry of DECORATIONS) expect(entry.id, entry.name).toMatch(/^decoration_[a-z0-9-]+$/)
  })

  it('names pieces without an article, since the cupboard says “put out the …” and “buy the …”', () => {
    for (const entry of DECORATIONS) expect(entry.name).not.toMatch(/^(a|an|the) /i)
  })

  it('puts every piece in a real spot, and gives every spot something to choose', () => {
    for (const entry of DECORATIONS) expect(DECORATION_SLOTS, entry.name).toContain(entry.slot)
    for (const slot of DECORATION_SLOTS) {
      expect(DECORATIONS.filter((entry) => entry.slot === slot).length, slot).toBeGreaterThanOrEqual(2)
      expect(SLOT_INFO[slot].id).toBe(slot)
    }
  })

  it('has two or three light themes of a few pieces each, with every piece in a real theme', () => {
    expect(DECORATION_THEMES.length).toBeGreaterThanOrEqual(2)
    expect(DECORATION_THEMES.length).toBeLessThanOrEqual(3)
    for (const theme of DECORATION_THEMES) {
      const pieces = themeDecorations(theme.id)
      expect(pieces.length, theme.id).toBeGreaterThanOrEqual(3)
      // One per spot: a whole theme can always be out at once.
      expect(new Set(pieces.map((piece) => piece.slot)).size, theme.id).toBe(pieces.length)
    }
    const themes = DECORATION_THEMES.map((theme) => theme.id)
    for (const entry of DECORATIONS) if (entry.theme) expect(themes, entry.name).toContain(entry.theme)
  })

  it('only points unlock rules at things that exist', () => {
    const families = RECIPE_FAMILIES.map((family) => family.id)
    for (const { unlock, name } of DECORATIONS) {
      if (unlock.type === 'chapter-complete') expect(findChapter(unlock.chapterId), name).toBeDefined()
      if (unlock.type === 'family-complete') expect(families, name).toContain(unlock.familyId)
      if (unlock.type === 'first-rarity') {
        expect(RARITIES, name).toContain(unlock.rarity)
        expect(RECIPES.some((recipe) => recipe.rarity === unlock.rarity && !recipe.isSecret), name).toBe(true)
      }
      if (unlock.type === 'family-complete') expect(VISIBLE_RECIPES.some((recipe) => recipe.family === unlock.familyId), name).toBe(true)
    }
  })

  it('opens with a free starter set from the cupboard, covering most of the kitchen', () => {
    expect(STARTER.length).toBeGreaterThanOrEqual(5)
    expect(new Set(STARTER.map((entry) => entry.slot)).size).toBeGreaterThanOrEqual(5)
    for (const entry of STARTER) expect(entry.unlock).toEqual({ type: 'chapter-complete', chapterId: CUPBOARD_CHAPTER_ID })
  })

  it('earns more than it sells, and sells only at modest prices', () => {
    const forSale = DECORATIONS.filter((entry) => entry.unlock.type === 'crumbs')
    expect(forSale.length).toBeGreaterThan(0)
    expect(forSale.length).toBeLessThan(DECORATIONS.length / 2)
    for (const entry of forSale) {
      const price = entry.unlock.type === 'crumbs' ? entry.unlock.price : 0
      expect(Number.isInteger(price) && price > 0 && price <= 100, entry.name).toBe(true)
    }
    // Each milestone earns something, and earned keepsakes are never for sale (one way in, each).
    for (const type of ['first-rarity', 'first-secret', 'family-complete'] as const) {
      expect(DECORATIONS.some((entry) => entry.unlock.type === type), type).toBe(true)
    }
  })

  it('is cosmetic by construction: a piece is a name, a spot, a look and a way in, nothing more', () => {
    for (const entry of DECORATIONS) {
      expect(Object.keys(entry).sort(), entry.name).toEqual(
        entry.theme ? ['description', 'id', 'name', 'slot', 'theme', 'unlock', 'visual'] : ['description', 'id', 'name', 'slot', 'unlock', 'visual'],
      )
    }
  })
})

describe('the cupboard', () => {
  it('stays shut, and hands nothing over, until Chapter 5 is finished', () => {
    const almost = makeSave({
      discoveredRecipes: found('recipe_millionaires-shortbread', 'recipe_honey-flapjack'),
      story: { seenSceneIds: SCENES_TO_CUPBOARD.slice(0, -1) },
    })
    expect(decoratingOpen(almost)).toBe(false)
    expect(grantEarnedDecorations(almost)).toEqual({ save: almost, granted: [] })
    expect(purchaseDecoration({ ...almost, progression: { crumbs: 500, xp: 0 } }, decoration('copper-crock'))).toEqual({ ok: false, reason: 'closed' })
  })

  it('opens with the starter set the moment the last page of Chapter 5 is seen, read or skipped', () => {
    const before = makeSave({
      discoveredRecipes: found('recipe_shortbread', 'recipe_millionaires-shortbread'),
      story: { seenSceneIds: SCENES_TO_CUPBOARD.slice(0, -1) },
    })
    const seen = seeScene(before, SCENES_TO_CUPBOARD.at(-1)!)
    if (!seen.ok) throw new Error(seen.reason)
    const { save, granted } = grantEarnedDecorations(seen.save)
    expect(decoratingOpen(save)).toBe(true)
    // The starter set, plus the gold seal: the Mythic that opened Chapter 5 is already in the book.
    expect(granted.map((entry) => entry.id)).toEqual([...STARTER.map((entry) => entry.id), decoration('gold-seal-frame')])
    expect(save.decorating.ownedDecorationIds).toEqual(granted.map((entry) => entry.id))
    // Nothing is put out for them.
    expect(save.decorating.equippedBySlot).toEqual({})
  })
})

describe('earned decorations', () => {
  it('are handed over once, however often they’re looked for', () => {
    const once = openKitchen()
    const again = grantEarnedDecorations(once)
    expect(again.granted).toEqual([])
    expect(again.save).toBe(once)
    expect(new Set(once.decorating.ownedDecorationIds).size).toBe(once.decorating.ownedDecorationIds.length)
  })

  it('arrive retroactively: everything earned before the cupboard opened is waiting in it', () => {
    const veteran = openKitchen({
      discoveredRecipes: found(
        ...VISIBLE_RECIPES.filter((recipe) => recipe.family === 'classics').map((recipe) => recipe.id),
        'recipe_millionaires-shortbread',
        'recipe_honey-flapjack',
        'recipe_snowball',
      ),
    })
    for (const slug of ['gold-seal-frame', 'little-lemon-tree', 'recipe-scrap-frame', 'old-rolling-pin']) {
      expect(veteran.decorating.ownedDecorationIds, slug).toContain(decoration(slug))
    }
    // Fruity isn't finished, and nothing for sale is ever handed over.
    expect(veteran.decorating.ownedDecorationIds).not.toContain(decoration('fruit-print-towel'))
    expect(veteran.decorating.ownedDecorationIds).not.toContain(decoration('copper-crock'))
  })

  it('arrive with the bake that earns them, and a rebake earns nothing more', () => {
    const start = openKitchen({ discoveredRecipes: found('recipe_millionaires-shortbread') })
    expect(start.decorating.ownedDecorationIds).not.toContain(decoration('little-lemon-tree'))
    const first = recordBake(start, bake(findRecipeById('recipe_honey-flapjack' as RecipeId)!.ingredientIds), NOW, 'creation_1' as CreationId)
    const granted = grantEarnedDecorations(first.save)
    expect(granted.granted.map((entry) => entry.id)).toEqual([decoration('little-lemon-tree')])

    const rebake = recordBake(granted.save, bake(findRecipeById('recipe_honey-flapjack' as RecipeId)!.ingredientIds), NOW, 'creation_2' as CreationId)
    expect(grantEarnedDecorations(rebake.save).granted).toEqual([])
    const mythicAgain = recordBake(rebake.save, bake(findRecipeById('recipe_millionaires-shortbread' as RecipeId)!.ingredientIds), NOW, 'creation_3' as CreationId)
    const after = grantEarnedDecorations(mythicAgain.save)
    expect(after.granted).toEqual([])
    expect(after.save.decorating.ownedDecorationIds.filter((id) => id === decoration('gold-seal-frame'))).toHaveLength(1)
  })

  it('aren’t handed over again by replaying the story', () => {
    const open = openKitchen()
    const replay = seeScene(open, SCENES_TO_CUPBOARD.at(-1)!)
    if (!replay.ok) throw new Error(replay.reason)
    expect(replay.save).toBe(open)
    expect(grantEarnedDecorations(replay.save).granted).toEqual([])
  })

  it('are kept for good, even when the milestone wouldn’t count any more', () => {
    // The family was finished once; a later catalog adds a card to it. The towel stays.
    const fruity = VISIBLE_RECIPES.filter((recipe) => recipe.family === 'fruity').map((recipe) => recipe.id)
    const towel = openKitchen({ discoveredRecipes: found(...fruity, 'recipe_millionaires-shortbread') })
    expect(towel.decorating.ownedDecorationIds).toContain(decoration('fruit-print-towel'))
    const fewer = { ...towel, discoveredRecipes: towel.discoveredRecipes.slice(1) }
    expect(grantEarnedDecorations(fewer).save.decorating.ownedDecorationIds).toContain(decoration('fruit-print-towel'))
  })
})

describe('owning and putting out', () => {
  it('puts an owned piece in its own spot, and only there', () => {
    const save = equip(openKitchen(), 'gingham-towel')
    expect(equippedIn(save, 'textile')?.id).toBe(decoration('gingham-towel'))
    expect(equipDecoration(save, 'wall', decoration('cream-cookie-jar'))).toEqual({ ok: false, reason: 'wrong-slot' })
  })

  it('swaps what’s in a spot, keeping the old piece owned', () => {
    const first = equip(openKitchen(), 'framed-recipe-card')
    const result = equipDecoration(first, 'wall', decoration('gold-seal-frame'))
    if (!result.ok) throw new Error(result.reason)
    expect(result.replaced?.id).toBe(decoration('framed-recipe-card'))
    expect(equippedIn(result.save, 'wall')?.id).toBe(decoration('gold-seal-frame'))
    expect(result.save.decorating.ownedDecorationIds).toContain(decoration('framed-recipe-card'))
    expect(ownedForSlot(result.save, 'wall').map((entry) => entry.id)).toEqual([decoration('framed-recipe-card'), decoration('gold-seal-frame')])
  })

  it('won’t put out what isn’t owned, isn’t known, or is already out', () => {
    const save = openKitchen()
    expect(equipDecoration(save, 'counter-right', decoration('copper-crock'))).toEqual({ ok: false, reason: 'not-owned' })
    expect(equipDecoration(save, 'wall', decoration('neon-sign'))).toEqual({ ok: false, reason: 'unknown' })
    const out = equip(save, 'potted-thyme')
    expect(equipDecoration(out, 'plant', decoration('potted-thyme'))).toEqual({ ok: false, reason: 'already-out' })
  })

  it('clears a spot back to the cupboard, and clearing an empty spot changes nothing', () => {
    const out = equip(openKitchen(), 'cafe-curtains')
    const cleared = clearSlot(out, 'window')
    expect(cleared.cleared?.id).toBe(decoration('cafe-curtains'))
    expect(equippedIn(cleared.save, 'window')).toBeNull()
    expect(cleared.save.decorating.equippedBySlot).toEqual({})
    expect(cleared.save.decorating.ownedDecorationIds).toContain(decoration('cafe-curtains'))
    expect(clearSlot(cleared.save, 'window').save).toBe(cleared.save)
  })

  it('ignores a piece the catalog no longer has, without breaking anything', () => {
    const retired = decoration('retired-vase') as DecorationId
    const save = openKitchen()
    const odd: GameSave = {
      ...save,
      decorating: { ...save.decorating, ownedDecorationIds: [...save.decorating.ownedDecorationIds, retired], equippedBySlot: { shelf: retired } },
    }
    expect(equippedIn(odd, 'shelf')).toBeNull()
    expect(grantEarnedDecorations(odd).save.decorating.ownedDecorationIds).toContain(retired)
  })
})

describe('buying with Crumbs', () => {
  it('checks, charges and hands over in one next save, and leaves the old one untouched', () => {
    const save = openKitchen({ progression: { crumbs: 100, xp: 2000 } })
    const result = purchaseDecoration(save, decoration('copper-crock'))
    if (!result.ok) throw new Error(result.reason)
    expect(result.spent).toBe(60)
    expect(result.save.progression).toEqual({ crumbs: 40, xp: 2000 })
    expect(result.save.decorating.ownedDecorationIds.at(-1)).toBe(decoration('copper-crock'))
    expect(save.progression.crumbs).toBe(100)
    expect(save.decorating.ownedDecorationIds).not.toContain(decoration('copper-crock'))
  })

  it('refuses a second purchase, a short purse, and anything that’s earned rather than sold', () => {
    const bought = purchaseDecoration(openKitchen({ progression: { crumbs: 200, xp: 0 } }), decoration('striped-linen-towel'))
    if (!bought.ok) throw new Error(bought.reason)
    expect(purchaseDecoration(bought.save, decoration('striped-linen-towel'))).toEqual({ ok: false, reason: 'owned' })
    expect(purchaseDecoration(openKitchen({ progression: { crumbs: 59, xp: 0 } }), decoration('copper-crock'))).toEqual({ ok: false, reason: 'crumbs' })
    expect(purchaseDecoration(openKitchen(), decoration('fruit-print-towel'))).toEqual({ ok: false, reason: 'not-for-sale' })
    expect(purchaseDecoration(openKitchen(), decoration('gingham-towel'))).toEqual({ ok: false, reason: 'owned' })
  })

  it('says what a piece needs, in the same terms', () => {
    const save = openKitchen({ progression: { crumbs: 50, xp: 0 } })
    expect(decorationStatus(save, findDecoration(decoration('copper-crock'))!)).toEqual({ kind: 'for-sale', price: 60, affordable: false, short: 10 })
    expect(decorationStatus(save, findDecoration(decoration('striped-linen-towel'))!)).toEqual({ kind: 'for-sale', price: 40, affordable: true, short: 0 })
    expect(decorationStatus(save, findDecoration(decoration('fruit-print-towel'))!)).toEqual({
      kind: 'not-yet',
      rule: { type: 'family-complete', familyId: 'fruity' },
    })
    expect(decorationStatus(save, findDecoration(decoration('gingham-towel'))!)).toEqual({ kind: 'owned' })
  })
})

describe('decorating is cosmetic', () => {
  it('never touches XP, the pantry, the book, memories or the story', () => {
    let save = openKitchen({ progression: { crumbs: 300, xp: 1234 } })
    const before = { ...save, decorating: undefined, progression: undefined }
    save = equip(save, 'gingham-towel')
    const bought = purchaseDecoration(save, decoration('bakery-sign'))
    if (!bought.ok) throw new Error(bought.reason)
    save = equip(bought.save, 'bakery-sign')
    save = clearSlot(save, 'textile').save
    expect({ ...save, decorating: undefined, progression: undefined }).toEqual(before)
    // Only Crumbs move, and only by the price.
    expect(save.progression).toEqual({ crumbs: 220, xp: 1234 })
  })

  it('changes nothing about a bake: the same result and reward with or without a decorated kitchen', () => {
    const plain = makeSave()
    const decorated = equip(equip(openKitchen({ discoveredRecipes: [], progression: plain.progression }), 'framed-recipe-card'), 'potted-thyme')
    for (const recipe of RECIPES.slice(0, 10)) {
      const a = recordBake(plain, bake(recipe.ingredientIds), NOW, 'creation_a' as CreationId).outcome
      const b = recordBake(decorated, bake(recipe.ingredientIds), NOW, 'creation_a' as CreationId).outcome
      expect(b, recipe.name).toEqual(a)
    }
  })
})

describe('Marmalade’s decorating remarks', () => {
  it('says something the first time anything goes out, and never again', () => {
    const first = equipDecoration(openKitchen(), 'textile', decoration('gingham-towel'))
    if (!first.ok) throw new Error(first.reason)
    expect(first.moment).toEqual({ id: 'first-equip' })
    expect(first.save.decorating.noticedMomentIds).toEqual(['first-equip'])
    const cleared = clearSlot(first.save, 'textile').save
    const again = equipDecoration(cleared, 'textile', decoration('gingham-towel'))
    if (!again.ok) throw new Error(again.reason)
    expect(again.moment).toBeNull()
  })

  it('notices a whole theme out at once, once, over the smaller remarks', () => {
    let save = openKitchen()
    for (const slug of ['gingham-towel', 'cream-cookie-jar', 'framed-recipe-card']) save = equip(save, slug)
    const last = equipDecoration(save, 'window', decoration('cafe-curtains'))
    if (!last.ok) throw new Error(last.reason)
    expect(last.moment).toEqual({ id: 'first-set', theme: 'cottage' })
    const swapped = equip(clearSlot(last.save, 'window').save, 'cafe-curtains')
    expect(swapped.decorating.noticedMomentIds.filter((id) => id === 'first-set')).toHaveLength(1)
  })

  it('doesn’t say “first thing out” on the second thing, when the first already got a bigger remark', () => {
    const save = openKitchen({ discoveredRecipes: found('recipe_millionaires-shortbread', 'recipe_snowball') })
    const scrap = equipDecoration(save, 'shelf', decoration('recipe-scrap-frame'))
    if (!scrap.ok) throw new Error(scrap.reason)
    expect(scrap.moment).toEqual({ id: 'scrap-frame' })
    expect(scrap.save.decorating.noticedMomentIds).toEqual(['scrap-frame', 'first-equip'])
    const next = equipDecoration(scrap.save, 'plant', decoration('potted-thyme'))
    if (!next.ok) throw new Error(next.reason)
    expect(next.moment).toBeNull()
  })

  it('has a word about the framed scrap from the recipe box, once', () => {
    const save = equip(openKitchen({ discoveredRecipes: found('recipe_millionaires-shortbread', 'recipe_snowball') }), 'gingham-towel')
    const scrap = equipDecoration(save, 'shelf', decoration('recipe-scrap-frame'))
    if (!scrap.ok) throw new Error(scrap.reason)
    expect(scrap.moment).toEqual({ id: 'scrap-frame' })
  })
})
