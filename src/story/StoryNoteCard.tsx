import type React from 'react'
import { useSave } from '../app/gameContext'
import { isDiscovered } from '../domain/baking'
import { findRecipeById } from '../domain/recipes'
import type { StoryNote } from './types'
import './Story.css'

type StoryNoteCardProps = {
  note: StoryNote
  /** In the notes list each note is an `h3` under its chapter; inside a scene it's read out as one line. */
  as: 'listed' | 'beat'
  lineRef?: React.Ref<HTMLParagraphElement>
}

/**
 * A note found in the kitchen, drawn as what it is: pencil beside a recipe,
 * a whole card, a torn scrap or a kraft label. Always in the other hand,
 * graphite pencil, never Marmalade's blue pen. A clue to a secret looks like
 * any other note; only once the secret is baked does Marmalade pencil
 * "Found it" beside it.
 */
export function StoryNoteCard({ note, as, lineRef }: StoryNoteCardProps) {
  const save = useSave()
  const secret = note.secretRecipeId ? findRecipeById(note.secretRecipeId) : undefined
  const found = secret && isDiscovered(save, secret.id) ? secret : undefined
  const headingId = `story-note-${note.id}`

  if (as === 'beat') {
    return (
      <div className="story-note" data-kind={note.kind}>
        <p className="story-note__text" ref={lineRef} tabIndex={-1}>
          <span className="story-note__where">
            {note.title}
            <span className="visually-hidden">, in someone else’s handwriting:</span>
          </span>{' '}
          {note.text}
        </p>
      </div>
    )
  }

  return (
    <article className="story-note" data-kind={note.kind} aria-labelledby={headingId}>
      <h3 id={headingId} className="story-note__where">
        {note.title}
      </h3>
      <p className="story-note__text">{note.text}</p>
      {found && (
        <p className="story-note__found">
          <span className="story-note__found-by">Marmalade pencilled beside it:</span> “Found it. {found.name}.”
        </p>
      )}
    </article>
  )
}
