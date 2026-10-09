import { useEffect, useId, useRef, useState } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { useSound } from '../audio/soundContext'
import { CrumbsMark } from '../components/BakerPlaque'
import { Button, LinkButton } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MixingBowl, PantryJar, RecipeBox } from '../components/illustrations'
import { MascotSays } from '../components/Mascot'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import { DECORATION_THEMES, DECORATIONS, findDecoration, themeDecorations } from '../decorating/catalog'
import { DecorationArt } from '../decorating/DecorArt'
import { KitchenCupboard, KitchenWall, type ScenePieces } from '../decorating/KitchenScene'
import { decorRemark } from '../decorating/moments'
import { decoratingOpen, decorationStatus, equippedIn, ownedForSlot, type DecorMoment, type DecorationStatus } from '../decorating/rules'
import { DECORATION_SLOTS, SLOT_INFO, type DecorationSlot } from '../decorating/slots'
import type { DecorationDefinition } from '../decorating/types'
import type { DecorationId } from '../domain/ids'
import { familyName } from '../domain/recipeBook'
import { RARITY_LABELS } from '../domain/progression'
import { availableScene } from '../story/progress'
import { StoryScenePlayer, type SceneEnding } from '../story/StoryScenePlayer'
import './DecorateScreen.css'

const CUPBOARD_SCENE_CHAPTER = 'chapter_old-cupboard'

/** The spot, as part of a sentence: "the wall", "the tea towel hook". */
const SPOT_PHRASE: Record<DecorationSlot, string> = {
  wall: 'the wall',
  window: 'the window',
  shelf: 'the shelf',
  'counter-left': 'the counter, by the recipe box',
  plant: 'the counter, under the window',
  'counter-right': 'the counter, by the pantry jar',
  textile: 'the cupboard door',
}

/** How a piece that isn't in the cupboard yet arrives, in words. Never a secret's name, never a recipe. */
function howToGet(status: Exclude<DecorationStatus, { kind: 'owned' }>): string {
  if (status.kind === 'for-sale') return `${status.price} Crumbs`
  const { rule } = status
  switch (rule.type) {
    case 'chapter-complete':
      return 'In the old cupboard.'
    case 'family-complete':
      return `For finding every ${familyName(rule.familyId)} card.`
    case 'first-rarity':
      return `For your first ${RARITY_LABELS[rule.rarity]} recipe.`
    case 'first-secret':
      return 'For your first secret recipe.'
  }
}

const optionId = (id: DecorationId) => `decor-option-${id}`

/**
 * Edit mode for the kitchen. The same picture as Home Kitchen, drawn as a
 * plan: every spot is a button. Pick a spot, try something from the
 * cupboard in it (nothing is saved yet), then put it out or clear the spot.
 * Taps and clicks only, no dragging, so it works the same with a keyboard,
 * a mouse or a thumb. Purely cosmetic: nothing here changes a bake.
 */
