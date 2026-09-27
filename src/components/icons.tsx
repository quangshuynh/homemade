import type { ReactNode } from 'react'
import type { RouteId } from '../app/routes'

/** Small line icons for the recipe-box tabs: one stroke weight, drawn on a 24px grid. */

const paths: Record<RouteId, ReactNode> = {
  kitchen: (
    <>
      <path d="M4 20 V9.5 L12 4 L20 9.5 V20" />
      <path d="M9 20 V14 H15 V20" />
    </>
  ),
  bake: (
    <>
      <path d="M12 3 C8 3 7.5 9 12 13 C16.5 9 16 3 12 3 Z" />
      <path d="M12 3 V13" />
      <path d="M12 13 V21" />
    </>
  ),
  'recipe-book': (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="1" />
      <path d="M6.5 6 V3.5 H11 V6" />
      <path d="M7 11 H17 M7 14.5 H14" />
    </>
  ),
  pantry: (
    <>
      <path d="M7 8 H17 V18 A2 2 0 0 1 15 20 H9 A2 2 0 0 1 7 18 Z" />
      <path d="M6 4.5 H18 L17 8 H7 Z" />
      <path d="M7 13 H17" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4.5 V9.5" />
    </>
  ),
}

export function RouteIcon({ route, className }: { route: RouteId; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[route]}
    </svg>
  )
}
