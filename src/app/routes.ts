import { useSyncExternalStore } from 'react'

/**
 * Hash-based routes: no server config needed, the back button works, and
 * every place in the kitchen has a real link. A router library would be
 * more than five screens need.
 */
export const ROUTES = {
  kitchen: { path: '/', title: 'Kitchen' },
  bake: { path: '/bake', title: 'Bake' },
  'recipe-book': { path: '/recipe-book', title: 'Recipe Book' },
  pantry: { path: '/pantry', title: 'Pantry' },
  settings: { path: '/settings', title: 'Settings' },
} as const

export type RouteId = keyof typeof ROUTES

export const ROUTE_ORDER: readonly RouteId[] = ['kitchen', 'bake', 'recipe-book', 'pantry', 'settings']

export function hrefFor(route: RouteId): string {
  return `#${ROUTES[route].path}`
}

export function routeFromHash(hash: string): RouteId {
  const path = hash.replace(/^#/, '') || '/'
  const match = ROUTE_ORDER.find((id) => ROUTES[id].path === path)
  return match ?? 'kitchen'
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): RouteId {
  return useSyncExternalStore(
    subscribe,
    () => routeFromHash(window.location.hash),
    () => 'kitchen' as const,
  )
}

export function navigate(route: RouteId): void {
  window.location.hash = ROUTES[route].path
}
