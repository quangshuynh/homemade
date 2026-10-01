import { useEffect, useRef } from 'react'
import { useSave } from '../app/gameContext'
import { navigate, ROUTES, type RouteId } from '../app/routes'
import { Button } from '../components/Button'
import { MascotSays } from '../components/Mascot'
import { SCREEN_TITLE_ID } from '../components/ScreenTitle'
import { tutorialLine } from './lines'
import { STEP_DEFINITIONS, stepNumber, TUTORIAL_STEPS, type TutorialRun } from './tutorial'
import { useTutorial } from './tutorialContext'
import './TutorialGuide.css'

const NEXT_LABELS: Partial<Record<TutorialRun['step'], string>> = {
  welcome: 'Hello, Marmalade',
  story: 'Let’s bake',
  discovered: 'Where does it go?',
  book: 'What are Crumbs?',
  finish: 'Off you go',
}

/**
 * The tutorial card: Marmalade, what she's saying, and the controls. Sits at
 * the top of the screen it belongs to, in the page rather than over it, so
 * it never covers the shelf, the bowl or the tab bar.
 *
 * Talking cards take focus (so they're read out and Next is one Tab away);
 * cards that wait for the player to do something leave focus where it is
 * and are announced politely instead.
 */
export function TutorialGuide({ route }: { route: RouteId }) {
  const save = useSave()
  const { run, next, skip } = useTutorial()
  const lineRef = useRef<HTMLParagraphElement>(null)
  const step = run?.step
  const definition = step ? STEP_DEFINITIONS[step] : null
  const here = definition?.route === route
  const talking = definition?.kind === 'talk'

  useEffect(() => {
    if (step && talking && here) lineRef.current?.focus({ preventScroll: false })
  }, [step, talking, here])

  if (!run || !definition) return null
  const line = tutorialLine(run, save)

  return (
    <aside className="guide" aria-label="Tutorial">
      <div className="guide__top">
        <p className="guide__count">
          Card {stepNumber(run.step)} of {TUTORIAL_STEPS.length}
        </p>
        <Button
          className="guide__skip"
          onClick={() => {
            skip()
            // The card is about to go: land on the screen's heading, not on nothing. A timeout
            // rather than a frame, so it still happens in a tab that isn't painting.
            window.setTimeout(() => document.getElementById(SCREEN_TITLE_ID)?.focus(), 0)
          }}
        >
          Skip the tutorial
        </Button>
      </div>
      <MascotSays expression={definition.expression} lineRef={talking && here ? lineRef : undefined}>
        {line}
      </MascotSays>
      {!here ? (
        <div className="guide__actions">
          <Button variant="primary" onClick={() => navigate(definition.route)}>
            Back to the {ROUTES[definition.route].title}
          </Button>
        </div>
      ) : (
        talking && (
          <div className="guide__actions">
            <Button variant="primary" onClick={next}>
              {NEXT_LABELS[run.step] ?? 'Next'}
            </Button>
          </div>
        )
      )}
      {/* Cards that wait for the player are read out without moving focus. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {here && !talking ? `Marmalade: ${line}` : ''}
      </p>
    </aside>
  )
}
