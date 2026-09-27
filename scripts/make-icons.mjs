// Renders the PWA icons in public/icons from icon-mark.svg (the cookie "o"
// from the wordmark). The PNGs are committed, so this only needs re-running
// when the mark changes. Playwright isn't a project dependency: install it
// somewhere temporary and point CHROMIUM at a Chromium binary if needed.
//   node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const here = new URL('.', import.meta.url)
const out = new URL('../public/icons/', import.meta.url)
const mark = readFileSync(new URL('icon-mark.svg', here), 'utf8')

// Duck-egg enamel, like the mixing bowl: the golden cookie stands out on it at any size.
const ENAMEL = '#8cc2ba'
const GLOW = '#e8f2ee'

/** `any`: a rounded enamel tile. `maskable`: full bleed, mark inside the 80% safe zone. */
function icon({ maskable }) {
  const scale = maskable ? 0.56 : 0.78
  const background = maskable
    ? `<rect width="512" height="512" fill="${ENAMEL}"/>`
    : `<rect x="8" y="8" width="496" height="496" rx="112" fill="${ENAMEL}" stroke="#2b1d14" stroke-width="10"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><radialGradient id="glow" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${GLOW}" stop-opacity="0.7"/><stop offset="1" stop-color="${GLOW}" stop-opacity="0"/></radialGradient></defs>
  ${background}
  <rect x="${maskable ? 0 : 13}" y="${maskable ? 0 : 13}" width="${maskable ? 512 : 486}" height="${maskable ? 512 : 486}" rx="${maskable ? 0 : 107}" fill="url(#glow)"/>
  <g transform="translate(256 262) scale(${scale * 1.6})">${mark}</g>
</svg>`
}

const anySvg = icon({ maskable: false })
const maskableSvg = icon({ maskable: true })
writeFileSync(new URL('icon.svg', out), anySvg)

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM })
const page = await browser.newPage()
for (const [name, svg, size] of [
  ['icon-192.png', anySvg, 192],
  ['icon-512.png', anySvg, 512],
  ['icon-maskable-192.png', maskableSvg, 192],
  ['icon-maskable-512.png', maskableSvg, 512],
  ['apple-touch-icon.png', maskableSvg, 180],
  ['icon-32.png', anySvg, 32],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  writeFileSync(new URL(name, out), await page.screenshot({ omitBackground: true }))
}
await browser.close()
