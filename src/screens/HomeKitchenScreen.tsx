import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { MixingBowl, PantryJar, RecipeBox } from '../components/illustrations'
import { HandNote, Sticker } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { greetingFor } from './greeting'
import './HomeKitchenScreen.css'

export function HomeKitchenScreen({ now = new Date() }: { now?: Date }) {
  const save = useSave()
  const recipeCount = save.discoveredRecipeIds.length

  return (
    <div className="kitchen">
      <div className="kitchen__heading">
        <ScreenTitle className="kitchen__name">{save.profile.bakeryName}</ScreenTitle>
        <HandNote className="kitchen__greeting">
          <p>
            {greetingFor(now)}, {save.profile.name}.
          </p>
          <p>The counter’s wiped down and ready.</p>
        </HandNote>
      </div>

      <ul className="kitchen__counter" aria-label="On the counter">
        <li className="kitchen__spot kitchen__spot--book">
          <a className="counter-object" href={hrefFor('recipe-book')}>
            <RecipeBox className="counter-object__art" />
            <span className="counter-object__tag">
              <span className="counter-object__name">Recipe Book</span>
              <span className="counter-object__detail">
                {recipeCount === 0 ? 'No recipes yet' : `${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}`}
              </span>
            </span>
          </a>
        </li>
        <li className="kitchen__spot kitchen__spot--bake">
          <a className="counter-object counter-object--primary" href={hrefFor('bake')}>
            <MixingBowl className="counter-object__art" />
            <span className="counter-object__tag">
              <span className="counter-object__name">Bake</span>
              <Sticker>coming soon</Sticker>
            </span>
          </a>
        </li>
        <li className="kitchen__spot kitchen__spot--pantry">
          <a className="counter-object" href={hrefFor('pantry')}>
            <PantryJar className="counter-object__art" />
            <span className="counter-object__tag">
              <span className="counter-object__name">Pantry</span>
              <span className="counter-object__detail">Empty shelves</span>
            </span>
          </a>
        </li>
      </ul>
    </div>
  )
}
