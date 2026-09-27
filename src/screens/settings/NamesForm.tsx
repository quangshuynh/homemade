import { useId, useRef, useState, type FormEvent } from 'react'
import { useGame, useSave } from '../../app/gameContext'
import { Button } from '../../components/Button'
import { NAME_MAX_LENGTH, renameProfile, type NameProblem } from '../../domain/save'
import { NAME_MESSAGES } from '../nameMessages'
import '../../components/LineInput.css'

type Field = 'playerName' | 'bakeryName'

const LABELS: Record<Field, string> = {
  playerName: 'What the kitchen calls you',
  bakeryName: 'Your kitchen’s name',
}

/**
 * Change either name, with the same rules as the first launch. Only the
 * names change: the player id and everything else stay put.
 */
export function NamesForm() {
  const save = useSave()
  const { updateSave } = useGame()
  const [values, setValues] = useState<Record<Field, string>>({ playerName: save.profile.name, bakeryName: save.profile.bakeryName })
  const [errors, setErrors] = useState<Partial<Record<Field, NameProblem>>>({})
  const [confirmation, setConfirmation] = useState('')
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})
  const ids = { playerName: useId(), bakeryName: useId() }

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setConfirmation('')
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = renameProfile(save, values)
    if (!result.ok) {
      setErrors(result.problems)
      const first = (['playerName', 'bakeryName'] as const).find((field) => result.problems[field])
      if (first) inputs.current[first]?.focus()
      return
    }
    setErrors({})
    const { name, bakeryName } = result.save.profile
    setValues({ playerName: name, bakeryName })
    if (!result.changed) {
      setConfirmation('Those are already your names.')
      return
    }
    updateSave((current) => {
      const renamed = renameProfile(current, values)
      return renamed.ok ? renamed.save : current
    })
    const kitchenChanged = bakeryName !== save.profile.bakeryName
    setConfirmation(kitchenChanged ? `Saved. The sign over the door now says ${bakeryName}.` : `Saved. The kitchen will call you ${name}.`)
  }

  return (
    <form className="names-form" onSubmit={handleSubmit} noValidate aria-label="Names">
      {(['playerName', 'bakeryName'] as const).map((field) => {
        const id = ids[field]
        const errorId = `${id}-error`
        const problem = errors[field]
        return (
          <div className="names-form__field" key={field}>
            <label className="names-form__label" htmlFor={id}>
              {LABELS[field]}
            </label>
            <input
              ref={(element) => {
                inputs.current[field] = element
              }}
              id={id}
              name={field}
              className="line-input names-form__input"
              type="text"
              autoComplete={field === 'playerName' ? 'nickname' : 'off'}
              autoCapitalize="words"
              spellCheck={false}
              maxLength={NAME_MAX_LENGTH + 8}
              value={values[field]}
              onChange={(event) => update(field, event.target.value)}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? errorId : undefined}
            />
            {problem && (
              <p className="names-form__error" id={errorId}>
                {NAME_MESSAGES[field][problem]}
              </p>
            )}
          </div>
        )
      })}
      <div className="names-form__actions">
        <Button type="submit">Save names</Button>
        <p className="names-form__confirmation" role="status">
          {confirmation}
        </p>
      </div>
    </form>
  )
}
