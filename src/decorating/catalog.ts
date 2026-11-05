import { defineId, type DecorationId } from '../domain/ids'
import type { DecorationDefinition, DecorationTheme, DecorationThemeId } from './types'

/**
 * The decoration catalog: everything that can go in the kitchen's spots.
 * Small and curated on purpose. Hand-authored and static: saves store only
 * ids, so wording and drawings can change here freely.
 *
 * Three ways in, never more than one per thing:
 * - the old cupboard, opened at the end of Chapter 5 (the starter set);
 * - something the player has already done (a first Mythic, a first secret,
 *   a whole family found, a first Legendary, or a keepsake earned), granted
 *   once and kept for good;
 * - a modest price in Crumbs, for some of the themed pieces.
 *
 * All of it is cosmetic. Nothing here is read by a baking, reward, level or
 * ingredient rule, and no decoration makes anything faster, luckier or rarer.
 *
 * Never reuse or rename an id once shipped; saves record ownership by id.
 */

/** The chapter whose last page puts the brass key in the cupboard door. */
export const CUPBOARD_CHAPTER_ID = defineId('chapter', 'last-card')

const fromCupboard = { type: 'chapter-complete', chapterId: CUPBOARD_CHAPTER_ID } as const

export const DECORATION_THEMES: readonly DecorationTheme[] = [
  { id: 'cottage', name: 'Cottage' },
  { id: 'warm-bakery', name: 'Warm Bakery' },
  { id: 'garden-kitchen', name: 'Garden Kitchen' },
]

