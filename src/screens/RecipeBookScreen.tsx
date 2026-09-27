import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { LinkButton } from '../components/Button'
import { Cookie } from '../components/kitchenArt'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { getIngredient } from '../domain/ingredients'
import { RECIPES } from '../domain/recipes'
import './RecipeBookScreen.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Every recipe in the catalog gets a slot. Discovered ones are written out;
 * the rest are blank cards that give away nothing about what they are.
 */
export function RecipeBookScreen() {
  const save = useSave()
  const discoveredAt = new Map(save.discoveredRecipes.map((entry) => [entry.recipeId, entry.discoveredAt]))
  const found = RECIPES.filter((recipe) => discoveredAt.has(recipe.id)).length

  return (
    <div className="recipe-book">
      <div className="recipe-book__top">
        <ScreenTitle className="recipe-book__title">Recipe Book</ScreenTitle>
        <HandNote className="recipe-book__count">
          {found === 0
            ? 'Nothing written down yet. Bake something and see.'
            : `${found} of ${RECIPES.length} recipes written down.`}
        </HandNote>
      </div>

      <ol className="recipe-book__cards">
        {RECIPES.map((recipe) => {
          const date = discoveredAt.get(recipe.id)
          if (!date) {
            return (
              <li key={recipe.id} className="book-card book-card--blank">
                <span className="book-card__tape" aria-hidden="true" />
                <span className="book-card__mark" aria-hidden="true">
                  ?
                </span>
                <p className="book-card__blank-text">Not discovered yet</p>
              </li>
            )
          }
          const headingId = `book-${recipe.id}`
          return (
            <li key={recipe.id} className="book-card">
              <article aria-labelledby={headingId} className="book-card__body">
                <Cookie look={recipe.look} className="book-card__cookie" />
                <h2 id={headingId} className="book-card__name">
                  {recipe.name}
                </h2>
                <p className="book-card__descriptors">{recipe.descriptors.join(' · ')}</p>
                <p className="book-card__description">{recipe.description}</p>
                <h3 className="book-card__subhead">Ingredients</h3>
                <ul className="book-card__ingredients">
                  {recipe.ingredientIds.map((id) => (
                    <li key={id}>{getIngredient(id).name}</li>
                  ))}
                </ul>
                <p className="book-card__date">First baked {formatDate(date)}</p>
              </article>
            </li>
          )
        })}
      </ol>

      <div className="recipe-book__foot">
        <p>Experiments stay in the kitchen. Only recipes get a card.</p>
        <LinkButton href={hrefFor('bake')}>Go and bake</LinkButton>
      </div>
    </div>
  )
}
