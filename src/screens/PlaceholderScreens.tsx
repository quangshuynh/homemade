import { useSave } from '../app/gameContext'
import { EmptyRoom } from '../components/EmptyRoom'
import { BakingTray, BlankCards, EmptyShelf } from '../components/illustrations'

export function BakeScreen() {
  return (
    <EmptyRoom title="Bake" art={<BakingTray />} note="The oven isn’t lit yet.">
      <p>
        Mixing ingredients and baking is the next thing being built in this kitchen. There’s nothing to bake here just
        yet.
      </p>
    </EmptyRoom>
  )
}

export function RecipeBookScreen() {
  const { discoveredRecipeIds } = useSave()
  const count = discoveredRecipeIds.length

  return (
    <EmptyRoom
      title="Recipe Book"
      art={<BlankCards />}
      note={count === 0 ? 'No recipes written down yet.' : `${count} ${count === 1 ? 'recipe' : 'recipes'} written down.`}
    >
      <p>Recipes you discover will be kept here, one card each, so you can come back to them.</p>
    </EmptyRoom>
  )
}

export function PantryScreen() {
  return (
    <EmptyRoom title="Pantry" art={<EmptyShelf />} note="The shelves are bare.">
      <p>Ingredients will be stored here once there’s baking to do.</p>
    </EmptyRoom>
  )
}
