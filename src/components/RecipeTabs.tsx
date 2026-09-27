import { hrefFor, ROUTE_ORDER, ROUTES, type RouteId } from '../app/routes'
import { RouteIcon } from './icons'
import './RecipeTabs.css'

/**
 * Main navigation, drawn as the divider tabs of a recipe box. Plain links in
 * a list, so it works with the keyboard, screen readers and the back button.
 */
export function RecipeTabs({ current }: { current: RouteId }) {
  return (
    <nav className="recipe-tabs" aria-label="Kitchen">
      <ul className="recipe-tabs__list">
        {ROUTE_ORDER.map((route) => (
          <li key={route} className="recipe-tabs__item">
            <a
              className="recipe-tabs__tab"
              data-route={route}
              href={hrefFor(route)}
              aria-current={route === current ? 'page' : undefined}
            >
              <RouteIcon route={route} className="recipe-tabs__icon" />
              <span className="recipe-tabs__label">{ROUTES[route].title}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
