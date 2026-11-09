// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { renderTokensCss } from '../scripts/tokens-css.ts'
import { glowStops, material, motion, themes } from './tokens.ts'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

/** tokens.css's blocks: the header, the shared tokens, the one (light) theme, then the at-rules. */
const blocksOf = (css: string) => css.split(/\n\n/)
const themeBlock = () => blocksOf(renderTokensCss())[2] ?? ''

/** The at-rule that opens with `rule`, or '' if there is none. */
const atRule = (css: string, rule: string) => blocksOf(css).find((block) => block.startsWith(`${rule} {\n`)) ?? ''

/** The glass's fallbacks (ARCHITECTURE §9, "Depth"): where blur can't run, less transparency, more contrast. */
const opaqueWhen = [
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))',
  '@media (prefers-reduced-transparency: reduce)',
  '@media (prefers-contrast: more)',
] as const

const springs = ['spring', 'spring-quick', 'spring-bounce'] as const

describe('tokens.css', () => {
  test('is current with tokens.ts (run `npm run generate` in packages/ui)', () => {
    expect(read('./tokens.css'), 'src/tokens.css is stale').toBe(renderTokensCss())
  })

  test('FR-SHELL-07 pins the light tokens on :root, with color-scheme only light, and no rule follows prefers-color-scheme', () => {
    const css = renderTokensCss()
    expect(themeBlock()).toMatch(/^:root \{\n {2}color-scheme: only light;\n/)
    expect(css).not.toContain('data-theme')
    expect(css).not.toContain('prefers-color-scheme')
    // The light theme is the only one emitted: the dark column stays in tokens.ts, unused, until after the stall.
    expect(css.match(/color-scheme:/g)).toHaveLength(1)
    expect(css).not.toContain(themes.dark.color.bg.toLowerCase())
  })

  test('declares every colour role in the one theme block', () => {
    const dark = Object.keys(themes.dark.color)
    expect(Object.keys(themes.light.color)).toEqual(dark)
    for (const role of dark) expect(themeBlock()).toContain(`--color-${role}:`)
  })

  test('FR-KIOSK-07 sets the kiosk blend once, to none on the plain light ground', () => {
    const blends = [...renderTokensCss().matchAll(/--blend-kiosk:([^;]+);/g)].map((m) => m[1]?.trim())
    expect(blends).toEqual(['none'])
    expect(themes.light.blend.kiosk.map((g) => glowStops(g.colour))).toEqual([])
  })

  test('FR-KIOSK-07 sets the mesh grain once, to none on the plain light ground', () => {
    expect([...renderTokensCss().matchAll(/--opacity-grain: ([^;]+);/g)].map((m) => m[1])).toEqual(['0'])
  })

  test('NFR-USE-01 titles of 32 px and up take 700, and the home page has its display sizes of 48 and 96 px', () => {
    const css = renderTokensCss()
    expect(css).toContain('--weight-display: 700;')
    expect(css).toContain('--text-48: 3rem;')
    expect(css).toContain('--text-96: 6rem;')
  })

  test('the four shadow roles are neutral black, deeper at each step, and raised is a retired alias of flyout', () => {
    const block = themeBlock()
    expect(block).toContain('--shadow-lift: 0 0 2px rgb(0 0 0 / 0.06), 0 4px 8px rgb(0 0 0 / 0.07);')
    expect(block).toContain('--shadow-flyout: 0 0 2px rgb(0 0 0 / 0.08), 0 8px 16px rgb(0 0 0 / 0.12);')
    expect(block).toContain('--shadow-float: 0 0 8px rgb(0 0 0 / 0.08), 0 14px 28px rgb(0 0 0 / 0.14);')
    expect(block).toContain('--shadow-modal: 0 0 8px rgb(0 0 0 / 0.1), 0 32px 64px rgb(0 0 0 / 0.18);')
    expect(block).toContain('--shadow-raised: var(--shadow-flyout);')
    // No tint in a shadow: every colour in one is black.
    for (const value of Object.values(themes.light.shadow)) {
      expect(value.replace(/rgb\(0 0 0 \/ [\d.]+\)/g, '')).not.toMatch(/rgb|#|color/)
    }
  })

  test('NFR-USE-04 the springs are cubic-bezier at :root and linear() under @supports, and reduced motion zeroes them and the press scale', () => {
    const css = renderTokensCss()
    const shared = blocksOf(css)[1] ?? ''
    const sampled = atRule(css, '@supports (transition-timing-function: linear(0, 1))')
    expect(shared).toContain('--motion-spring: 740ms;')
    expect(shared).toContain('--motion-spring-quick: 450ms;')
    expect(shared).toContain('--motion-spring-bounce: 820ms;')
    expect(shared).toContain('--motion-linger: 1600ms;')
    expect(shared).toContain('--scale-press: 0.97;')
    for (const name of springs) {
      expect(motion.easing[name]).toMatch(/^cubic-bezier\(/)
      expect(shared).toContain(`--ease-${name}: ${motion.easing[name]};`)
      expect(sampled.replace(/\(\s+/g, '(').replace(/,\s+/g, ', ').replace(/\s+\)/g, ')')).toContain(
        `--ease-${name}: ${motion.linear[name]};`,
      )
    }
    // The sampled curves start at 0 and end at 1; only the bouncy one goes past 1, by its 4.6%.
    const peak = (name: (typeof springs)[number]) => {
      const points = motion.linear[name].replace(/^linear\(|\)$/g, '').split(', ')
      expect([points[0], points.at(-1)]).toEqual(['0', '1'])
      return Math.max(...points.map((point) => Number(point.split(' ')[0])))
    }
    expect(springs.map(peak)).toEqual([1, 1, 1.046])
    const reduced = read('./base.css').split('@media (prefers-reduced-motion: reduce)')[1] ?? ''
    expect(reduced).toContain('--scale-press: 1;')
  })

  test("NFR-USE-06 each bar's material is translucent, and opaque with no filter under @supports not, reduced transparency and more contrast", () => {
    const css = renderTokensCss()
    expect(themeBlock()).toContain('--color-material-bar: color-mix(in oklab, var(--color-surface) 86%, transparent);')
    expect(themeBlock()).toContain('--color-material-tabs: color-mix(in oklab, var(--color-surface) 94%, transparent);')
    expect(blocksOf(css)[1]).toContain('--material-bar-filter: saturate(180%) blur(20px);')
    expect(blocksOf(css)[1]).toContain('--material-tabs-filter: saturate(180%) blur(30px);')
    for (const rule of opaqueWhen) {
      const block = atRule(css, rule)
      expect(block, rule).toContain('--color-material-bar: var(--color-surface);')
      expect(block, rule).toContain('--color-material-tabs: var(--color-surface);')
      for (const name of Object.keys(material)) expect(block, rule).toContain(`--material-${name}: none;`)
    }
  })

  test('NFR-USE-06 the focus ring is 3 px under more contrast, and the system highlight in forced colours', () => {
    const css = renderTokensCss()
    expect(blocksOf(css)[1]).toContain('--focus-width: 2px;')
    expect(atRule(css, '@media (prefers-contrast: more)')).toContain('--focus-width: 3px;')
    const forced = read('./base.css').split('@media (forced-colors: active) {')[1] ?? ''
    expect(forced).toContain('\n  :focus-visible {\n    outline-color: Highlight;\n  }')
    expect(forced).toContain('\n  ::selection {\n    background-color: Highlight;\n    color: HighlightText;\n  }')
  })

  test('NFR-USE-01 the separator hairline is 0.5 px on 2x screens and 1 px elsewhere', () => {
    const css = renderTokensCss()
    expect(blocksOf(css)[1]).toContain('--border-hairline: 1px;')
    expect(atRule(css, '@media (min-resolution: 2dppx)')).toBe(
      '@media (min-resolution: 2dppx) {\n  :root {\n    --border-hairline: 0.5px;\n  }\n}',
    )
  })

  test('NFR-USE-03 a round kiosk key is 76 px at most', () => {
    expect(renderTokensCss()).toContain('--size-kiosk-key: 4.75rem;')
  })

  test('FR-KIOSK-07 the kiosk number size is 8rem at most, shrinking with the container to keep the number on one line', () => {
    expect(renderTokensCss()).toContain('--text-kiosk: min(8rem, calc((100cqi - 2 * var(--space-8)) / 7.7));')
  })

  test('FR-SHELL-01 stacks a sticky column at 1 and the navigation at 30, under dialogs, and toasts clear nothing by default', () => {
    const css = renderTokensCss()
    expect(css).toContain('--layer-sticky: 1;')
    expect(css).toContain('--layer-nav: 30;')
    expect(css).toContain('--layer-dialog: 40;')
    expect(css).toContain('--toast-clearance: 0px;')
  })
})

describe('base.css', () => {
  test("takes away the browser's body margin, so the page ground and the app header reach the window's edges", () => {
    expect(read('./base.css')).toMatch(/\nbody \{\n {2}margin: 0;\n\}/)
  })

  test("NFR-USE-01 gives a link with no class the theme's link colour and underline, at no specificity", () => {
    expect(read('./base.css')).toMatch(
      /\n:where\(a:any-link\) \{\n {2}color: var\(--color-link\);\n {2}text-decoration: var\(--link-decoration\);\n\}/,
    )
  })

  test("shows a marked page title's focus as a bar in the focus colour after a key only, never the ring", () => {
    const css = read('./base.css')
    const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''
    const title = rule('[data-route-focus]:focus-visible')
    expect(title).toContain('outline: none;')
    // The bar is drawn only for a navigation that came from a key: a tap or click marks the title `pointer`.
    expect(css).not.toContain('[data-route-focus]:focus-visible::before')
    const bar = rule("[data-route-focus='keyboard']:focus-visible::before")
    expect(bar).toContain("content: '';")
    expect(bar).toContain('position: absolute;')
    expect(bar).toContain('background-color: var(--color-focus);')
    // In forced colours the bar takes the system highlight rather than vanishing into the page.
    const forced = css.split('@media (forced-colors: active) {')[1] ?? ''
    expect(forced).toContain("[data-route-focus='keyboard']:focus-visible::before {")
    expect(forced).toContain('background-color: Highlight;')
    // Every other focusable element keeps the ring.
    expect(rule(':focus-visible')).toContain('outline: var(--focus-width) solid var(--color-focus);')
  })

  test('touch hygiene: no tap flash or text resizing on :root, and no double-tap delay on links and form controls', () => {
    const css = read('./base.css')
    const root = css.split('\n:root {\n')[1]?.split('}')[0] ?? ''
    expect(root).toContain('-webkit-text-size-adjust: 100%;')
    expect(root).toContain('-webkit-tap-highlight-color: transparent;')
    expect(css).toContain(
      ':where(a, button, input, select, textarea, label, summary) {\n  touch-action: manipulation;\n}',
    )
  })

  test('zeroes every motion duration under reduced motion', () => {
    const reduced = read('./base.css').split('@media (prefers-reduced-motion: reduce)')[1] ?? ''
    for (const name of Object.keys(motion.duration)) expect(reduced).toContain(`--motion-${name}: 0ms;`)
  })

  test('NFR-USE-04 keeps the busy delay under reduced motion: it is a wait, not a move (pick F2)', () => {
    expect(renderTokensCss()).toContain('--delay-busy: 400ms;')
    const reduced = read('./base.css').split('@media (prefers-reduced-motion: reduce)')[1] ?? ''
    expect(reduced).not.toContain('--delay-')
  })
})
