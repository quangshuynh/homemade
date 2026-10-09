import { useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { BakerPlaque } from '../components/BakerPlaque'
import { CoolingRack } from '../components/CoolingRack'
import { MixingBowl, PantryJar, RecipeBox } from '../components/illustrations'
import { Mascot } from '../components/Mascot'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { KitchenCupboard, KitchenWall, type ScenePieces } from '../decorating/KitchenScene'
import { decoratingOpen, equippedIn } from '../decorating/rules'
import { DECORATION_SLOTS } from '../decorating/slots'
import { viewCreation } from '../domain/baking'
import { recentCreations } from '../domain/creations'
import { availableScene } from '../story/progress'
import { useTutorial } from '../tutorial/tutorialContext'
import { greetingFor } from './greeting'

/** The epilogue the cupboard opens on. Until it's read, the cupboard's tag says the key fits. */
const OLD_CUPBOARD_CHAPTER = 'chapter_old-cupboard'
import './HomeKitchenScreen.css'

/** How many recent bakes sit on the rack in the kitchen. */
export const RACK_SIZE = 3

export function HomeKitchenScreen({ now = new Date() }: { now?: Date }) {
  const save = useSave()
  const recipeCount = save.discoveredRecipes.length
  const ingredientCount = save.pantryIngredientIds.length
  const onRack = recentCreations(save, RACK_SIZE).map(viewCreation)
  const tutorialOn = useTutorial().run !== null
  // Something new at the back of the recipe box. Said on the box's tag, in words; Marmalade just looks keen.
  const waiting = availableScene(save)
  const newNote = !tutorialOn && waiting !== null
  // What the player has put out around the kitchen. Scenery: the same names are read out in one line below.
  const pieces: ScenePieces = Object.fromEntries(DECORATION_SLOTS.flatMap((slot) => equippedIn(save, slot) ?? []).map((piece) => [piece.slot, piece]))
  const out = Object.values(pieces)
  const cupboardOpen = decoratingOpen(save)
  const cupboardUnread = waiting?.chapter.id === OLD_CUPBOARD_CHAPTER

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
        {!tutorialOn && (
          <span className="kitchen__cat-spot">
            <Mascot expression={newNote ? 'thinking' : 'idle'} className="kitchen__cat" />
            {newNote && (
              <span className="kitchen__cat-mark" aria-hidden="true">
                …
              </span>
            )}
          </span>
        )}
      </div>

      <div className="kitchen__scene">
        <KitchenWall pieces={pieces} />
        {out.length > 0 && <p className="visually-hidden">Out in your kitchen: {out.map((piece) => piece.name).join(', ')}.</p>}
        <ul className="kitchen__counter" aria-label="On the counter">
          <li className="kitchen__spot kitchen__spot--book">
            <a className="counter-object" href={hrefFor('recipe-book')}>
              <RecipeBox className="counter-object__art" />
              <span className="counter-object__tag">
                <span className="counter-object__name">Recipe Book</span>
                <span className="counter-object__detail">
                  {recipeCount === 0 ? 'No recipes yet' : `${recipeCount} ${recipeCount === 1 ? 'recipe' : 'recipes'}`}
                </span>
                {newNote && <span className="counter-object__note">A new note inside</span>}
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
        <KitchenCupboard
          pieces={pieces}
          state={cupboardOpen ? 'open' : 'locked'}
          tagDetail={cupboardUnread ? 'The brass key fits' : 'Make it yours'}
        />
      </div>

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
