import { defineId, type IngredientId } from './ids'
import type { Ingredient } from './types'

/**
 * The ingredient catalog. Hand-authored and static: saves store only ids, so
 * wording and art can change here without touching anyone's save.
 *
 * Never reuse or rename an id once shipped; saves and recipes point at it.
 */

export const FLOUR = defineId('ingredient', 'flour')
export const SUGAR = defineId('ingredient', 'sugar')
export const BUTTER = defineId('ingredient', 'butter')
export const EGG = defineId('ingredient', 'egg')
export const CHOCOLATE_CHIPS = defineId('ingredient', 'chocolate-chips')
export const VANILLA = defineId('ingredient', 'vanilla')
export const COCOA = defineId('ingredient', 'cocoa')
export const CINNAMON = defineId('ingredient', 'cinnamon')
export const OATS = defineId('ingredient', 'oats')
export const PEANUT_BUTTER = defineId('ingredient', 'peanut-butter')
export const HONEY = defineId('ingredient', 'honey')
export const COCONUT = defineId('ingredient', 'coconut')

export const INGREDIENTS: readonly Ingredient[] = [
  {
    id: FLOUR,
    name: 'Flour',
    description: 'Plain white flour. Holds everything else together.',
    category: 'basic',
    art: { form: 'powder', swatch: 'white' },
  },
  {
    id: SUGAR,
    name: 'Sugar',
    description: 'Caster sugar, fine and sparkly.',
    category: 'basic',
    art: { form: 'granules', swatch: 'white' },
  },
  {
    id: BUTTER,
    name: 'Butter',
    description: 'Unsalted, softened on the windowsill.',
    category: 'basic',
    art: { form: 'block', swatch: 'butter' },
  },
  {
    id: EGG,
    name: 'Egg',
    description: 'One egg, for a softer, chewier bake.',
    category: 'basic',
    art: { form: 'eggs', swatch: 'shell' },
  },
  {
    id: CHOCOLATE_CHIPS,
    name: 'Chocolate chips',
    description: 'Little drops of dark chocolate that melt in the oven.',
    category: 'flavouring',
    art: { form: 'chips', swatch: 'chocolate' },
  },
  {
    id: VANILLA,
    name: 'Vanilla',
    description: 'A few drops of vanilla extract. Smells like a warm kitchen.',
    category: 'flavouring',
    art: { form: 'liquid', swatch: 'amber' },
  },
  {
    id: COCOA,
    name: 'Cocoa powder',
    description: 'Unsweetened cocoa: dark, dusty and a little bitter.',
    category: 'flavouring',
    art: { form: 'powder', swatch: 'cocoa' },
  },
  {
    id: CINNAMON,
    name: 'Cinnamon',
    description: 'Ground cinnamon, warm and sweet-smelling.',
    category: 'flavouring',
    art: { form: 'powder', swatch: 'cinnamon' },
  },
  {
    id: OATS,
    name: 'Oats',
    description: 'Rolled oats. Chewy, nutty, and good at soaking up butter.',
    category: 'basic',
    art: { form: 'flakes', swatch: 'oat' },
  },
  {
    id: PEANUT_BUTTER,
    name: 'Peanut butter',
    description: 'Smooth peanut butter, rich enough to hold a dough together on its own.',
    category: 'flavouring',
    art: { form: 'spread', swatch: 'peanut' },
  },
  {
    id: HONEY,
    name: 'Honey',
    description: 'Runny honey from a squeezy bottle. Sticky, golden and floral.',
    category: 'flavouring',
    art: { form: 'liquid', swatch: 'honey' },
  },
  {
    id: COCONUT,
    name: 'Coconut',
    description: 'Sweet shredded coconut that toasts at the edges.',
    category: 'flavouring',
    art: { form: 'flakes', swatch: 'white' },
  },
]

/** What every new kitchen starts with: for now, the whole catalog. */
export const STARTER_PANTRY: readonly IngredientId[] = INGREDIENTS.map((ingredient) => ingredient.id)

const byId = new Map(INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]))

export function findIngredient(id: IngredientId): Ingredient | undefined {
  return byId.get(id)
}

export function getIngredient(id: IngredientId): Ingredient {
  const ingredient = byId.get(id)
  if (!ingredient) throw new Error(`Unknown ingredient "${id}"`)
  return ingredient
}

/** "flour, sugar and butter". An id the catalog no longer has reads as "something old". */
export function listIngredientNames(ids: readonly IngredientId[]): string {
  const names = ids.map((id) => findIngredient(id)?.name.toLowerCase() ?? 'something old')
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
