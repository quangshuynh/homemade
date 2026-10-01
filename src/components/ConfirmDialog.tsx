import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { Button } from './Button'
import './ConfirmDialog.css'

type ConfirmDialogProps = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  busy?: boolean
  /** Danger for things that clear or replace; primary for a happy yes (adding an ingredient). */
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  /**
   * Where focus goes back to when the dialog closes. Defaults to whatever had
   * focus when it opened; pass this when that might not be a real control
   * (after a file picker, say, or on browsers that don't focus clicked buttons).
   */
  returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * A native modal <dialog>: focus is trapped and Escape cancels for free.
 * The safe choice (cancel) gets initial focus, and focus goes back to where
 * it came from on close.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy,
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  returnFocusRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const openedFrom = useRef<Element | null>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      openedFrom.current = document.activeElement
      dialog.showModal?.()
      // Explicitly, because a dialog whose content scrolls (a long summary on a
      // small phone) would otherwise focus the scrolling card instead.
      cancelRef.current?.focus()
    }
    if (!open && dialog.open) {
      dialog.close?.()
      const target = returnFocusRef?.current ?? openedFrom.current
      if (target instanceof HTMLElement && target.isConnected) target.focus()
    }
  }, [open, returnFocusRef])

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
            <Button ref={cancelRef} onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
