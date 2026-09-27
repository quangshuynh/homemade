import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useGame } from '../app/gameContext'
import { Button } from '../components/Button'
import { HandNote, RecipeCard } from '../components/Paper'
import { NAME_MAX_LENGTH, normalizeName, validateName, type NameProblem } from '../domain/save'
import './OnboardingScreen.css'

type Field = 'playerName' | 'bakeryName'

const messages: Record<Field, Record<NameProblem, string>> = {
  playerName: {
    empty: 'Write down a name or nickname, even just an initial.',
    'too-long': `Keep it to ${NAME_MAX_LENGTH} letters or fewer.`,
  },
  bakeryName: {
    empty: 'Every kitchen needs a name. You can keep it simple.',
    'too-long': `Keep it to ${NAME_MAX_LENGTH} letters or fewer, so it fits over the door.`,
  },
}

export function OnboardingScreen() {
  const { startGame } = useGame()
  const [values, setValues] = useState<Record<Field, string>>({ playerName: '', bakeryName: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, NameProblem>>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'failed'>('idle')
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})
  const ids = { playerName: useId(), bakeryName: useId() }

  useEffect(() => {
    document.title = 'A new kitchen · Homemade'
  }, [])

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found: Partial<Record<Field, NameProblem>> = {}
    for (const field of ['playerName', 'bakeryName'] as const) {
      const problem = validateName(values[field])
      if (problem) found[field] = problem
    }
    setErrors(found)
    const firstInvalid = (['playerName', 'bakeryName'] as const).find((field) => found[field])
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus()
      return
    }

    setStatus('saving')
    try {
      await startGame(values)
    } catch {
      setStatus('failed')
    }
  }

  const signName = normalizeName(values.bakeryName)

  return (
    <main className="onboarding">
      <p className="onboarding__sign" aria-hidden="true">
        <span className={signName ? undefined : 'onboarding__sign--blank'}>{signName || 'Your kitchen'}</span>
      </p>

      <RecipeCard className="onboarding__card">
        <form className="onboarding__form" onSubmit={handleSubmit} noValidate aria-labelledby="onboarding-title">
          <h1 id="onboarding-title" className="onboarding__title">
            A new kitchen
          </h1>
          <HandNote>Before anything gets baked, let’s put a couple of names on things.</HandNote>

          {(['playerName', 'bakeryName'] as const).map((field) => {
            const id = ids[field]
            const hintId = `${id}-hint`
            const errorId = `${id}-error`
            const problem = errors[field]
            return (
              <div className="onboarding__field" key={field}>
                <label className="onboarding__label" htmlFor={id}>
                  {field === 'playerName' ? 'What should the kitchen call you?' : 'What’s your kitchen called?'}
                </label>
                <p className="onboarding__hint" id={hintId}>
                  {field === 'playerName' ? 'Your name or a nickname.' : 'It goes on the sign over the door.'}
                </p>
                <input
                  ref={(element) => {
                    inputs.current[field] = element
                  }}
                  id={id}
                  name={field}
                  className="onboarding__input"
                  type="text"
                  autoComplete={field === 'playerName' ? 'nickname' : 'off'}
                  autoCapitalize="words"
                  spellCheck={false}
                  maxLength={NAME_MAX_LENGTH + 8}
                  value={values[field]}
                  onChange={(event) => update(field, event.target.value)}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={problem ? `${hintId} ${errorId}` : hintId}
                />
                {problem && (
                  <p className="onboarding__error" id={errorId}>
                    {messages[field][problem]}
                  </p>
                )}
              </div>
            )
          })}

          <div className="onboarding__actions">
            <Button type="submit" variant="primary" disabled={status === 'saving'}>
              {status === 'saving' ? 'Opening…' : 'Open the kitchen'}
            </Button>
            {status === 'failed' && (
              <p className="onboarding__error" role="alert">
                The kitchen couldn’t be saved in this browser. Check that site storage is allowed, then try again.
              </p>
            )}
          </div>
        </form>
      </RecipeCard>
    </main>
  )
}
