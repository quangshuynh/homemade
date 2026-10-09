// @vitest-environment node
// Type-checked with tsconfig.node.json (it reads files from disk).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Layout rules that are easy to break without noticing on a desktop screen.
 * These read the stylesheets directly: they check a contract between rules
 * (anything pinned to the bottom clears the phone tab bar), not pixels.
 */
const SRC = join(import.meta.dirname, '..')

function stylesheets(): { file: string; css: string }[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.css'))
    .map((file) => ({ file, css: readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }))
}

/** Innermost `selector { declarations }` blocks. Good enough for this codebase's plain CSS. */
function rules(css: string): { selector: string; body: string }[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({ selector: match[1]!.trim(), body: match[2]! }))
}

const declaration = (body: string, property: string) => body.match(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+)`))?.[1]?.trim()

describe('phone layout contract', () => {
  it('defines how much of the screen the tab bar covers, including the home indicator', () => {
    const tokens = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8')
    expect(tokens).toMatch(/--safe-bottom:\s*env\(safe-area-inset-bottom/)
    expect(tokens).toMatch(/--nav-clearance:\s*calc\(var\(--nav-height\) \+ var\(--safe-bottom\)\)/)
  })

  it('keeps anything pinned to the bottom of the screen clear of the tab bar', () => {
    const pinned = stylesheets().flatMap(({ file, css }) =>
      rules(css)
        .filter(({ body }) => /position:\s*(fixed|sticky)/.test(body) && declaration(body, 'bottom'))
        .map(({ selector, body }) => ({ where: `${file} ${selector}`, bottom: declaration(body, 'bottom')! })),
    )
    expect(pinned.length).toBeGreaterThan(0)
    for (const { where, bottom } of pinned) expect(bottom, where).toContain('var(--nav-clearance)')
  })

  it('reserves room at the end of every screen so long pages scroll fully above the tab bar', () => {
    const shell = rules(readFileSync(join(SRC, 'app/AppShell.css'), 'utf8'))
    const paddings = shell.filter(({ selector }) => selector === '.shell__screen').map(({ body }) => declaration(body, 'padding-bottom') ?? declaration(body, 'padding'))
    expect(paddings.filter(Boolean).length).toBeGreaterThan(0)
    for (const padding of paddings.filter(Boolean)) expect(padding).toContain('var(--nav-clearance)')
  })

  it('stops focused and scrolled-to elements clear of the tab bar', () => {
    const html = rules(readFileSync(join(SRC, 'styles/base.css'), 'utf8')).find(({ selector }) => selector === 'html')
    expect(declaration(html!.body, 'scroll-padding-bottom')).toContain('var(--nav-clearance)')
  })

  it('pads the fixed tab bar itself for the home indicator and landscape notches', () => {
    const tabs = readFileSync(join(SRC, 'components/RecipeTabs.css'), 'utf8')
    const list = rules(tabs).find(({ selector, body }) => selector === '.recipe-tabs__list' && body.includes('--safe-bottom'))
    expect(list?.body).toMatch(/var\(--safe-left\)/)
    expect(list?.body).toMatch(/var\(--safe-right\)/)
  })

  it('never sizes anything with the old 100vh, which ignores mobile browser chrome', () => {
    for (const { file, css } of stylesheets()) expect(css, file).not.toMatch(/100vh/)
  })
})

describe('reduced motion contract', () => {
  const read = (file: string) => readFileSync(join(SRC, file), 'utf8')

  it('zeroes the reveal beat scale wherever durations are zeroed', () => {
    const tokens = read('styles/tokens.css')
    expect(tokens).toMatch(/--motion-scale:\s*1;/)
    expect(tokens.match(/--motion-scale:\s*0;/g)).toHaveLength(2)
  })

  it('stages the discovery reveal only through beats that reduced motion collapses', () => {
    const bake = read('screens/BakeScreen.css')
    expect(bake).toMatch(/--beat:\s*calc\(var\(--reveal-beat, \d+ms\) \* var\(--motion-scale\)\)/)
    const staged = rules(bake.replace(/\/\*[\s\S]*?\*\//g, '')).filter(({ selector }) => selector.includes('.bake-result'))
    for (const { selector, body } of staged) {
      const delay = declaration(body, 'animation-delay')
      // Either a reveal beat or a duration token: both are zero when motion is reduced.
      if (delay) expect(delay, selector).toMatch(/var\(--(reveal-at-\d|duration-(quick|base|slow))\)/)
    }
  })

  it('stops every mascot animation, and the reveal’s sparkles, when motion is reduced', () => {
    const mascot = read('components/Mascot.css')
    expect(mascot).toMatch(/:root\[data-motion='reduced'\] \.mascot \*/)
    expect(mascot).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*:root:not\(\[data-motion='full'\]\) \.mascot \*/)
    expect(read('screens/BakeScreen.css')).toMatch(/:root\[data-motion='reduced'\] \.bake-result__sparkles \{\s*display: none/)
  })
})

describe('Recipe Book families on small screens', () => {
  const book = rules(readFileSync(join(SRC, 'screens/RecipeBookScreen.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))
  const rule = (selector: string) => book.find((entry) => entry.selector === selector)?.body ?? ''

  it('wraps the family dividers onto more rows instead of running off the side of a phone', () => {
    expect(declaration(rule('.recipe-book__dividers'), 'flex-wrap')).toBe('wrap')
    expect(rule('.recipe-book__dividers')).not.toMatch(/overflow-x|white-space:\s*nowrap/)
  })

  it('keeps every divider a full-size touch target', () => {
    expect(declaration(rule('.book-divider'), 'min-height')).toBe('var(--tap-target)')
  })

  it('lets long recipe names break rather than push the card wider', () => {
    expect(declaration(rule('.book-card__name'), 'overflow-wrap')).toBe('anywhere')
  })
})

describe('secret and Mythic reveals under reduced motion', () => {
  const bake = rules(readFileSync(join(SRC, 'screens/BakeScreen.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))

  it('shifts a secret’s beats only in multiples of the beat, so reduced motion still makes them all zero', () => {
    const secret = bake.find(({ selector }) => selector === '.bake-result--secret')!.body
    const beats = [...secret.matchAll(/--reveal-at-\d:\s*([^;]+);/g)].map((match) => match[1]!.trim())
    expect(beats.length).toBeGreaterThan(0)
    for (const beat of beats) expect(beat).toMatch(/^calc\(var\(--beat\) \* \d\)$/)
  })

  it('gives the Mythic paper and gold, never a glow, a shake or anything that flashes', () => {
    const mythic = bake.filter(({ selector }) => selector.includes('mythic')).map(({ body }) => body).join('\n')
    expect(mythic).not.toMatch(/animation:[^;]*infinite|shake|blink|filter:|text-shadow/)
  })
})

describe('the story under reduced motion', () => {
  const read = (file: string) => readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const story = ['story/Story.css', 'screens/NotesScreen.css']

  it('moves only through duration tokens, which reduced motion zeroes: no slide, flutter or bounce of its own', () => {
    for (const file of story) {
      for (const { selector, body } of rules(read(file))) {
        for (const property of ['animation', 'animation-duration', 'transition', 'transition-duration']) {
          const value = declaration(body, property)
          if (value && value !== 'none') expect(value, `${file} ${selector}`).toMatch(/var\(--duration-(quick|base|slow)\)/)
        }
        expect(body, `${file} ${selector}`).not.toMatch(/animation-delay|infinite/)
      }
    }
  })

  it('plays scenes on the tutorial’s card, whose only motion is a duration token', () => {
    const guide = rules(read('tutorial/TutorialGuide.css')).find(({ selector }) => selector === '.guide')!
    expect(declaration(guide.body, 'animation')).toMatch(/var\(--duration-slow\)/)
  })

  it('keeps the Recipe Box Notes links full-size touch targets', () => {
    expect(declaration(rules(read('screens/NotesScreen.css')).find(({ selector }) => selector === '.notes__back')!.body, 'min-height')).toBe('var(--tap-target)')
    expect(declaration(rules(read('screens/RecipeBookScreen.css')).find(({ selector }) => selector === '.recipe-book__notes')!.body, 'min-height')).toBe('var(--tap-target)')
  })
})

describe('the kitchen picture and decorating (Interval 8)', () => {
  const read = (file: string) => readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const decorating = ['decorating/KitchenScene.css', 'decorating/DecorNews.css', 'screens/DecorateScreen.css']
  const rule = (file: string, selector: string) => rules(read(file)).find((entry) => entry.selector === selector)?.body ?? ''

  it('takes every z-index in the app from the layer tokens, so stacking is decided in one place', () => {
    for (const { file, css } of stylesheets()) {
      for (const { selector, body } of rules(css)) {
        const z = declaration(body, 'z-index')
        if (z) expect(z, `${file} ${selector}`).toMatch(/^var\(--layer-[a-z-]+\)$/)
      }
    }
  })

  it('layers the kitchen back to front: wall, its decorations, fixtures, the counter, its objects, the front, edit mode, then the page', () => {
    const tokens = readFileSync(join(SRC, 'styles/tokens.css'), 'utf8')
    const order = ['wall', 'wall-decor', 'fixtures', 'fixture-decor', 'counter-back', 'counter-decor', 'objects', 'front', 'edit'].map((name) =>
      Number(tokens.match(new RegExp(`--layer-scene-${name}:\\s*(\\d+)`))?.[1]),
    )
    expect(order.every((value) => Number.isFinite(value))).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(new Set(order).size).toBe(order.length)
    const nav = Number(tokens.match(/--layer-nav:\s*(\d+)/)?.[1])
    expect(Math.max(...order)).toBeLessThan(nav)
  })

  it('moves only through duration tokens, which reduced motion zeroes: no bounce or slide-in of its own', () => {
    for (const file of decorating) {
      for (const { selector, body } of rules(read(file))) {
        for (const property of ['animation', 'animation-duration', 'transition', 'transition-duration']) {
          const value = declaration(body, property)
          if (value && value !== 'none') expect(value, `${file} ${selector}`).toMatch(/var\(--duration-(quick|base|slow)\)/)
        }
        expect(body, `${file} ${selector}`).not.toMatch(/animation-delay|infinite/)
      }
    }
    // Something new in a spot only fades in: nothing moves, so there's nothing to bounce.
    const settle = read('decorating/KitchenScene.css').match(/@keyframes decor-settle\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
    expect(settle).not.toMatch(/transform|translate|scale/)
  })

  it('keeps every spot, piece and way in a full-size touch target', () => {
    expect(declaration(rule('decorating/KitchenScene.css', '.scene-spot__button'), 'min-height')).toBe('var(--tap-target)')
    expect(declaration(rule('decorating/KitchenScene.css', '.scene-spot__button'), 'min-width')).toBe('var(--tap-target)')
    expect(declaration(rule('decorating/KitchenScene.css', '.kitchen-cupboard__tag'), 'min-height')).toBe('var(--tap-target)')
    expect(declaration(rule('screens/DecorateScreen.css', '.cupboard-piece'), 'min-height')).toBe('var(--tap-target)')
    expect(declaration(rule('decorating/DecorNews.css', '.decor-news a'), 'min-height')).toBe('var(--tap-target)')
  })

  it('wraps the cupboard’s pieces onto more rows rather than scrolling sideways on a phone', () => {
    const shelf = rule('screens/DecorateScreen.css', '.cupboard-shelf')
    expect(declaration(shelf, 'grid-template-columns')).toMatch(/auto-fill/)
    expect(shelf).not.toMatch(/overflow-x|nowrap/)
  })
})
