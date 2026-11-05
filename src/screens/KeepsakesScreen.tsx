import { useGame, useSave } from '../app/gameContext'
import { hrefFor, navigate } from '../app/routes'
import { Button } from '../components/Button'
import { Cookie } from '../components/kitchenArt'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { decoratingOpen } from '../decorating/rules'
import { bakeCount, masteryStage, MASTERY_STAGES, nextStage, recipesAtStage, stageInfo } from '../domain/mastery'
import { findRecipeById } from '../domain/recipes'
import type { Recipe } from '../domain/types'
import { bakedTimes, describeReward } from '../keepsakes/words'
import { KeepsakeStamp } from '../keepsakes/KeepsakeStamp'
import { keepsakeCounts, keepsakeGroups, kitchenGoal, type KeepsakeEntry } from '../keepsakes/rules'
import '../keepsakes/Keepsakes.css'

/**
 * Kitchen Keepsakes: the little envelope at the back of the recipe box.
 * Stamped cards for what the kitchen has done, faint pencil outlines for
 * what it hasn't yet (never for a hidden one), the recipes it knows best,
 * and one gentle idea of what to try next. Nothing here is timed, nothing
 * resets, and nothing is required for anything else in the game.
 */
export function KeepsakesScreen() {
  const save = useSave()
  const { prepareRecipe } = useGame()
  const groups = keepsakeGroups(save)
  const { earned, total } = keepsakeCounts(save)
  const goal = kitchenGoal(save)
  const goalRecipe = goal.recipeId ? findRecipeById(goal.recipeId) : undefined
  const known = recipesAtStage(save, 'familiar')
    .map(findRecipeById)
    .filter((recipe): recipe is Recipe => recipe !== undefined)
  const open = decoratingOpen(save)

  return (
    <div className="keepsakes">
      <div className="keepsakes__top">
        <ScreenTitle className="keepsakes__title">Kitchen Keepsakes</ScreenTitle>
        <a className="keepsakes__back" href={hrefFor('recipe-book')}>
          Back to the Recipe Book
        </a>
      </div>
      <p className="keepsakes__intro">
        An envelope tucked in at the back of the recipe box, for little things worth remembering. Nothing in here runs out or goes away.
      </p>
      <HandNote className="keepsakes__count">
        <p>{earned === 0 ? 'Nothing stamped yet. It’ll come.' : `${earned} of ${total} keepsakes stamped.`}</p>
      </HandNote>

      <section className="keepsakes__goal" aria-labelledby="keepsakes-goal">
        <h2 id="keepsakes-goal" className="keepsakes__goal-title">
          Something to try
        </h2>
        <p>{goal.line}</p>
        {goalRecipe && (
          <Button
            aria-label={`Bake again: ${goalRecipe.name}`}
            onClick={() => {
              if (prepareRecipe(goalRecipe.id)) navigate('bake')
            }}
          >
            Bake again
          </Button>
        )}
        <p className="keepsakes__goal-aside">Only an idea. There’s no hurry, and it changes once it’s done.</p>
      </section>

      {groups.map((group) => (
        <section key={group.category} className="keepsakes__group" aria-labelledby={`keepsakes-${group.category}`}>
          <h2 id={`keepsakes-${group.category}`} className="keepsakes__group-name">
            {group.name}
          </h2>
          <ul className="keepsakes__list">
            {group.entries.map((entry) => (
              <KeepsakeCard key={entry.achievement.id} entry={entry} cupboardOpen={open} />
            ))}
          </ul>
        </section>
      ))}

      <section className="keepsakes__mastery" aria-labelledby="keepsakes-known">
        <h2 id="keepsakes-known" className="keepsakes__group-name">
          Recipes you know by heart
        </h2>
        <p className="keepsakes__stages">
          The more often a recipe is baked, the better the kitchen knows it:{' '}
          {MASTERY_STAGES.filter((info) => info.id !== 'discovered')
            .map((info) => `${info.label} at ${info.bakes} bakes`)
            .join(', ')}
          . That’s as far as it goes.
        </p>
        {known.length === 0 ? (
          <HandNote className="keepsakes__mastery-empty">Bake any recipe three times and it starts to feel Familiar.</HandNote>
        ) : (
          <ul className="keepsakes__known">
            {known.map((recipe) => (
              <KnownRecipe key={recipe.id} recipe={recipe} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function KeepsakeCard({ entry, cupboardOpen }: { entry: KeepsakeEntry; cupboardOpen: boolean }) {
  const { achievement } = entry
  const earned = entry.kind === 'earned'
  const reward = describeReward(achievement, cupboardOpen, earned)
  return (
    <li className={['keepsake', earned ? 'keepsake--earned' : 'keepsake--not-yet'].join(' ')} data-category={achievement.category}>
      <KeepsakeStamp category={achievement.category} earned={earned} className="keepsake__stamp" />
      <div className="keepsake__text">
        <h3 className="keepsake__name">{achievement.name}</h3>
        <p className="keepsake__status">{earned ? 'Stamped' : 'Not yet'}</p>
        <p className="keepsake__description">{achievement.description}</p>
        {reward && <p className="keepsake__reward">{reward}</p>}
      </div>
    </li>
  )
}

function KnownRecipe({ recipe }: { recipe: Recipe }) {
  const save = useSave()
  const count = bakeCount(save, recipe.id)
  const stage = masteryStage(save, recipe.id)
  const next = nextStage(count)
  return (
    <li className="known-recipe" data-mastery={stage ?? undefined}>
      <Cookie look={recipe.look} className="known-recipe__cookie" flourish={stage === 'house-favourite'} />
      <div>
        <p className="known-recipe__name">{recipe.name}</p>
        <p className="known-recipe__stage">
          {stage ? stageInfo(stage).label : ''} · {bakedTimes(count)}
        </p>
        <p className="known-recipe__next">
          {next ? `${next.more === 1 ? 'One more bake' : `${next.more} more bakes`} to ${next.stage.label}.` : 'As loved as a recipe gets.'}
        </p>
      </div>
    </li>
  )
}
