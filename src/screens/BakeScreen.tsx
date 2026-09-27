import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { useReducedMotion } from '../app/useReducedMotion'
import { useSound } from '../audio/soundContext'
import { Button, LinkButton } from '../components/Button'
import { BakingBowl, Cookie, IngredientJar, Oven } from '../components/kitchenArt'
import { HandNote, RecipeCard } from '../components/Paper'
import { ScreenTitle, SCREEN_TITLE_ID } from '../components/ScreenTitle'
import {
  addToBowl,
  BOWL_CAPACITY,
  canMix,
  MIN_TO_MIX,
  mixedDoughTone,
  removeFromBowl,
  type BakeOutcome,
  type Bowl,
  type BowlChange,
} from '../domain/baking'
import type { IngredientId } from '../domain/ids'
import { findIngredient, getIngredient, listIngredientNames } from '../domain/ingredients'
import { findRecipeById } from '../domain/recipes'
import type { Ingredient } from '../domain/types'
import './BakeScreen.css'

/** Long enough to see the oven, short enough never to feel like waiting. */
export const OVEN_TIME_MS = 900

type Phase = { kind: 'choosing' } | { kind: 'mixed' } | { kind: 'baking'; outcome: BakeOutcome } | { kind: 'done'; outcome: BakeOutcome }

const DOUGH_WORDS = {
  pale: 'pale',
  golden: 'golden',
  spiced: 'warm, speckled',
  nutty: 'nutty brown',
  cocoa: 'chocolate-brown',
  dark: 'very dark',
} as const

function describeChange(change: BowlChange, ingredient: Ingredient): string {
  const name = ingredient.name.toLowerCase()
  const room = BOWL_CAPACITY - change.bowl.length
  switch (change.outcome) {
    case 'added':
      return room === 0 ? `Added the ${name}. The bowl is full now.` : `Added the ${name}. Room for ${room} more.`
    case 'removed':
      return `Took the ${name} back out.`
    case 'bowl-full':
      return `The bowl is full. Take something out before adding the ${name}.`
    case 'already-in-bowl':
      return `The ${name} is already in the bowl.`
    case 'not-in-pantry':
      return `There’s no ${name} on the shelf.`
    case 'not-in-bowl':
      return `The ${name} isn’t in the bowl.`
  }
}

