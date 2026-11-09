// @vitest-environment node
// The website's look in its stylesheets: home-1's headline, bar and floating clip, the plain page's
// outlines (F40), the notch (F26) and the breakpoints in rem (F28).
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const dir = fileURLToPath(new URL('./', import.meta.url))
const sheets = readdirSync(dir, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.module.css'))
  .map((file) => ({ file, css: readFileSync(dir + file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }))
const sheet = (file: string) => sheets.find((s) => s.file === file)?.css ?? ''

/** The declarations of `selector`, outside any media query, or inside the one whose condition is `media`. */
function rule(css: string, selector: string, media?: string): string {
  const scope =
    media === undefined ? css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '') : mediaBlock(css, media)
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return [...scope.matchAll(new RegExp(`(?:^|[},])\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'g'))].map((m) => m[1]).join(';')
}

function mediaBlock(css: string, media: string): string {
  return block(css, `@media ${media}`)
}

/** The inside of the first block whose prelude is `prelude` (as `@container (min-width: 30rem)`), at any depth. */
function block(css: string, prelude: string): string {
  const start = css.indexOf(`${prelude} {`)
  if (start < 0) return ''
  let depth = 0
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) return css.slice(css.indexOf('{', start) + 1, i)
  }
  return ''
}

test('finds the website stylesheets', () => {
  expect(sheets.map((s) => s.file).sort()).toEqual([
    'screens/HeroClip.module.css',
    'screens/Home.module.css',
    'screens/Placeholder.module.css',
    'stall/StallDemo.module.css',
  ])
})

test('F28 every breakpoint is written in rem, so a larger text size moves the page with it', () => {
  for (const { file, css } of sheets) {
    for (const [query] of css.matchAll(/@(media|container)[^{]*/g)) expect(query, file).not.toMatch(/\d+px/)
  }
})

describe('home-1: the product page', () => {
  const home = sheet('screens/Home.module.css')
  const clip = sheet('screens/HeroClip.module.css')

  test('FR-WEB-01 the headline is 48 px, and 96 px from 64rem, at the display weight', () => {
    expect(rule(home, '.title')).toContain('font-size: var(--text-48)')
    expect(rule(home, '.title')).toContain('font-weight: var(--weight-display)')
    expect(rule(home, '.title')).toContain('text-wrap: balance')
    expect(rule(home, '.title', '(min-width: 64rem)')).toContain('font-size: var(--text-96)')
  })

  test('FR-WEB-01 the bar is sticky and opaque over a hairline, with no backdrop-filter on the page', () => {
    const bar = rule(home, '.bar')
    expect(bar).toContain('position: sticky')
    expect(bar).toContain('inset-block-start: 0')
    expect(bar).toContain('z-index: var(--layer-sticky)')
    expect(bar).toContain('background-color: var(--color-surface)')
    expect(bar).toContain('border-block-end: var(--border-hairline) solid var(--color-line)')
    // depth-1: no glass on this page, and no blend or picture behind it.
    for (const { file, css } of sheets) {
      expect(css, file).not.toMatch(/backdrop-filter|--color-material|gradient\(|background-image|url\(/)
    }
  })

  test('FR-WEB-01 the board’s clip floats on --shadow-float, on the large radius, the only shadow on the page', () => {
    const card = rule(clip, '.clip')
    expect(card).toContain('box-shadow: var(--shadow-float)')
    expect(card).toContain('border-radius: var(--radius-xl)')
    // Its box takes the clip's shape from its width: the height follows the aspect ratio set beside it.
    expect(card).toContain('inline-size: 100%')
    expect(card).toContain('block-size: auto')
    expect(rule(home, '.board')).toContain('max-inline-size: 56rem')
    const shadows = sheets.flatMap(({ css }) => [...css.matchAll(/box-shadow:[^;]*/g)].map(([d]) => d))
    expect(shadows).toEqual(['box-shadow: var(--shadow-float)'])
  })

  test('B2-04 the place a way in holds while the stall question is open keeps its box, unseen', () => {
    expect(rule(home, '.held')).toContain('visibility: hidden')
  })

  test('the clip is not interactive, so iOS’s start-playback glyph (Low Power Mode) is hidden', () => {
    const glyph = rule(clip, '.clip::-webkit-media-controls-start-playback-button')
    expect(glyph).toContain('display: none')
    expect(glyph).toContain('-webkit-appearance: none')
  })
})

test('F40 the page is plain, so no outline takes the blend’s line', () => {
  for (const { file, css } of sheets) expect(css, file).not.toContain('line-blend')
})

test("F26 the home page keeps clear of a sideways phone's notch at every width, as the shell's columns do", () => {
  const home = sheet('screens/Home.module.css')
  for (const [media, gutter] of [
    [undefined, 'var(--space-4)'],
    ['(min-width: 40rem)', 'var(--space-8)'],
    ['(min-width: 64rem)', 'var(--space-16)'],
  ] as const) {
    const page = rule(home, '.page', media)
    expect(page, gutter).toContain(`max(${gutter}, env(safe-area-inset-left, 0px))`)
    expect(page, gutter).toContain(`max(${gutter}, env(safe-area-inset-right, 0px))`)
    // The inline padding comes after the shorthand, so the shorthand doesn't undo it.
    expect(page.lastIndexOf('padding-inline:'), gutter).toBeGreaterThan(page.lastIndexOf('padding:'))
  }
})
