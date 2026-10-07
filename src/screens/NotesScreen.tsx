import { useEffect, useRef, useState } from 'react'
import { useGame, useSave } from '../app/gameContext'
import { hrefFor } from '../app/routes'
import { useSound } from '../audio/soundContext'
import { Button, LinkButton } from '../components/Button'
import { HandNote } from '../components/Paper'
import { ScreenTitle } from '../components/ScreenTitle'
import type { StorySceneId } from '../domain/ids'
import { findScene, type PlacedScene } from '../story/chapters'
import { availableScene, chapterViews, currentChapter, type ChapterView } from '../story/progress'
import { StoryNoteCard } from '../story/StoryNoteCard'
import { StoryScenePlayer, type SceneEnding } from '../story/StoryScenePlayer'
import './NotesScreen.css'

type Playing = { sceneId: StorySceneId; mode: 'first' | 'replay' }

/** What just happened, said once after a scene closes. */
type Ended = { how: SceneEnding; chapterTitle: string | null; crumbs: number | null }

const chapterHeadingId = (chapter: ChapterView['chapter']) => `chapter-${chapter.id}`

/**
 * Everything in the recipe box that isn't a recipe: labels, scraps and
 * pencil in the margins, filed behind a divider for each chapter of the
 * story. A new scene waits here as a slip sticking out of the box, until
 * the player chooses to read it. Chapters still to come aren't here at all.
 */
export function NotesScreen() {
  const save = useSave()
  const { seeStoryScene } = useGame()
  const playSound = useSound()
  const [playing, setPlaying] = useState<Playing | null>(null)
  const [ended, setEnded] = useState<Ended | null>(null)
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const endedNote = useRef<HTMLDivElement>(null)
  const waiting = availableScene(save)
  const chapters = chapterViews(save)
  const unfinished = currentChapter(save) !== null
  const placed: PlacedScene | undefined = playing ? findScene(playing.sceneId) : undefined

  // After a scene closes, land somewhere that says what happened: the "put back"
  // note after a first reading, or the chapter it came from after a replay.
  useEffect(() => {
    if (playing) return
    if (ended) endedNote.current?.focus()
    else if (returnTo) document.getElementById(returnTo)?.focus()
  }, [playing, ended, returnTo])

  function start(sceneId: StorySceneId, mode: Playing['mode']) {
    setEnded(null)
    setReturnTo(null)
    setPlaying({ sceneId, mode })
  }

  function end(how: SceneEnding) {
    if (!playing || !placed) return
    if (playing.mode === 'replay') {
      // A replay records nothing and pays nothing.
      setReturnTo(chapterHeadingId(placed.chapter))
      setPlaying(null)
      return
    }
    const result = seeStoryScene(playing.sceneId)
    setPlaying(null)
    if (!result.ok) return
    if (result.firstTime) playSound('story-note')
    setEnded({ how, chapterTitle: result.completedChapter?.title ?? null, crumbs: result.reward?.crumbs ?? null })
  }

  return (
    <div className="notes">
      <div className="notes__top">
        <ScreenTitle className="notes__title">Recipe Box Notes</ScreenTitle>
        <a className="notes__back" href={hrefFor('recipe-book')}>
          Back to the Recipe Book
        </a>
      </div>
      <p className="notes__intro">Labels, scraps and pencil in the margins: everything in the old box that isn’t a recipe.</p>

      {placed && playing ? (
        <StoryScenePlayer key={`${playing.sceneId}-${playing.mode}`} placed={placed} mode={playing.mode} onEnd={end} />
      ) : (
        <>
          {ended && (
            <div className="notes__ended" ref={endedNote} tabIndex={-1}>
              <p>
                {ended.how === 'skipped' ? 'Skipped. Whatever was found is filed below, and you can replay it any time.' : 'Put back in the box.'}
                {ended.chapterTitle && ` That’s the end of ${ended.chapterTitle}.`}
              </p>
              {ended.crumbs !== null && <p className="notes__crumbs">Tucked between the cards: {ended.crumbs} Crumbs.</p>}
            </div>
          )}
          {waiting && <WaitingSlip placed={waiting} again={ended !== null} onRead={() => start(waiting.scene.id, 'first')} />}
        </>
      )}

      {chapters.length === 0 && !waiting && !playing && (
        <HandNote className="notes__empty">Nothing here yet. The box is still mostly blank. Keep baking.</HandNote>
      )}

      {chapters.map((view) => (
        <ChapterNotes key={view.chapter.id} view={view} onReplay={(sceneId) => start(sceneId, 'replay')} />
      ))}

      {chapters.length > 0 && unfinished && !playing && (
        <HandNote className="notes__faded">The rest of the box is still too faded to read. Keep baking.</HandNote>
      )}

      <div className="notes__foot">
        <LinkButton href={hrefFor('bake')}>Go and bake</LinkButton>
      </div>
    </div>
  )
}

/** The next scene, as a slip of paper sticking out of the box. Opened only when the player chooses. */
function WaitingSlip({ placed, again, onRead }: { placed: PlacedScene; again: boolean; onRead: () => void }) {
  return (
    <section className="notes__waiting" aria-labelledby="notes-waiting">
      <span className="notes__waiting-flag" aria-hidden="true" />
      <h2 id="notes-waiting" className="notes__waiting-title">
        {again ? 'Another note is waiting' : 'A new note'}
      </h2>
      <p className="notes__waiting-text">{placed.scene.nudge}</p>
      <Button variant="primary" onClick={onRead}>
        Read it with Marmalade
      </Button>
    </section>
  )
}

function ChapterNotes({ view, onReplay }: { view: ChapterView; onReplay: (sceneId: StorySceneId) => void }) {
  const { chapter, complete, seenScenes, notes } = view
  const headingId = chapterHeadingId(chapter)
  const several = chapter.scenes.length > 1
  return (
    <section className="notes-chapter" aria-labelledby={headingId} data-complete={complete ? '' : undefined}>
      <div className="notes-chapter__divider">
        <h2 id={headingId} className="notes-chapter__name" tabIndex={-1}>
          <span className="notes-chapter__number">Chapter {chapter.number}</span> {chapter.title}
        </h2>
        <p className="notes-chapter__state">{complete ? 'Read' : 'More to come'}</p>
      </div>
      {notes.length > 0 && (
        <ul className="notes-chapter__notes">
          {notes.map((note) => (
            <li key={note.id}>
              <StoryNoteCard note={note} as="listed" />
            </li>
          ))}
        </ul>
      )}
      <div className="notes-chapter__replays">
        {seenScenes.map((placed) => {
          const part = chapter.scenes.findIndex((scene) => scene.id === placed.scene.id) + 1
          return (
            <Button
              key={placed.scene.id}
              className="notes-chapter__replay"
              aria-label={`Replay chapter ${chapter.number}, ${chapter.title}${several ? `, part ${part}` : ''}, with Marmalade`}
              onClick={() => onReplay(placed.scene.id)}
            >
              {several ? `Replay part ${part}` : 'Replay with Marmalade'}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