export function BakeScreen() {
  const save = useSave()
  const game = useGame()
  const reducedMotion = useReducedMotion()
  // "Bake again" lays a recipe out in the bowl. It starts here unmixed; the player still mixes and bakes.
  const [prepared] = useState(() => game.preparedBowl)
  const [bowl, setBowl] = useState<Bowl>(() => prepared?.bowl ?? [])
  const [phase, setPhase] = useState<Phase>({ kind: 'choosing' })
  const [message, setMessage] = useState('')
  const preparedName = prepared ? findRecipeById(prepared.recipeId)?.name : undefined
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const preparedNote = useRef<HTMLParagraphElement>(null)
  const station = useRef<HTMLElement>(null)
  const ids = { shelf: useId(), bowl: useId(), result: useId(), mixHint: useId() }
  const playSound = useSound()
  // For effects that should run once per event, not again when these change underneath them.
  const latest = useRef({ reducedMotion, playSound })
  useEffect(() => {
    latest.current = { reducedMotion, playSound }
  })

  const pantry = save.pantryIngredientIds.map(findIngredient).filter((item): item is Ingredient => item !== undefined)
  const inBowl = bowl.map(getIngredient)
  const mixed = phase.kind === 'mixed'

  // Take the prepared bowl once, then bring the bowl into view and put focus on
  // the note saying what was laid out, so it's seen (and read out) straight away.
  // On a phone the bowl is below the shelf; this is what saves a scroll.
  const { clearPreparedBowl } = game
  useEffect(() => {
    if (!prepared) return
    clearPreparedBowl()
    const note = preparedNote.current
    if (!note) return
    note.focus({ preventScroll: true })
    revealIfHidden(station.current, latest.current.reducedMotion)
  }, [prepared, clearPreparedBowl])

  // The oven: a short pause for the animation, skipped entirely when motion is reduced.
  useEffect(() => {
    if (phase.kind !== 'baking') return
    const timer = window.setTimeout(() => setPhase({ kind: 'done', outcome: phase.outcome }), reducedMotion ? 0 : OVEN_TIME_MS)
    return () => window.clearTimeout(timer)
  }, [phase, reducedMotion])

  // Land on the result, so it's announced and the next action is one Tab away.
  useEffect(() => {
    if (phase.kind === 'done') resultHeading.current?.focus()
  }, [phase.kind])

  // Out of the oven: the timer dings, and a first discovery gets a little chime as the stamp lands.
  const doneOutcome = phase.kind === 'done' ? phase.outcome : null
  useEffect(() => {
    if (!doneOutcome) return
    const { playSound: play, reducedMotion: still } = latest.current
    play('ding')
    if (!doneOutcome.newDiscovery) return
    const timer = window.setTimeout(() => latest.current.playSound('discover'), still ? 350 : 650)
    return () => window.clearTimeout(timer)
  }, [doneOutcome])

  function change(next: BowlChange, ingredient: Ingredient) {
    if (next.outcome === 'added') playSound('pick')
    if (next.outcome === 'removed') playSound('remove')
    setBowl(next.bowl)
    setMessage(describeChange(next, ingredient))
    // Changing what's in a mixed bowl un-mixes it.
    if (phase.kind === 'mixed' && next.bowl !== bowl) setPhase({ kind: 'choosing' })
  }

  function toggle(ingredient: Ingredient) {
    if (bowl.includes(ingredient.id)) change(removeFromBowl(bowl, ingredient.id), ingredient)
    else change(addToBowl(bowl, ingredient.id, save.pantryIngredientIds), ingredient)
  }

  function takeOut(id: IngredientId) {
    change(removeFromBowl(bowl, id), getIngredient(id))
  }

  function mix() {
    if (!canMix(bowl)) return
    setPhase({ kind: 'mixed' })
    setMessage(`Mixed. It’s a ${DOUGH_WORDS[mixedDoughTone(bowl)]} dough.`)
    playSound('mix')
    // On a phone, Mix can be pressed from the bar while the bowl is off screen: show the dough.
    revealIfHidden(station.current, reducedMotion)
  }

  function bake() {
    // The result is decided and saved now; the oven is only the reveal.
    const outcome = game.bake(bowl)
    setMessage('')
    setPhase(reducedMotion ? { kind: 'done', outcome } : { kind: 'baking', outcome })
  }

  function bakeAgain() {
    setBowl([])
    setPhase({ kind: 'choosing' })
    setMessage('')
    // Back at the top of the bench, the shelf is the next thing.
    requestAnimationFrame(() => document.getElementById(SCREEN_TITLE_ID)?.focus())
  }

  const status = (
    <p className="visually-hidden" role="status" aria-live="polite">
      {phase.kind === 'baking' ? 'In the oven…' : message}
    </p>
  )

  if (phase.kind === 'baking') {
    return (
      <div className="bake bake--oven">
        <ScreenTitle className="bake__title">Bake</ScreenTitle>
        <div className="bake__oven">
          <Oven className="bake__oven-art" />
          <HandNote>In the oven…</HandNote>
        </div>
        {status}
      </div>
    )
  }

  if (phase.kind === 'done') {
    return (
      <div className="bake">
        <ScreenTitle className="bake__title">Bake</ScreenTitle>
        <BakeResult outcome={phase.outcome} headingRef={resultHeading} headingId={ids.result} onBakeAgain={bakeAgain} />
        {status}
      </div>
    )
  }

  const room = BOWL_CAPACITY - bowl.length

  return (
    <div className="bake">
      <ScreenTitle className="bake__title">Bake</ScreenTitle>

      <section className="bake__shelf" aria-labelledby={ids.shelf}>
        <h2 id={ids.shelf} className="bake__heading">
          From the shelf
        </h2>
        <p className="bake__hint">
          Pick up to {BOWL_CAPACITY} things for the bowl. Pick one again to put it back.
        </p>
        <ul className="bake__jars">
          {pantry.map((ingredient) => {
            const selected = bowl.includes(ingredient.id)
            const descriptionId = `${ids.shelf}-${ingredient.id}`
            return (
              <li key={ingredient.id}>
                <button
                  type="button"
                  className="jar-button"
                  aria-pressed={selected}
                  aria-describedby={descriptionId}
                  onClick={() => toggle(ingredient)}
                >
                  <IngredientJar ingredient={ingredient} className="jar-button__art" />
                  <span className="jar-button__label">{ingredient.name}</span>
                  {selected && (
                    <span className="jar-button__state" aria-hidden="true">
                      in the bowl
                    </span>
                  )}
                </button>
                <span id={descriptionId} className="visually-hidden">
                  {ingredient.description}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bake__station" aria-labelledby={ids.bowl} ref={station}>
        <h2 id={ids.bowl} className="bake__heading">
          The bowl
        </h2>
        {prepared && preparedName && bowl === prepared.bowl && phase.kind === 'choosing' && (
          <p className="bake__prepared hand-note" ref={preparedNote} tabIndex={-1}>
            Laid out for {preparedName}.{' '}
            <span className="visually-hidden">{capitalise(listIngredientNames(prepared.bowl))} are in the bowl. </span>
            Mix when you’re ready.
          </p>
        )}
        <BakingBowl
          ingredients={inBowl}
          mixedDough={mixed ? mixedDoughTone(bowl) : null}
          className={['bake__bowl', mixed && 'bake__bowl--mixed'].filter(Boolean).join(' ')}
        />

        {bowl.length === 0 ? (
          <HandNote className="bake__empty">Empty. Pick a few things from the shelf.</HandNote>
        ) : (
          <>
            <ul className="bake__in-bowl" aria-label="In the bowl">
              {inBowl.map((ingredient) => (
                <li key={ingredient.id}>
                  <span className="bake__in-bowl-name">{ingredient.name}</span>
                  <button
                    type="button"
                    className="bake__take-out"
                    onClick={() => takeOut(ingredient.id)}
                    aria-label={`Take the ${ingredient.name.toLowerCase()} out`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="bake__room">{room === 0 ? 'The bowl is full.' : `Room for ${room} more.`}</p>
          </>
        )}
      </section>

      {/* After the bowl in reading order; on a phone it sticks above the tab bar until you reach it. */}
      <div className="bake__actions">
        <p className="bake__summary" aria-hidden="true">
          {bowl.length === 0 ? 'The bowl is empty' : `${bowl.length} of ${BOWL_CAPACITY} in the bowl`}
        </p>
        {mixed ? (
          <Button variant="primary" className="bake__go" onClick={bake}>
            Bake it
          </Button>
        ) : (
          <Button
            variant="primary"
            className="bake__go"
            onClick={mix}
            disabled={!canMix(bowl)}
            aria-describedby={canMix(bowl) ? undefined : ids.mixHint}
          >
            Mix
          </Button>
        )}
        {!canMix(bowl) && (
          <p id={ids.mixHint} className="bake__hint">
            Add at least {MIN_TO_MIX} things to mix.
          </p>
        )}
        {bowl.length > 0 && (
          <Button
            onClick={() => {
              setBowl([])
              setPhase({ kind: 'choosing' })
              setMessage('Emptied the bowl.')
            }}
          >
            Empty the bowl
          </Button>
        )}
      </div>
      {status}
    </div>
  )
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Scrolls an element into view only if part of it is hidden (above the top,
 * or behind the phone tab bar and docked bowl actions at the bottom).
 * Smooth unless motion is reduced. Never a hard-coded position.
 */
function revealIfHidden(element: HTMLElement | null, reducedMotion: boolean) {
  if (!element || typeof element.scrollIntoView !== 'function') return
  const rect = element.getBoundingClientRect()
  const covered = document.querySelector('.bake__actions')?.getBoundingClientRect().height ?? 0
  // `auto` (the default) parses as NaN: treat it as no padding.
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0
  const bottomEdge = window.innerHeight - padding - covered
  if (rect.top >= 0 && rect.bottom <= bottomEdge) return
  element.scrollIntoView({ block: rect.height > bottomEdge ? 'start' : 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
}

type BakeResultProps = {
  outcome: BakeOutcome
  headingRef: RefObject<HTMLHeadingElement | null>
  headingId: string
  onBakeAgain: () => void
}

function BakeResult({ outcome, headingRef, headingId, onBakeAgain }: BakeResultProps) {
  const { result, newDiscovery } = outcome
  const look = result.kind === 'recipe' ? result.recipe.look : result.look
  const name = result.kind === 'recipe' ? result.recipe.name : result.name

  return (
    <section
      className={['bake-result', newDiscovery && 'bake-result--new'].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
    >
      <div className="bake-result__tray" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Cookie key={index} look={look} className="bake-result__cookie" />
        ))}
      </div>

      <RecipeCard className="bake-result__card">
        {newDiscovery && (
          <span className="bake-result__stamp" aria-hidden="true">
            New recipe!
          </span>
        )}
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="bake-result__name">
          {newDiscovery && (
            <>
              <span className="visually-hidden">New recipe discovered:</span>{' '}
            </>
          )}
          {name}
        </h2>

        {result.kind === 'recipe' ? (
          <>
            {newDiscovery && <HandNote>{result.recipe.discoveryText}</HandNote>}
            <p>{result.recipe.description}</p>
            <p className="bake-result__descriptors">{result.recipe.descriptors.join(' · ')}</p>
            <p className="bake-result__made">Made with {listIngredientNames(result.ingredientIds)}.</p>
            <p className="bake-result__book">
              {newDiscovery ? 'Copied into your Recipe Book.' : 'Already in your Recipe Book.'}
            </p>
          </>
        ) : (
          <>
            <HandNote>Not in any recipe book.</HandNote>
            <p>{result.description}</p>
            <p className="bake-result__book">Experiments don’t get a card in the Recipe Book. Only recipes do.</p>
          </>
        )}

        <p className="bake-result__rack">Left to cool on the rack in your kitchen.</p>

        <div className="bake-result__actions">
          <Button variant="primary" onClick={onBakeAgain}>
            Bake another batch
          </Button>
          <LinkButton href={hrefFor('recipe-book')}>Open the Recipe Book</LinkButton>
        </div>
      </RecipeCard>
    </section>
  )
}
