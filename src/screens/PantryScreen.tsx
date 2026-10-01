import { useEffect, useRef, useState } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { useSound } from '../audio/soundContext'
import { BakerPlaque, CrumbsMark } from '../components/BakerPlaque'
import { Button, LinkButton } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { IngredientJar, WrappedJar } from '../components/kitchenArt'
import { MascotSays } from '../components/Mascot'
import { ScreenTitle } from '../components/ScreenTitle'
import type { IngredientId } from '../domain/ids'
import { findIngredient, getIngredient, STARTER_PANTRY } from '../domain/ingredients'
import { lockedIngredients, unlockStatus, type LevelUp, type UnlockStatus } from '../domain/progression'
import type { Ingredient, IngredientCategory } from '../domain/types'
import { describeLevelUp, unlockReaction } from '../mascot/reactions'
import { useTutorial } from '../tutorial/tutorialContext'
import './PantryScreen.css'

const SHELVES: { category: IngredientCategory; title: string }[] = [
  { category: 'basic', title: 'Baking basics' },
  { category: 'flavouring', title: 'Flavourings' },
]

type Added = { ingredientId: IngredientId; xp: number; levelUp: LevelUp | null; firstAddition: boolean }

/** Why an addition can't be made yet, in words. Null when it can. */
function notYet(status: UnlockStatus): string | null {
  switch (status.kind) {
    case 'needs-level':
      return `Opens at Baker Level ${status.unlock.level}. You’re Level ${status.level}.`
    case 'needs-crumbs':
      return `You need ${status.short} more ${status.short === 1 ? 'Crumb' : 'Crumbs'}. New recipes earn them.`
    default:
      return null
  }
}

export function PantryScreen() {
  const save = useSave()
  const { unlockIngredient } = useGame()
  const playSound = useSound()
  const { run } = useTutorial()
  const [confirming, setConfirming] = useState<IngredientId | null>(null)
  const [added, setAdded] = useState<Added | null>(null)
  const addedNote = useRef<HTMLDivElement>(null)
  const stocked = save.pantryIngredientIds.map(findIngredient).filter((item): item is Ingredient => item !== undefined)
  const additions = lockedIngredients(save)
  const pointAtProgress = run?.step === 'progress'

  // Once the dialog has closed (its own effect runs first), land on the news so it's
  // read out: the button that opened the dialog has gone, its jar now on the shelf.
  // A new level gets its ta-da after the jar has been set down.
  const latestSound = useRef(playSound)
  useEffect(() => {
    latestSound.current = playSound
  })
  useEffect(() => {
    if (!added) return
    addedNote.current?.focus()
    if (!added.levelUp) return
    const timer = window.setTimeout(() => latestSound.current('level-up'), 700)
    return () => window.clearTimeout(timer)
  }, [added])

  function confirm() {
    if (!confirming) return
    // Worked out before adding: was the shelf still just the starter pantry?
    const firstAddition = save.pantryIngredientIds.every((id) => STARTER_PANTRY.includes(id))
    const result = unlockIngredient(confirming)
    setConfirming(null)
    if (!result.ok) return
    playSound('ingredient-unlock')
    setAdded({ ingredientId: result.ingredientId, xp: result.xp, levelUp: result.levelUp, firstAddition })
  }

  const pending = confirming ? { ingredient: getIngredient(confirming), status: unlockStatus(save, confirming) } : null
  const cost = pending?.status.kind === 'available' ? pending.status.unlock.crumbs : 0
  const reaction = added ? unlockReaction(added.ingredientId, added.levelUp, added.firstAddition) : null

  return (
    <div className="pantry">
      <div className="pantry__top">
        <ScreenTitle className="pantry__title">Pantry</ScreenTitle>
        <LinkButton variant="primary" href={hrefFor('bake')}>
          Take them to the bowl
        </LinkButton>
      </div>

      <BakerPlaque progression={save.progression} className={['pantry__plaque', pointAtProgress && 'tutorial-target'].filter(Boolean).join(' ')} />

      {added && reaction && (
        // Focus lands here once the dialog closes, so the news is read out and nothing is lost.
        <div className="pantry__added" ref={addedNote} tabIndex={-1} aria-labelledby="pantry-added-title">
          <h2 id="pantry-added-title" className="visually-hidden">
            Added {getIngredient(added.ingredientId).name.toLowerCase()} to the pantry
          </h2>
          <MascotSays expression={reaction.expression}>{reaction.line}</MascotSays>
          <p className="pantry__added-xp">+{added.xp} XP for filling the shelf</p>
          {added.levelUp && <p className="pantry__added-level">{describeLevelUp(added.levelUp)}</p>}
        </div>
      )}

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

      {additions.length > 0 && (
        <section
          className={['pantry__shelf', 'pantry__shelf--additions', pointAtProgress && 'tutorial-target'].filter(Boolean).join(' ')}
          aria-labelledby="pantry-additions"
        >
          <h2 id="pantry-additions" className="pantry__shelf-title">
            Pantry additions
          </h2>
          <p className="pantry__additions-hint">
            Still wrapped. New ones open up as your Baker Level rises, and once added they’re yours for good.
          </p>
          <ul className="pantry__items">
            {additions.map(({ ingredientId, level, crumbs }) => {
              const ingredient = getIngredient(ingredientId)
              const status = unlockStatus(save, ingredientId)
              const reason = notYet(status)
              const reasonId = `addition-${ingredientId}-reason`
              const levelMet = status.kind !== 'needs-level'
              return (
                <li key={ingredientId} className="pantry__item addition" data-ready={reason ? undefined : ''}>
                  <WrappedJar ingredient={ingredient} className="pantry__jar" />
                  <div className="pantry__tag addition__tag">
                    <h3 className="pantry__name">{ingredient.name}</h3>
                    <p className="pantry__description">{ingredient.description}</p>
                    <ul className="addition__needs" aria-label={`What ${ingredient.name.toLowerCase()} needs`}>
                      <li data-met={levelMet ? '' : undefined}>
                        Baker Level {level}
                        {levelMet && <span className="addition__tick"> ✓ reached</span>}
                      </li>
                      <li>
                        <CrumbsMark className="addition__crumbs-mark" />
                        {crumbs} Crumbs
                      </li>
                    </ul>
                    <Button
                      variant={reason ? 'plain' : 'primary'}
                      className="addition__add"
                      aria-disabled={reason ? true : undefined}
                      aria-describedby={reason ? reasonId : undefined}
                      aria-label={`Add ${ingredient.name.toLowerCase()} to the pantry for ${crumbs} Crumbs`}
                      onClick={() => {
                        if (!reason) setConfirming(ingredientId)
                      }}
                    >
                      Add to pantry
                    </Button>
                    {reason && (
                      <p id={reasonId} className="addition__reason">
                        {reason}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Add ${pending.ingredient.name.toLowerCase()} to the pantry?` : ''}
        confirmLabel="Add it"
        cancelLabel="Not yet"
        confirmVariant="primary"
        onConfirm={confirm}
        onCancel={() => setConfirming(null)}
      >
        {pending && (
          <>
            <p>
              It costs <strong>{cost} Crumbs</strong> and stays on your shelf for good.
            </p>
            <p>You’ll have {save.progression.crumbs - cost} Crumbs left.</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}
