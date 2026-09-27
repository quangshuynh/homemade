import { NAME_MAX_LENGTH, type NameProblem } from '../domain/save'

/** What to say about a name that won't do. Shared by onboarding and Settings so the rules read the same. */
export const NAME_MESSAGES: Record<'playerName' | 'bakeryName', Record<NameProblem, string>> = {
  playerName: {
    empty: 'Write down a name or nickname, even just an initial.',
    'too-long': `Keep it to ${NAME_MAX_LENGTH} letters or fewer.`,
  },
  bakeryName: {
    empty: 'Every kitchen needs a name. You can keep it simple.',
    'too-long': `Keep it to ${NAME_MAX_LENGTH} letters or fewer, so it fits over the door.`,
  },
}