export function DecorateScreen() {
  const save = useSave()
  const { seeStoryScene, equipDecoration, clearDecorationSlot, buyDecoration } = useGame()
  const playSound = useSound()
  const [selected, setSelected] = useState<DecorationSlot>('wall')
  const [trying, setTrying] = useState<DecorationId | null>(null)
  const [remark, setRemark] = useState<DecorMoment | null>(null)
  const [status, setStatus] = useState('')
  const [confirming, setConfirming] = useState<DecorationId | null>(null)
  const focusAfterBuy = useRef<DecorationId | null>(null)
  const [opened, setOpened] = useState<SceneEnding | null>(null)
  const openedNote = useRef<HTMLDivElement>(null)
  const ids = { chooser: useId(), putReason: useId(), clearReason: useId(), sets: useId() }

  const open = decoratingOpen(save)
  const waiting = availableScene(save)
  const cupboardScene = waiting?.chapter.id === CUPBOARD_SCENE_CHAPTER ? waiting : null

  // After buying, land on the new piece in the cupboard (the button that bought it has gone).
  // The dialog's own effect runs first and finds nothing to return to; this lands after it.
  useEffect(() => {
    if (confirming || !focusAfterBuy.current) return
    document.getElementById(optionId(focusAfterBuy.current))?.focus()
    focusAfterBuy.current = null
  }, [confirming])

  // Once the cupboard's scene is put back, the note about what's inside is read out.
  useEffect(() => {
    if (opened) openedNote.current?.focus()
  }, [opened])

  if (!open) {
    return (
      <div className="decorate">
        <ScreenTitle className="decorate__title">The old cupboard</ScreenTitle>
        <HandNote className="decorate__locked">It’s locked. Whatever’s inside will keep.</HandNote>
        <LinkButton href={hrefFor('kitchen')}>Back to the kitchen</LinkButton>
      </div>
    )
  }

  if (cupboardScene) {
    return (
      <div className="decorate">
        <div className="decorate__top">
          <ScreenTitle className="decorate__title">The old cupboard</ScreenTitle>
        </div>
        <StoryScenePlayer
          key={cupboardScene.scene.id}
          placed={cupboardScene}
          mode="first"
          onEnd={(how) => {
            const result = seeStoryScene(cupboardScene.scene.id)
            if (result.ok && result.firstTime) playSound('decor-open')
            setOpened(how)
          }}
        />
      </div>
    )
  }

  const equipped = equippedIn(save, selected)
  const triedPiece = trying ? findDecoration(trying) : undefined
  const owned = ownedForSlot(save, selected)
  const notYet = DECORATIONS.filter((piece) => piece.slot === selected && decorationStatus(save, piece).kind !== 'owned')
  const pieces: ScenePieces = Object.fromEntries(
    DECORATION_SLOTS.flatMap((slot) => {
      const shown = slot === selected && triedPiece ? triedPiece : equippedIn(save, slot)
      return shown ? [[slot, shown]] : []
    }),
  )
  const spot = SPOT_PHRASE[selected]
  const pending = confirming ? findDecoration(confirming) : undefined
  const price = pending?.unlock.type === 'crumbs' ? pending.unlock.price : 0

  function choose(slot: DecorationSlot) {
    setSelected(slot)
    setTrying(null)
    const count = ownedForSlot(save, slot).length
    setStatus(`Choosing for ${SPOT_PHRASE[slot]}. ${count === 0 ? 'Nothing in your cupboard fits here yet.' : `${count} ${count === 1 ? 'thing' : 'things'} in your cupboard ${count === 1 ? 'fits' : 'fit'} here.`}`)
  }

  function tryOn(piece: DecorationDefinition) {
    if (piece.id === equipped?.id) {
      setTrying(null)
      setStatus(`${piece.name} is already out on ${spot}.`)
      return
    }
    setTrying(piece.id)
    setStatus(`Trying the ${piece.name.toLowerCase()} on ${spot}. It isn’t out yet.`)
  }

  function putOut() {
    if (!triedPiece) return
    const result = equipDecoration(selected, triedPiece.id)
    if (!result.ok) return
    playSound('decor-equip')
    setTrying(null)
    setRemark(result.moment)
    const replaced = result.replaced ? ` The ${result.replaced.name.toLowerCase()} went back in the cupboard.` : ''
    setStatus(`Put out: ${result.decoration.name}, on ${spot}.${replaced}`)
  }

  function clear() {
    const cleared = clearDecorationSlot(selected)
    setTrying(null)
    if (!cleared && !equipped) return
    playSound('remove')
    setStatus(`${(cleared ?? equipped)!.name} went back in the cupboard. Nothing is out on ${spot} now.`)
  }

  function buy() {
    if (!confirming) return
    const result = buyDecoration(confirming)
    setConfirming(null)
    if (!result.ok) return
    playSound('decor-unlock')
    const { decoration } = result
    focusAfterBuy.current = decoration.id
    if (decoration.slot === selected) setTrying(decoration.id)
    setStatus(`Bought the ${decoration.name.toLowerCase()}. It’s in your cupboard for good. Trying it on ${SPOT_PHRASE[decoration.slot]}.`)
  }

  const nothingToPut = !triedPiece
  const nothingToClear = !equipped

  return (
    <div className="decorate">
      <div className="decorate__top">
        <ScreenTitle className="decorate__title">Make it yours</ScreenTitle>
        <LinkButton variant="primary" href={hrefFor('kitchen')}>
          Done
        </LinkButton>
      </div>
      <p className="decorate__intro">
        Pick a spot, try something from the old cupboard in it, then put it out. It’s just for looks: nothing here changes a bake.
      </p>

      {opened && (
        <div className="decorate__opened" ref={openedNote} tabIndex={-1}>
          <p>
            {opened === 'skipped' ? 'Skipped. ' : ''}The cupboard’s open, and everything in it is yours to put out. You can read what was
            inside again in the Recipe Box Notes.
          </p>
        </div>
      )}

      {/* The plan: the kitchen, with every spot a button. */}
      <div className="decorate__scene">
        <KitchenWall pieces={pieces} editing={{ selected, previewing: triedPiece ? selected : null, onSelect: choose }} />
        <div className="decorate__counter" aria-hidden="true">
          <RecipeBox className="decorate__counter-art" />
          <MixingBowl className="decorate__counter-art decorate__counter-art--bowl" />
          <PantryJar className="decorate__counter-art" />
        </div>
        <KitchenCupboard pieces={pieces} state="open" editing={{ selected, previewing: triedPiece ? selected : null, onSelect: choose }} />
      </div>

      <p className="visually-hidden" role="status">
        {status}
      </p>

      <section className="chooser" aria-labelledby={ids.chooser}>
        <div className="chooser__head">
          <h2 id={ids.chooser} className="chooser__title">
            <span className="chooser__kicker">Choosing for</span> {SLOT_INFO[selected].name}
          </h2>
          <p className="chooser__now">{equipped ? `Out now: ${equipped.name}` : 'Nothing out here.'}</p>
        </div>
        <p className="chooser__hint">{SLOT_INFO[selected].hint}</p>

        {owned.length > 0 ? (
          <ul className="cupboard-shelf" aria-label={`In your cupboard, for ${spot}`}>
            {owned.map((piece) => {
              const isOut = piece.id === equipped?.id
              const isTried = piece.id === trying
              return (
                <li key={piece.id} className="cupboard-shelf__item">
                  <button
                    type="button"
                    id={optionId(piece.id)}
                    className="cupboard-piece"
                    aria-pressed={isTried || (isOut && !trying)}
                    onClick={() => tryOn(piece)}
                  >
                    <DecorationArt look={piece.visual} className="cupboard-piece__art" />
                    <span className="cupboard-piece__name">{piece.name}</span>
                    {isOut && <span className="cupboard-piece__state">Out now</span>}
                    {isTried && <span className="cupboard-piece__state cupboard-piece__state--trying">Trying it</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <HandNote className="chooser__empty">Nothing for this spot in your cupboard yet.</HandNote>
        )}

        <div className="chooser__actions">
          <Button
            variant={nothingToPut ? 'plain' : 'primary'}
            aria-disabled={nothingToPut ? true : undefined}
            aria-describedby={nothingToPut ? ids.putReason : undefined}
            onClick={putOut}
          >
            {triedPiece ? `Put out the ${triedPiece.name.toLowerCase()}` : 'Put it out'}
          </Button>
          <Button
            aria-disabled={nothingToClear ? true : undefined}
            aria-describedby={nothingToClear ? ids.clearReason : undefined}
            onClick={clear}
          >
            Clear this spot
          </Button>
        </div>
        <div className="chooser__reasons">
          {nothingToPut && (
            <p id={ids.putReason} className="chooser__reason">
              {owned.length > 0 ? 'Pick something above to try it here first.' : 'Nothing to put out here yet.'}
            </p>
          )}
          {nothingToClear && (
            <p id={ids.clearReason} className="chooser__reason">
              Nothing’s out here to clear.
            </p>
          )}
        </div>

        {/* Marmalade's one-time remarks: read out where they appear, never taking focus. */}
        <div role="status" className="chooser__remark">
          {remark && <MascotSays expression={decorRemark(remark).expression}>{decorRemark(remark).line}</MascotSays>}
        </div>

        {notYet.length > 0 && (
          <div className="chooser__later">
            <h3 className="chooser__later-title">Not in your cupboard yet</h3>
            <ul className="chooser__later-list">
              {notYet.map((piece) => (
                <NotYetPiece key={piece.id} piece={piece} status={decorationStatus(save, piece)} onBuy={() => setConfirming(piece.id)} />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="decor-sets" aria-labelledby={ids.sets}>
        <h2 id={ids.sets} className="decor-sets__title">
          What’s in the cupboard
        </h2>
        <p className="decor-sets__intro">Some pieces go together. Put out as many or as few as you like.</p>
        <div className="decor-sets__groups">
          {[...DECORATION_THEMES.map((theme) => ({ name: theme.name, pieces: themeDecorations(theme.id) })), { name: 'Keepsakes', pieces: DECORATIONS.filter((piece) => !piece.theme) }].map(
            (group) => {
              const outCount = group.pieces.filter((piece) => save.decorating.equippedBySlot[piece.slot] === piece.id).length
              return (
                <section key={group.name} className="decor-set" aria-label={group.name}>
                  <h3 className="decor-set__name">
                    {group.name} <span className="decor-set__count">{outCount} of {group.pieces.length} out</span>
                  </h3>
                  <ul className="decor-set__list">
                    {group.pieces.map((piece) => {
                      const pieceStatus = decorationStatus(save, piece)
                      const isOut = save.decorating.equippedBySlot[piece.slot] === piece.id
                      return (
                        <li key={piece.id} className="decor-set__piece" data-owned={pieceStatus.kind === 'owned' ? '' : undefined}>
                          <span className="decor-set__piece-name">{piece.name}</span>{' '}
                          <span className="decor-set__piece-state">
                            {isOut
                              ? `Out on ${SPOT_PHRASE[piece.slot]}`
                              : pieceStatus.kind === 'owned'
                                ? `In the cupboard · for ${SPOT_PHRASE[piece.slot]}`
                                : `${howToGet(pieceStatus)}${pieceStatus.kind === 'for-sale' ? ` · for ${SPOT_PHRASE[piece.slot]}` : ''}`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            },
          )}
        </div>
      </section>

      <ConfirmDialog
        open={pending !== undefined}
        title={pending ? `Buy the ${pending.name.toLowerCase()}?` : ''}
        confirmLabel="Buy it"
        cancelLabel="Not now"
        confirmVariant="primary"
        onConfirm={buy}
        onCancel={() => setConfirming(null)}
      >
        {pending && (
          <>
            <p>
              It costs <strong>{price} Crumbs</strong> and stays in your cupboard for good. It’s just for looks: it won’t change any bake.
            </p>
            <p>You’ll have {save.progression.crumbs - price} Crumbs left.</p>
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}

/** A piece for this spot that isn't owned yet: how it arrives, and a way to buy it if it's for sale. */
function NotYetPiece({ piece, status, onBuy }: { piece: DecorationDefinition; status: DecorationStatus; onBuy: () => void }) {
  const reasonId = useId()
  if (status.kind === 'owned') return null
  const short = status.kind === 'for-sale' && !status.affordable ? status.short : 0
  return (
    <li className="later-piece" data-kind={status.kind}>
      <DecorationArt look={piece.visual} className="later-piece__art" />
      <div className="later-piece__tag">
        <h4 className="later-piece__name">{piece.name}</h4>
        <p className="later-piece__description">{piece.description}</p>
        {status.kind === 'for-sale' ? (
          <>
            <p className="later-piece__price">
              <CrumbsMark className="later-piece__crumbs-mark" />
              {status.price} Crumbs
            </p>
            <Button
              variant={short ? 'plain' : 'primary'}
              className="later-piece__buy"
              aria-disabled={short ? true : undefined}
              aria-describedby={short ? reasonId : undefined}
              aria-label={`Buy the ${piece.name.toLowerCase()} for ${status.price} Crumbs`}
              onClick={() => {
                if (!short) onBuy()
              }}
            >
              Buy it
            </Button>
            {short > 0 && (
              <p id={reasonId} className="later-piece__reason">
                You need {short} more {short === 1 ? 'Crumb' : 'Crumbs'}. New recipes earn them.
              </p>
            )}
          </>
        ) : (
          <p className="later-piece__how">{howToGet(status)}</p>
        )}
      </div>
    </li>
  )
}
