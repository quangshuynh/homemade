import { defineId, type RecipeId } from './ids'
import { BUTTER, CHOCOLATE_CHIPS, CINNAMON, COCOA, EGG, FLOUR, SUGAR, VANILLA } from './ingredients'
import type { Recipe } from './types'

/**
 * The recipe catalog. Each recipe is an exact set of ingredients; the order
 * they went into the bowl never matters. Every set must be unique, which the
 * catalog tests enforce.
 *
 * Never reuse or rename an id once shipped; saves record discoveries by id.
 */

export const RECIPES: readonly Recipe[] = [
  {
    id: defineId('recipe', 'shortbread'),
    name: 'Shortbread',
    ingredientIds: [FLOUR, SUGAR, BUTTER],
    description: 'Three ingredients, pressed flat and cut into squares. Snaps cleanly and melts on the tongue.',
    descriptors: ['buttery', 'crumbly', 'plain in the best way'],
    look: { dough: 'pale', topping: 'none', shape: 'square' },
    discoveryText: 'The oldest trick in the tin: flour, sugar, butter.',
  },
  {
    id: defineId('recipe', 'sugar-cookie'),
    name: 'Sugar Cookie',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG],
    description: 'Soft in the middle, golden at the edge, with a sparkle of sugar on top.',
    descriptors: ['soft', 'sweet', 'golden'],
    look: { dough: 'golden', topping: 'sugar', shape: 'round' },
    discoveryText: 'An egg made all the difference. A proper cookie.',
  },
  {
    id: defineId('recipe', 'vanilla-kiss'),
    name: 'Vanilla Kiss',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, VANILLA],
    description: 'A pale, tender little cookie that smells of vanilla long after it has cooled.',
    descriptors: ['tender', 'fragrant', 'delicate'],
    look: { dough: 'pale', topping: 'vanilla-flecks', shape: 'round' },
    discoveryText: 'Just a few drops, and the whole kitchen smells of it.',
  },
  {
    id: defineId('recipe', 'chocolate-chip'),
    name: 'Chocolate Chip Cookie',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, CHOCOLATE_CHIPS],
    description: 'Chewy, golden and dotted with pools of melted chocolate.',
    descriptors: ['chewy', 'melty', 'classic'],
    look: { dough: 'golden', topping: 'chips', shape: 'round' },
    discoveryText: 'Everyone’s favourite. Worth writing down.',
  },
  {
    id: defineId('recipe', 'snickerdoodle'),
    name: 'Snickerdoodle',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, CINNAMON],
    description: 'Crackly-topped and rolled in cinnamon sugar. Soft, warm and a bit tangy.',
    descriptors: ['crackly', 'warm', 'cinnamony'],
    look: { dough: 'spiced', topping: 'cinnamon-sugar', shape: 'round' },
    discoveryText: 'A silly name for a very serious cookie.',
  },
  {
    id: defineId('recipe', 'cocoa-crinkle'),
    name: 'Cocoa Crinkle',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, COCOA],
    description: 'Dark and fudgy, with a surface that cracks open as it bakes.',
    descriptors: ['fudgy', 'cracked', 'deep'],
    look: { dough: 'cocoa', topping: 'crinkle', shape: 'round' },
    discoveryText: 'It split open in the oven, and that’s exactly right.',
  },
  {
    id: defineId('recipe', 'double-chocolate'),
    name: 'Double Chocolate Shortbread',
    ingredientIds: [FLOUR, SUGAR, BUTTER, COCOA, CHOCOLATE_CHIPS],
    description: 'Shortbread gone dark: cocoa in the dough and chocolate chips pressed on top.',
    descriptors: ['rich', 'snappy', 'very chocolatey'],
    look: { dough: 'dark', topping: 'chips', shape: 'square' },
    discoveryText: 'No egg, twice the chocolate. Dangerous.',
  },
]

const byId = new Map(RECIPES.map((recipe) => [recipe.id, recipe]))

export function findRecipeById(id: RecipeId): Recipe | undefined {
  return byId.get(id)
}
