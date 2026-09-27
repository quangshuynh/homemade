import type { ReactNode } from 'react'

export const SCREEN_TITLE_ID = 'screen-title'

/**
 * Each screen's single <h1>. It is programmatically focusable so the shell
 * can move focus here after navigation, announcing the new screen.
 */
export function ScreenTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 id={SCREEN_TITLE_ID} tabIndex={-1} className={className}>
      {children}
    </h1>
  )
}
