/**
 * Stable, opaque identifiers for domain objects.
 *
 * IDs are branded strings so a RecipeId can never be passed where an
 * IngredientId is expected, and nothing in the game ever keys off a display
 * name. The prefix makes IDs readable in saved data and devtools.
 */
declare const brand: unique symbol

export type Id<Kind extends string> = string & { readonly [brand]: Kind }

export type PlayerId = Id<'player'>
export type RecipeId = Id<'recipe'>
export type IngredientId = Id<'ingredient'>
export type CreationId = Id<'creation'>
export type StoryChapterId = Id<'chapter'>
export type StorySceneId = Id<'scene'>
export type StoryNoteId = Id<'note'>
export type DecorationId = Id<'decoration'>

type IdKind = 'player' | 'recipe' | 'ingredient' | 'creation' | 'chapter' | 'scene' | 'note' | 'decoration'

function randomPart(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for old browsers and non-secure contexts (e.g. LAN dev over http).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function createId<Kind extends IdKind>(kind: Kind): Id<Kind> {
  return `${kind}_${randomPart()}` as Id<Kind>
}

/**
 * For hand-authored content (recipes, ingredients, story, decorations) whose IDs are fixed in
 * source so saves can reference them across versions, e.g. `defineId('recipe', 'butter-cookie')`.
 */
export function defineId<Kind extends IdKind>(kind: Kind, slug: string): Id<Kind> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid ${kind} slug "${slug}": use lowercase letters, digits and dashes.`)
  }
  return `${kind}_${slug}` as Id<Kind>
}

export function isIdOf<Kind extends IdKind>(kind: Kind, value: unknown): value is Id<Kind> {
  return typeof value === 'string' && value.startsWith(`${kind}_`) && value.length > kind.length + 1
}
