import type { RouteId } from '../app/routes'
import type { MascotExpression } from '../components/Mascot'
import { ingredientKey, type BakeOutcome, type Bowl } from '../domain/baking'
import { BUTTER, FLOUR, SUGAR } from '../domain/ingredients'

/**
 * The first-time tutorial as a small state machine. Pure: the provider
 * feeds it what the player does, and it says which card comes next.
 *
 * It teaches one bake end to end (pick, mix, bake, discover), then shows
 * where recipes go and how progress works, and lets go. It never pays a
 * reward of its own: the only reward is the discovery itself, which can
 * only happen once, so replaying it can't earn anything.
 */
export type TutorialStepId = 'welcome' | 'story' | 'pick' | 'mix' | 'bake' | 'discovered' | 'book' | 'progress' | 'finish'

export const TUTORIAL_STEPS: readonly TutorialStepId[] = ['welcome', 'story', 'pick', 'mix', 'bake', 'discovered', 'book', 'progress', 'finish']

/** Shortbread: all starter ingredients, so every kitchen can make it. */
export const TUTORIAL_BOWL: readonly [typeof FLOUR, typeof SUGAR, typeof BUTTER] = [FLOUR, SUGAR, BUTTER]

export type StepDefinition = {
  /** Where the step happens. */
  route: RouteId
  /** `talk` cards wait for Next; `do` cards wait for the player to do the thing. */
  kind: 'talk' | 'do'
  expression: MascotExpression
}

export const STEP_DEFINITIONS: Record<TutorialStepId, StepDefinition> = {
  welcome: { route: 'kitchen', kind: 'talk', expression: 'excited' },
  story: { route: 'kitchen', kind: 'talk', expression: 'thinking' },
  pick: { route: 'bake', kind: 'do', expression: 'idle' },
  mix: { route: 'bake', kind: 'do', expression: 'happy' },
  bake: { route: 'bake', kind: 'do', expression: 'excited' },
  discovered: { route: 'bake', kind: 'talk', expression: 'celebrate' },
  book: { route: 'recipe-book', kind: 'talk', expression: 'proud' },
  progress: { route: 'pantry', kind: 'talk', expression: 'thinking' },
  finish: { route: 'pantry', kind: 'talk', expression: 'happy' },
}

export type TutorialRun = {
  step: TutorialStepId
  /** The tutorial bake, once it's out of the oven. */
  outcome: BakeOutcome | null
}

export type TutorialEvent =
  | { type: 'next' }
  | { type: 'bowl'; bowl: Bowl; mixed: boolean }
  | { type: 'baked'; outcome: BakeOutcome }

export const START: TutorialRun = { step: 'welcome', outcome: null }

export function isTutorialBowl(bowl: Bowl): boolean {
  return ingredientKey(bowl) === ingredientKey(TUTORIAL_BOWL)
}

/** Null means the tutorial is over. */
export function advance(run: TutorialRun, event: TutorialEvent): TutorialRun | null {
  const { step } = run
  switch (event.type) {
    case 'next': {
      if (STEP_DEFINITIONS[step].kind !== 'talk') return run
      const index = TUTORIAL_STEPS.indexOf(step)
      const next = TUTORIAL_STEPS[index + 1]
      return next ? { ...run, step: next } : null
    }
    case 'bowl': {
      if (step !== 'pick' && step !== 'mix' && step !== 'bake') return run
      // Anything other than the tutorial set goes back to picking; mixing it moves on to the oven.
      const next: TutorialStepId = !isTutorialBowl(event.bowl) ? 'pick' : event.mixed ? 'bake' : 'mix'
      return next === step ? run : { ...run, step: next }
    }
    case 'baked':
      return step === 'bake' ? { step: 'discovered', outcome: event.outcome } : run
  }
}

/** "Card 3 of 9", for the guide. */
export function stepNumber(step: TutorialStepId): number {
  return TUTORIAL_STEPS.indexOf(step) + 1
}
