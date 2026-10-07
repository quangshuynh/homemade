import { useState } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { hrefFor, navigate } from '../app/routes'
import { Button, LinkButton } from '../components/Button'
import { Cookie } from '../components/kitchenArt'
import { HandNote } from '../components/Paper'
import { RaritySeal } from '../components/RaritySeal'
import { ScreenTitle } from '../components/ScreenTitle'
import { SecretSeal } from '../components/SecretSeal'
import { getIngredient } from '../domain/ingredients'
import { bookCounts, bookSections, type BookEntry, type FamilySection } from '../domain/recipeBook'
import type { RecipeFamily } from '../domain/types'
import { availableScene } from '../story/progress'
import './RecipeBookScreen.css'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

type Filter = RecipeFamily | 'all'

/** "3 of 5 discovered · 1 secret". */
function describeProgress(section: FamilySection): string {
  const secrets = section.secretsFound === 0 ? '' : ` · ${section.secretsFound} ${section.secretsFound === 1 ? 'secret' : 'secrets'}`
  return `${section.found} of ${section.total} discovered${secrets}`
}

/**
 * The recipe box, filed behind family dividers. Discovered recipes are
 * written out, with a way to bake them again. The rest are blank cards whose
 * only hints are how many ingredients they need, the divider they sit
 * behind and, once everything they need is on the shelf, a line Marmalade
 * scribbled: never a name, an ingredient, a rarity or a look. Secrets the
 * player hasn't baked aren't in the box at all.
 */
export function RecipeBookScreen() {
  const save = useSave()
  const [filter, setFilter] = useState<Filter>('all')
  const [announcement, setAnnouncement] = useState('')
  const sections = bookSections(save)
  const { found, total, secretsFound } = bookCounts(save)
  const shown = filter === 'all' ? sections : sections.filter((section) => section.family.id === filter)
  const newNote = availableScene(save) !== null

  function choose(next: Filter) {
    setFilter(next)
    const section = sections.find((entry) => entry.family.id === next)
    setAnnouncement(section ? `Showing ${section.family.name}: ${describeProgress(section)}.` : `Showing every family: ${found} of ${total} recipes.`)
  }

  return (
    <div className="recipe-book">
      <div className="recipe-book__top">
        <ScreenTitle className="recipe-book__title">Recipe Book</ScreenTitle>
        <HandNote className="recipe-book__count">
          <p>{found === 0 && secretsFound === 0 ? 'Nothing written down yet. Bake something and see.' : `${found} of ${total} recipes written down.`}</p>
          {secretsFound > 0 && <p className="recipe-book__secrets">Secrets found: {secretsFound}</p>}
        </HandNote>
      </div>
      <p className="recipe-book__story">
        This kitchen’s old recipe box, its cards faded to nothing. Bake a recipe and its card comes back.
      </p>
      {/* The story lives at the back of the box. A new note is said in words, never just a dot. */}
      <a className="recipe-book__notes" href={hrefFor('notes')}>
        <span className="recipe-book__notes-flag" aria-hidden="true" />
        Recipe Box Notes
        {newNote && (
          <>
            <span className="visually-hidden">:</span> <span className="recipe-book__notes-new">New note</span>
          </>
        )}
      </a>

      <div className="recipe-book__dividers" role="group" aria-label="Show recipes from">
        <button type="button" className="book-divider" aria-pressed={filter === 'all'} onClick={() => choose('all')}>
          Every family
        </button>
        {sections.map((section) => (
          <button
            key={section.family.id}
            type="button"
            className="book-divider"
            data-family={section.family.id}
            aria-pressed={filter === section.family.id}
            onClick={() => choose(section.family.id)}
          >
            {section.family.name}
            <span className="book-divider__count" aria-hidden="true">
              {section.found}/{section.total}
            </span>
          </button>
        ))}
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {shown.map((section) => (
        <FamilyShelf key={section.family.id} section={section} />
      ))}

      <div className="recipe-book__foot">
        <p>Experiments stay in the kitchen. Only recipes get a card.</p>
        <LinkButton href={hrefFor('bake')}>Go and bake</LinkButton>
      </div>
    </div>
  )
}

function FamilyShelf({ section }: { section: FamilySection }) {
  const headingId = `family-${section.family.id}`
  return (
    <section className="book-family" aria-labelledby={headingId} data-family={section.family.id}>
      <div className="book-family__divider">
        <h2 id={headingId} className="book-family__name">
          {section.family.name}
        </h2>
        <p className="book-family__progress">
          {describeProgress(section)}
          {section.complete && <span className="book-family__complete"> · every card back</span>}
        </p>
      </div>
      {section.found === 0 && section.secretsFound === 0 && <p className="book-family__empty">No recipes written here yet.</p>}
      <ol className="recipe-book__cards">
        {section.entries.map((entry) => (
          <BookCard key={entry.recipe.id} entry={entry} />
        ))}
      </ol>
    </section>
  )
}

function BookCard({ entry }: { entry: BookEntry }) {
  const { prepareRecipe } = useGame()
  const { recipe } = entry

  if (entry.kind === 'blank') {
    const { ingredientCount, note } = entry.clue
    return (
      <li className="book-card book-card--blank">
        <span className="book-card__tape" aria-hidden="true" />
        <span className="book-card__mark" aria-hidden="true">
          ?
        </span>
        <p className="book-card__blank-text">Not discovered yet</p>
        <p className="book-card__hint">Needs {ingredientCount} ingredients</p>
        {note && (
          <p className="book-card__clue">
            <span className="book-card__clue-by">Marmalade scribbled:</span> “{note}”
          </p>
        )}
      </li>
    )
  }

  const headingId = `book-${recipe.id}`
  return (
    <li className="book-card" data-rarity={recipe.rarity} data-secret={recipe.isSecret ? '' : undefined}>
      <article aria-labelledby={headingId} className="book-card__body">
        <Cookie look={recipe.look} className="book-card__cookie" />
        <h3 id={headingId} className="book-card__name">
          {recipe.name}
        </h3>
        <p className="book-card__rarity">
          <RaritySeal rarity={recipe.rarity} />
          {recipe.isSecret && (
            <>
              {' '}
              <SecretSeal />
            </>
          )}
        </p>
        <p className="book-card__descriptors">{recipe.descriptors.join(' · ')}</p>
        <p className="book-card__description">{recipe.description}</p>
        <h4 className="book-card__subhead">Ingredients</h4>
        <ul className="book-card__ingredients">
          {recipe.ingredientIds.map((id) => (
            <li key={id}>{getIngredient(id).name}</li>
          ))}
        </ul>
        <p className="book-card__date">First baked {formatDate(entry.discoveredAt)}</p>
        <Button
          className="book-card__again"
          aria-label={`Bake again: ${recipe.name}`}
          onClick={() => {
            // Lays the ingredients out in the bowl; the player still mixes and bakes.
            if (prepareRecipe(recipe.id)) navigate('bake')
          }}
        >
          Bake again
        </Button>
      </article>
    </li>
  )
}
