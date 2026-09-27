import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { LinkButton } from '../components/Button'
import { Cookie } from '../components/kitchenArt'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { viewCreation } from '../domain/baking'
import { MAX_BAKED_CREATIONS, recentCreations } from '../domain/creations'
import type { IngredientId } from '../domain/ids'
import { listIngredientNames } from '../domain/ingredients'
import type { Recipe } from '../domain/types'
import { bakedAtLabel } from '../components/bakedAt'
import './MemoriesScreen.css'

/** What went in, in the order the recipe card lists it (anything else last). */
function inRecipeOrder(ids: readonly IngredientId[], recipe: Recipe): IngredientId[] {
  const rank = (id: IngredientId) => {
    const index = recipe.ingredientIds.indexOf(id)
    return index === -1 ? recipe.ingredientIds.length : index
  }
  return [...ids].sort((a, b) => rank(a) - rank(b))
}

/**
 * Everything still on the rack, newest first: parchment slips with what
 * was baked, what went in it, and when. A keepsake, not a ledger.
 */
export function MemoriesScreen({ now = new Date() }: { now?: Date }) {
  const save = useSave()
  const memories = recentCreations(save).map(viewCreation)

  return (
    <div className="memories">
      <div className="memories__top">
        <ScreenTitle className="memories__title">Baking Memories</ScreenTitle>
        <HandNote className="memories__note">
          {memories.length === 0
            ? 'Nothing on the cooling rack yet.'
            : `The kitchen remembers your last ${MAX_BAKED_CREATIONS} bakes. Newest first.`}
        </HandNote>
      </div>

      {memories.length > 0 && (
        <ol className="memories__list">
          {memories.map((view) => {
            const headingId = `memory-${view.creation.id}`
            return (
              <li key={view.creation.id} className={`memory memory--${view.kind}`}>
                <article aria-labelledby={headingId} className="memory__body">
                  <Cookie look={view.look} className="memory__cookie" />
                  <h2 id={headingId} className="memory__name">
                    {view.name}
                  </h2>
                  {view.kind === 'recipe' ? (
                    <>
                      <p className="memory__kind">From the Recipe Book</p>
                      <p>Made with {listIngredientNames(inRecipeOrder(view.creation.ingredientIds, view.recipe))}.</p>
                    </>
                  ) : (
                    <>
                      <p className="memory__kind">Not in any recipe book</p>
                      <p>{view.description}</p>
                    </>
                  )}
                  <p className="memory__when">
                    Baked <time dateTime={view.creation.bakedAt}>{bakedAtLabel(view.creation.bakedAt, now)}</time>
                  </p>
                </article>
              </li>
            )
          })}
        </ol>
      )}

      <div className="memories__foot">
        <LinkButton variant="primary" href={hrefFor('bake')}>
          Go and bake
        </LinkButton>
        <LinkButton href={hrefFor('kitchen')}>Back to the kitchen</LinkButton>
      </div>
    </div>
  )
}
