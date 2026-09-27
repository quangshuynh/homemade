import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { LinkButton } from '../components/Button'
import { IngredientJar } from '../components/kitchenArt'
import { ScreenTitle } from '../components/ScreenTitle'
import { findIngredient } from '../domain/ingredients'
import type { Ingredient, IngredientCategory } from '../domain/types'
import './PantryScreen.css'

const SHELVES: { category: IngredientCategory; title: string }[] = [
  { category: 'basic', title: 'Baking basics' },
  { category: 'flavouring', title: 'Flavourings' },
]

export function PantryScreen() {
  const save = useSave()
  const stocked = save.pantryIngredientIds.map(findIngredient).filter((item): item is Ingredient => item !== undefined)

  return (
    <div className="pantry">
      <div className="pantry__top">
        <ScreenTitle className="pantry__title">Pantry</ScreenTitle>
        <LinkButton variant="primary" href={hrefFor('bake')}>
          Take them to the bowl
        </LinkButton>
      </div>

      {SHELVES.map(({ category, title }) => {
        const items = stocked.filter((ingredient) => ingredient.category === category)
        if (items.length === 0) return null
        const headingId = `pantry-${category}`
        return (
          <section key={category} className="pantry__shelf" aria-labelledby={headingId}>
            <h2 id={headingId} className="pantry__shelf-title">
              {title}
            </h2>
            <ul className="pantry__items">
              {items.map((ingredient) => (
                <li key={ingredient.id} className="pantry__item">
                  <IngredientJar ingredient={ingredient} className="pantry__jar" />
                  <div className="pantry__tag">
                    <h3 className="pantry__name">{ingredient.name}</h3>
                    <p className="pantry__description">{ingredient.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {stocked.length === 0 && <p className="pantry__empty">The shelves are bare.</p>}
    </div>
  )
}
