import { defineId, type RecipeId } from './ids'
import {
  BUTTER,
  CHOCOLATE_CHIPS,
  CINNAMON,
  COCOA,
  COCONUT,
  EGG,
  FLOUR,
  HONEY,
  OATS,
  PEANUT_BUTTER,
  SUGAR,
  VANILLA,
} from './ingredients'
import type { Recipe } from './types'

/**
 * The recipe catalog. Each recipe is an exact set of ingredients; the order
 * they went into the bowl never matters. Every set must be unique, which the
 * catalog tests enforce.
 *
 * Never reuse or rename an id once shipped; saves record discoveries by id.
 *
 * Rarity is part of the recipe, fixed here: it never changes between bakes.
 * Keep it mostly grounded. Starter recipes are common; a recipe earns a
 * higher rarity by being genuinely unusual to find (no flour, two kinds of
 * chocolate, ingredients that only arrive late).
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
    rarity: 'common',
  },
  {
    id: defineId('recipe', 'sugar-cookie'),
    name: 'Sugar Cookie',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG],
    description: 'Soft in the middle, golden at the edge, with a sparkle of sugar on top.',
    descriptors: ['soft', 'sweet', 'golden'],
    look: { dough: 'golden', topping: 'sugar', shape: 'round' },
    discoveryText: 'An egg made all the difference. A proper cookie.',
    rarity: 'common',
  },
  {
    id: defineId('recipe', 'vanilla-kiss'),
    name: 'Vanilla Kiss',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, VANILLA],
    description: 'A pale, tender little cookie that smells of vanilla long after it has cooled.',
    descriptors: ['tender', 'fragrant', 'delicate'],
    look: { dough: 'pale', topping: 'vanilla-flecks', shape: 'round' },
    discoveryText: 'Just a few drops, and the whole kitchen smells of it.',
    rarity: 'uncommon',
  },
  {
    id: defineId('recipe', 'chocolate-chip'),
    name: 'Chocolate Chip Cookie',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, CHOCOLATE_CHIPS],
    description: 'Chewy, golden and dotted with pools of melted chocolate.',
    descriptors: ['chewy', 'melty', 'classic'],
    look: { dough: 'golden', topping: 'chips', shape: 'round' },
    discoveryText: 'Everyone’s favourite. Worth writing down.',
    rarity: 'common',
  },
  {
    id: defineId('recipe', 'snickerdoodle'),
    name: 'Snickerdoodle',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, CINNAMON],
    description: 'Crackly-topped and rolled in cinnamon sugar. Soft, warm and a bit tangy.',
    descriptors: ['crackly', 'warm', 'cinnamony'],
    look: { dough: 'spiced', topping: 'cinnamon-sugar', shape: 'round' },
    discoveryText: 'A silly name for a very serious cookie.',
    rarity: 'uncommon',
  },
  {
    id: defineId('recipe', 'cocoa-crinkle'),
    name: 'Cocoa Crinkle',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, COCOA],
    description: 'Dark and fudgy, with a surface that cracks open as it bakes.',
    descriptors: ['fudgy', 'cracked', 'deep'],
    look: { dough: 'cocoa', topping: 'crinkle', shape: 'round' },
    discoveryText: 'It split open in the oven, and that’s exactly right.',
    rarity: 'uncommon',
  },
  {
    id: defineId('recipe', 'double-chocolate'),
    name: 'Double Chocolate Shortbread',
    ingredientIds: [FLOUR, SUGAR, BUTTER, COCOA, CHOCOLATE_CHIPS],
    description: 'Shortbread gone dark: cocoa in the dough and chocolate chips pressed on top.',
    descriptors: ['rich', 'snappy', 'very chocolatey'],
    look: { dough: 'dark', topping: 'chips', shape: 'square' },
    discoveryText: 'No egg, twice the chocolate. Dangerous.',
    rarity: 'epic',
  },
  // ---- Interval 3 ----
  {
    id: defineId('recipe', 'oatmeal-cookie'),
    name: 'Oatmeal Cookie',
    ingredientIds: [FLOUR, SUGAR, BUTTER, EGG, OATS],
    description: 'Chewy and rough-edged, with oats you can see and a middle that stays soft for days.',
    descriptors: ['chewy', 'hearty', 'wholesome'],
    look: { dough: 'golden', topping: 'oats', shape: 'round' },
    discoveryText: 'A handful of oats turned a cookie into breakfast. Almost.',
    rarity: 'common',
  },
  {
    id: defineId('recipe', 'peanut-butter-cookie'),
    name: 'Peanut Butter Cookie',
    ingredientIds: [PEANUT_BUTTER, SUGAR, EGG],
    description: 'No flour at all. Soft, sandy and pressed flat with a fork, the way it always has been.',
    descriptors: ['nutty', 'sandy', 'fork-pressed'],
    look: { dough: 'nutty', topping: 'fork-marks', shape: 'round' },
    discoveryText: 'Three things and a fork. Who needs flour?',
    rarity: 'rare',
  },
  {
    id: defineId('recipe', 'peanut-butter-chocolate'),
    name: 'Peanut Butter Chocolate Chip',
    ingredientIds: [PEANUT_BUTTER, SUGAR, EGG, CHOCOLATE_CHIPS],
    description: 'The flourless peanut butter cookie, studded with chocolate that goes soft in the heat.',
    descriptors: ['nutty', 'melty', 'rich'],
    look: { dough: 'nutty', topping: 'chips', shape: 'round' },
    discoveryText: 'Peanut butter and chocolate. Of course they belong together.',
    rarity: 'epic',
  },
  {
    id: defineId('recipe', 'honey-flapjack'),
    name: 'Honey Flapjack',
    ingredientIds: [OATS, BUTTER, HONEY],
    description: 'Oats pressed into a tin with melted butter and honey, baked golden and cut into bars.',
    descriptors: ['sticky', 'golden', 'chewy'],
    look: { dough: 'golden', topping: 'oats', shape: 'square' },
    discoveryText: 'Sticky fingers, and worth it.',
    rarity: 'legendary',
  },
  {
    id: defineId('recipe', 'coconut-macaroon'),
    name: 'Coconut Macaroon',
    ingredientIds: [COCONUT, SUGAR, EGG],
    description: 'Little mounds of coconut, crisp and toasted outside, soft and sweet within.',
    descriptors: ['toasty', 'chewy', 'sweet'],
    look: { dough: 'pale', topping: 'coconut', shape: 'round' },
    discoveryText: 'Egg and sugar held the coconut together, just.',
    rarity: 'rare',
  },
]

const byId = new Map(RECIPES.map((recipe) => [recipe.id, recipe]))

export function findRecipeById(id: RecipeId): Recipe | undefined {
  return byId.get(id)
}