export const DECORATIONS: readonly DecorationDefinition[] = [
  // ---- In the old cupboard: the starter set, free, the moment it opens ----
  {
    id: defineId('decoration', 'gingham-towel'),
    name: 'Gingham tea towel',
    description: 'Red and white checks, soft from a hundred washes.',
    slot: 'textile',
    theme: 'cottage',
    unlock: fromCupboard,
    visual: { kind: 'towel', pattern: 'gingham' },
  },
  {
    id: defineId('decoration', 'cream-cookie-jar'),
    name: 'Cream cookie jar',
    description: 'A fat ceramic jar with a chipped lid. It always sat right here.',
    slot: 'counter-left',
    theme: 'cottage',
    unlock: fromCupboard,
    visual: { kind: 'jar', glaze: 'cream' },
  },
  {
    id: defineId('decoration', 'framed-recipe-card'),
    name: 'Framed recipe card',
    description: 'An old index card in a plain wooden frame. Too faded to read now.',
    slot: 'wall',
    theme: 'cottage',
    unlock: fromCupboard,
    visual: { kind: 'frame', picture: 'recipe-card', moulding: 'wood' },
  },
  {
    id: defineId('decoration', 'cafe-curtains'),
    name: 'Café curtains',
    description: 'Half-height cotton curtains on a wire, for the bottom of the window.',
    slot: 'window',
    theme: 'cottage',
    unlock: fromCupboard,
    visual: { kind: 'curtains' },
  },
  {
    id: defineId('decoration', 'potted-thyme'),
    name: 'Potted thyme',
    description: 'A terracotta pot of thyme that has somehow survived in the dark.',
    slot: 'plant',
    theme: 'garden-kitchen',
    unlock: fromCupboard,
    visual: { kind: 'pot-plant', plant: 'thyme' },
  },
  {
    id: defineId('decoration', 'wooden-spoon-crock'),
    name: 'Wooden spoon crock',
    description: 'A stoneware crock full of wooden spoons, each worn flat on one side.',
    slot: 'counter-right',
    unlock: fromCupboard,
    visual: { kind: 'crock', material: 'stoneware' },
  },

  // ---- Keepsakes: earned once by something already done in the kitchen ----
  {
    id: defineId('decoration', 'gold-seal-frame'),
    name: 'Framed gold seal',
    description: 'A gold-leaf seal in a gilt frame, for the day this kitchen wrote down a Mythic.',
    slot: 'wall',
    unlock: { type: 'first-rarity', rarity: 'mythic' },
    visual: { kind: 'frame', picture: 'gold-seal', moulding: 'gilt' },
  },
  {
    id: defineId('decoration', 'little-lemon-tree'),
    name: 'Little lemon tree',
    description: 'A lemon tree no taller than a cat, for a first Legendary.',
    slot: 'plant',
    unlock: { type: 'first-rarity', rarity: 'legendary' },
    visual: { kind: 'pot-plant', plant: 'lemon-tree' },
  },
  {
    id: defineId('decoration', 'recipe-scrap-frame'),
    name: 'Framed scrap',
    description: 'A torn scrap of pencil in a tiny frame, propped up. For a first secret.',
    slot: 'shelf',
    unlock: { type: 'first-secret' },
    visual: { kind: 'scrap-frame' },
  },
  {
    id: defineId('decoration', 'old-rolling-pin'),
    name: 'Old rolling pin',
    description: 'Heavy, smooth and dark with use, on its own little stand. For every Classics card.',
    slot: 'counter-right',
    unlock: { type: 'family-complete', familyId: 'classics' },
    visual: { kind: 'rolling-pin' },
  },
  {
    id: defineId('decoration', 'fruit-print-towel'),
    name: 'Fruit-print towel',
    description: 'Lemons and strawberries printed all over. For every Fruity card.',
    slot: 'textile',
    unlock: { type: 'family-complete', familyId: 'fruity' },
    visual: { kind: 'towel', pattern: 'fruit' },
  },
  // Interval 11: two more dividers finished, for the window and the plant spot, which had the fewest pieces.
  {
    id: defineId('decoration', 'orange-garland'),
    name: 'Dried orange garland',
    description: 'Slices of orange dried slowly in a low oven and strung across the window. For every Warm & Spiced card.',
    slot: 'window',
    unlock: { type: 'family-complete', familyId: 'warm-spiced' },
    visual: { kind: 'orange-garland' },
  },
  {
    id: defineId('decoration', 'coffee-plant'),
    name: 'Potted coffee plant',
    description: 'Glossy leaves and a few red cherries. It will never make a cup, but it tries. For every Chocolate card.',
    slot: 'plant',
    unlock: { type: 'family-complete', familyId: 'chocolate' },
    visual: { kind: 'pot-plant', plant: 'coffee' },
  },

  // ---- Keepsake rewards (Interval 9): each arrives with the keepsake that names it ----
  {
    id: defineId('decoration', 'cookie-tin'),
    name: 'Cookie tin',
    description: 'A dented blue tin with a windmill on the lid. For ten cards back in the box.',
    slot: 'shelf',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'recipe-keeper') },
    visual: { kind: 'cookie-tin' },
  },
  {
    id: defineId('decoration', 'embroidered-mitt'),
    name: 'Embroidered oven mitt',
    description: 'Quilted, singed at one thumb, with a little cookie stitched on the back. For half the box found.',
    slot: 'textile',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'half-full') },
    visual: { kind: 'oven-mitt' },
  },
  {
    id: defineId('decoration', 'ribboned-bundle'),
    name: 'Ribboned recipe bundle',
    description: 'Old cards tied up with red ribbon, the way someone kept their best ones. For four dividers done.',
    slot: 'shelf',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'full-shelf') },
    visual: { kind: 'recipe-bundle' },
  },
  {
    id: defineId('decoration', 'cookie-plate'),
    name: 'Favourite-cookie plate',
    description: 'A blue-rimmed plate, propped up, with three cookies on it that nobody is allowed to eat. For a first Familiar recipe.',
    slot: 'counter-left',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'getting-familiar') },
    visual: { kind: 'cookie-plate' },
  },
  {
    id: defineId('decoration', 'trophy-spoon'),
    name: 'Tiny trophy spoon',
    description: 'A silver teaspoon on a little stand, engraved “House Speciality”. For a first House Favourite.',
    slot: 'shelf',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'house-speciality') },
    visual: { kind: 'trophy-spoon' },
  },
  {
    id: defineId('decoration', 'marmalade-figurine'),
    name: 'Marmalade figurine',
    description: 'A small china cat, ginger, curled up asleep. Marmalade insists it looks nothing like her. For every spot filled.',
    slot: 'shelf',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'lived-in') },
    visual: { kind: 'cat-figurine' },
  },

  // ---- The story's own (Interval 10): arrives with the keepsake for finishing the second arc ----
  {
    id: defineId('decoration', 'fair-day-photograph'),
    name: 'Fair-day photograph',
    description: 'The first winter fair, in a plain wooden frame, torn corner and all. For everything in the tin behind the cupboard.',
    slot: 'wall',
    unlock: { type: 'achievement', achievementId: defineId('achievement', 'kept-in-the-tin') },
    visual: { kind: 'frame', picture: 'photograph', moulding: 'wood' },
  },

  // ---- For Crumbs: themed pieces, just for looks ----
  {
    id: defineId('decoration', 'copper-crock'),
    name: 'Copper utensil crock',
    description: 'A polished copper pot of whisks and spatulas, warm as a bakery window.',
    slot: 'counter-right',
    theme: 'warm-bakery',
    unlock: { type: 'crumbs', price: 60 },
    visual: { kind: 'crock', material: 'copper' },
  },
  {
    id: defineId('decoration', 'bread-board'),
    name: 'Bread board',
    description: 'A thick board propped up at the back, with a crusty loaf on it.',
    slot: 'counter-left',
    theme: 'warm-bakery',
    unlock: { type: 'crumbs', price: 70 },
    visual: { kind: 'bread-board' },
  },
  {
    id: defineId('decoration', 'bakery-sign'),
    name: '“Fresh bread” sign',
    description: 'A painted wooden sign, the kind that hangs in a bakery door.',
    slot: 'wall',
    theme: 'warm-bakery',
    unlock: { type: 'crumbs', price: 80 },
    visual: { kind: 'frame', picture: 'bakery-sign', moulding: 'painted' },
  },
  {
    id: defineId('decoration', 'striped-linen-towel'),
    name: 'Striped linen towel',
    description: 'Heavy linen with dark stripes, the kind bakers tuck into their aprons.',
    slot: 'textile',
    theme: 'warm-bakery',
    unlock: { type: 'crumbs', price: 40 },
    visual: { kind: 'towel', pattern: 'stripe' },
  },
  {
    id: defineId('decoration', 'botanical-print'),
    name: 'Botanical print',
    description: 'A pressed sprig of rosemary, drawn carefully and labelled in ink.',
    slot: 'wall',
    theme: 'garden-kitchen',
    unlock: { type: 'crumbs', price: 50 },
    visual: { kind: 'frame', picture: 'botanical', moulding: 'wood' },
  },
  {
    id: defineId('decoration', 'green-ceramic-jar'),
    name: 'Green ceramic jar',
    description: 'A small jar in a deep green glaze, for the shelf.',
    slot: 'shelf',
    theme: 'garden-kitchen',
    unlock: { type: 'crumbs', price: 50 },
    visual: { kind: 'jar', glaze: 'green' },
  },
  {
    id: defineId('decoration', 'herb-bundle'),
    name: 'Drying herbs',
    description: 'Bunches of rosemary and bay tied with string, hung in the window to dry.',
    slot: 'window',
    theme: 'garden-kitchen',
    unlock: { type: 'crumbs', price: 45 },
    visual: { kind: 'herb-bundle' },
  },
]

const byId = new Map(DECORATIONS.map((decoration) => [decoration.id, decoration]))

/** Undefined for an id the catalog doesn't have (a save is never broken by one). */
export function findDecoration(id: DecorationId): DecorationDefinition | undefined {
  return byId.get(id)
}

const themeNames = new Map(DECORATION_THEMES.map((theme) => [theme.id, theme.name]))

export function themeName(id: DecorationThemeId): string {
  return themeNames.get(id) ?? id
}

/** The decorations in one theme, in catalog order. */
export function themeDecorations(id: DecorationThemeId): DecorationDefinition[] {
  return DECORATIONS.filter((decoration) => decoration.theme === id)
}

/**
 * A decoration's name as it reads mid-sentence: "Put out the cookie tin."
 * Marmalade keeps her capital: she's a name, not a thing.
 */
export function nameInSentence(piece: Pick<DecorationDefinition, 'name'>): string {
  return /^Marmalade\b/.test(piece.name) ? piece.name : piece.name.toLowerCase()
}
