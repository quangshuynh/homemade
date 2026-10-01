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
