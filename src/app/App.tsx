import { useEffect, useState, type ComponentType } from 'react'
import { HomeKitchenScreen } from '../screens/HomeKitchenScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { BakeScreen, PantryScreen, RecipeBookScreen } from '../screens/PlaceholderScreens'
import { IncompatibleSaveScreen, LoadingScreen, StorageUnavailableScreen } from '../screens/SaveTroubleScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { AppShell } from './AppShell'
import { useGame } from './gameContext'
import { useRoute, type RouteId } from './routes'

const SCREENS: Record<RouteId, ComponentType> = {
  kitchen: HomeKitchenScreen,
  bake: BakeScreen,
  'recipe-book': RecipeBookScreen,
  pantry: PantryScreen,
  settings: SettingsScreen,
}

export function App() {
  const { state } = useGame()
  const route = useRoute()
  const motion = state.status === 'ready' ? state.save.settings.motion : 'system'
  // Once setup finishes, the kitchen takes focus like any other newly opened screen.
  const [sawSetup, setSawSetup] = useState(false)
  if (state.status === 'first-run' && !sawSetup) setSawSetup(true)

  // The motion preference is applied as a root attribute that the design tokens read.
  useEffect(() => {
    document.documentElement.dataset.motion = motion
  }, [motion])

  switch (state.status) {
    case 'loading':
      return <LoadingScreen />
    case 'first-run':
      return <OnboardingScreen />
    case 'incompatible':
      return <IncompatibleSaveScreen problem={state.problem} />
    case 'unavailable':
      return <StorageUnavailableScreen message={state.message} />
    case 'ready': {
      const Screen = SCREENS[route]
      return (
        <AppShell route={route} focusOnMount={sawSetup}>
          <Screen />
        </AppShell>
      )
    }
  }
}
