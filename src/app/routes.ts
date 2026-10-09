import { useSyncExternalStore } from 'react'

/**
 * Hash-based routes: no server config needed, the back button works, and
 * every place in the kitchen has a real link. A router library would be
 * more than a handful of screens need.
 */
export const ROUTES = {
  kitchen: { path: '/', title: 'Kitchen' },
  bake: { path: '/bake', title: 'Bake' },
  'recipe-book': { path: '/recipe-book', title: 'Recipe Book' },
  pantry: { path: '/pantry', title: 'Pantry' },
  settings: { path: '/settings', title: 'Settings' },
  /** Reached from the cooling rack in the kitchen rather than a tab. */
  memories: { path: '/memories', title: 'Baking Memories' },
  /** The story's home: reached from the Recipe Book (and the kitchen's recipe box) rather than a tab. */
  notes: { path: '/recipe-book/notes', title: 'Recipe Box Notes' },
  /** Decorating: reached from the old cupboard in the kitchen once the brass key turns, rather than a tab. */
  decorate: { path: '/decorate', title: 'Make it yours' },
} as const

export type RouteId = keyof typeof ROUTES

/** The places with a recipe-box tab, in tab order. */
export const ROUTE_ORDER = ['kitchen', 'bake', 'recipe-book', 'pantry', 'settings'] as const satisfies readonly RouteId[]

export type TabRouteId = (typeof ROUTE_ORDER)[number]

const ALL_ROUTES = Object.keys(ROUTES) as RouteId[]

export function hrefFor(route: RouteId): string {
  return `#${ROUTES[route].path}`
}

export function routeFromHash(hash: string): RouteId {
  const path = hash.replace(/^#/, '') || '/'
  const match = ALL_ROUTES.find((id) => ROUTES[id].path === path)
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
