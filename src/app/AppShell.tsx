import { useEffect, useRef, type ReactNode } from 'react'
import { useStopSoundsWhenMuted } from '../audio/soundContext'
import { RecipeTabs } from '../components/RecipeTabs'
import { SCREEN_TITLE_ID } from '../components/ScreenTitle'
import { UpdateNotice } from '../components/UpdateNotice'
import { useGame, useSave } from './gameContext'
import { hrefFor, ROUTES, type RouteId } from './routes'
import './AppShell.css'

/** The persistent frame around every in-game screen: bakery sign, tabs, and the screen itself. */
type AppShellProps = {
  route: RouteId
  /** Focus the screen heading on first render too (e.g. straight after onboarding). */
  focusOnMount?: boolean
  children: ReactNode
}

export function AppShell({ route, focusOnMount = false, children }: AppShellProps) {
  const save = useSave()
  const { saveStatus } = useGame()
  const skipFocus = useRef(!focusOnMount)
  useStopSoundsWhenMuted()

  useEffect(() => {
    document.title = `${ROUTES[route].title} · ${save.profile.bakeryName} · Homemade`
  }, [route, save.profile.bakeryName])

  // After navigating, move focus to the new screen's heading so keyboard and
  // screen reader users land in the content, not back at the top of the tabs.
  // A screen can claim focus for something more useful (Bake again focuses
  // the prepared bowl); its effects run first, so that focus is left alone.
  useEffect(() => {
    if (skipFocus.current) {
      skipFocus.current = false
      return
    }
    const screen = document.getElementById('screen')
    if (screen && screen.contains(document.activeElement) && document.activeElement !== screen) return
    document.getElementById(SCREEN_TITLE_ID)?.focus()
  }, [route])

  return (
    <div className="shell">
      <a
        className="shell__skip"
        href="#screen"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById(SCREEN_TITLE_ID)?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="shell__header">
        {/* The kitchen paints the name large itself; elsewhere it is a way home. */}
        {route !== 'kitchen' && (
          <a className="shell__sign" href={hrefFor('kitchen')} aria-label={`${save.profile.bakeryName}, back to the kitchen`}>
            {save.profile.bakeryName}
          </a>
        )}
        <RecipeTabs current={route} />
      </header>
      <main id="screen" className="shell__screen" key={route} data-route={route}>
        {children}
      </main>
      {/* Notes stuck above the tabs. Empty most of the time. */}
      <div className="shell__notes">
        {saveStatus === 'failed' && (
          <p className="shell__save-warning" role="alert">
            Couldn’t save just now. Your changes are safe in this tab, but may be lost if you close it.
          </p>
        )}
        <UpdateNotice />
      </div>
    </div>
  )
}
