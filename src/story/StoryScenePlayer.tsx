import { useEffect, useId, useRef, useState } from 'react'
import { useSound } from '../audio/soundContext'
import { Button } from '../components/Button'
import { MascotSays } from '../components/Mascot'
import type { PlacedScene } from './chapters'
import { getNote } from './notes'
import { StoryNoteCard } from './StoryNoteCard'
import '../tutorial/TutorialGuide.css'
import './Story.css'

export type SceneEnding = 'finished' | 'skipped'

type StorySceneProps = {
  placed: PlacedScene
  /** A replay plays the same beats and changes nothing when it ends. */
  mode: 'first' | 'replay'
  onEnd: (how: SceneEnding) => void
}

/**
 * A short scene, one beat at a time, on the same propped-up card as the
 * tutorial: Marmalade and her line, or a note read out in its own hand.
 * Every beat takes focus, so it's read out and Next is one Tab away; Skip is
 * always there. No timers and no forced pauses: the player sets the pace.
 */
export function StoryScenePlayer({ placed, mode, onEnd }: StorySceneProps) {
  const { chapter, scene } = placed
  const [index, setIndex] = useState(0)
  const lineRef = useRef<HTMLParagraphElement>(null)
  const titleId = useId()
  const playSound = useSound()
  const beat = scene.beats[index]!
  const last = index === scene.beats.length - 1
  const part = chapter.scenes.length > 1 ? `, part ${chapter.scenes.findIndex((entry) => entry.id === scene.id) + 1}` : ''
  // One string, so it's read out exactly as written.
  const title = `Chapter ${chapter.number}: ${chapter.title}${part}${mode === 'replay' ? ' (replay)' : ''}`

  useEffect(() => {
    lineRef.current?.focus()
  }, [index])

  function next() {
    playSound('tutorial-next')
    if (last) onEnd('finished')
    else setIndex(index + 1)
  }

  return (
    <section className="guide story-scene" aria-labelledby={titleId} data-mode={mode}>
      <div className="guide__top">
        <h2 id={titleId} className="story-scene__title">
          {title}
        </h2>
        <Button className="guide__skip" onClick={() => onEnd('skipped')}>
          {mode === 'replay' ? 'Stop the replay' : 'Skip this scene'}
        </Button>
      </div>
      <p className="guide__count">
        {index + 1} of {scene.beats.length}
      </p>
      {beat.speaker === 'marmalade' ? (
        // Keyed by beat, so a new line with the same face is still a new element (and re-read).
        <MascotSays key={index} expression={beat.expression} lineRef={lineRef}>
          {beat.line}
        </MascotSays>
      ) : (
        <StoryNoteCard key={index} note={getNote(beat.noteId)} as="beat" lineRef={lineRef} />
      )}
      <div className="guide__actions">
        <Button variant="primary" onClick={next}>
          {!last ? 'Next' : mode === 'replay' ? 'Close' : 'Put it back in the box'}
        </Button>
      </div>
    </section>
  )
}
