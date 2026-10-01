import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { BakerPlaque } from '../components/BakerPlaque'
import { CoolingRack } from '../components/CoolingRack'
import { MixingBowl, PantryJar, RecipeBox } from '../components/illustrations'
import { Mascot } from '../components/Mascot'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { viewCreation } from '../domain/baking'
import { recentCreations } from '../domain/creations'
import { useTutorial } from '../tutorial/tutorialContext'
import { greetingFor } from './greeting'
import './HomeKitchenScreen.css'

/** How many recent bakes sit on the rack in the kitchen. */
export const RACK_SIZE = 3

export function HomeKitchenScreen({ now = new Date() }: { now?: Date }) {
  const save = useSave()
  const recipeCount = save.discoveredRecipes.length
  const ingredientCount = save.pantryIngredientIds.length
  const onRack = recentCreations(save, RACK_SIZE).map(viewCreation)
  const tutorialOn = useTutorial().run !== null

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

      <div className="kitchen__progress">
        <BakerPlaque progression={save.progression} />
        {/* Marmalade, keeping an eye on things from the end of the counter. Just company: she says nothing here. */}
        {!tutorialOn && <Mascot expression="idle" className="kitchen__cat" />}
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
              <span className="counter-object__detail">Mix something up</span>
            </span>
          </a>
        </li>
        <li className="kitchen__spot kitchen__spot--pantry">
          <a className="counter-object" href={hrefFor('pantry')}>
            <PantryJar className="counter-object__art" />
            <span className="counter-object__tag">
              <span className="counter-object__name">Pantry</span>
              <span className="counter-object__detail">
                {ingredientCount === 0 ? 'Empty shelves' : `${ingredientCount} ${ingredientCount === 1 ? 'ingredient' : 'ingredients'}`}
              </span>
            </span>
          </a>
        </li>
      </ul>

      <section className="kitchen__rack" aria-labelledby="kitchen-rack">
        <div className="kitchen__rack-top">
          <h2 id="kitchen-rack" className="kitchen__rack-title">
            Cooling rack
          </h2>
          {onRack.length > 0 && <a href={hrefFor('memories')}>All your baking memories</a>}
        </div>
        {onRack.length === 0 ? (
          <HandNote className="kitchen__rack-empty">Nothing on the cooling rack yet.</HandNote>
        ) : (
          <CoolingRack creations={onRack} now={now} label="Just baked" />
        )}
      </section>
    </div>
  )
}
