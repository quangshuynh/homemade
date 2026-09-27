import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import './ConfirmDialog.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A native modal <dialog>: focus is trapped and Escape cancels for free.
 * The safe choice (cancel) gets initial focus.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      {open && (
        <div className="confirm-dialog__card">
          <h2 id={titleId} className="confirm-dialog__title">
            {title}
          </h2>
          <div id={bodyId} className="confirm-dialog__body">
            {children}
          </div>
          <div className="confirm-dialog__actions">
            <Button autoFocus onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
