// @vitest-environment node
// The sign-in frame's stylesheet: the card's edge on the blend (F40) and the breakpoints in rem (F28).
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./AuthPage.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

test('F28 every breakpoint is written in rem, so a larger text size moves the page with it', () => {
  const queries = [...css.matchAll(/@media[^{]*/g)].map(([query]) => query)
  expect(queries.length).toBeGreaterThan(0)
  for (const query of queries) expect(query).not.toMatch(/\d+px/)
})

test('F40 the card’s edge is the separator hairline; its inputs keep line-strong on the card', () => {
  expect(css).toMatch(/\.main \.card\s*\{[^}]*border-color: var\(--color-line\);/)
  expect(css).not.toMatch(/--color-line(-strong)?:/)
})

test("F26 the sign-in frame keeps clear of a sideways phone's notch, as the shell's columns do", () => {
  const ground = /\n\.ground\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(ground).toContain('max(var(--space-4), env(safe-area-inset-left, 0px))')
  expect(ground).toContain('max(var(--space-4), env(safe-area-inset-right, 0px))')
  // The inline padding comes after the shorthand, so the shorthand doesn't undo it.
  expect(ground.lastIndexOf('padding-inline:')).toBeGreaterThan(ground.lastIndexOf('padding:'))
})

test('B2-10 the card hangs from a fixed top edge, so an error line grows it downwards instead of moving it up', () => {
  const ground = /\n\.ground\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(ground).toContain('align-content: start;')
  expect(ground).not.toMatch(/align-content: (center|end)|place-content/)
  // The top edge depends on the viewport alone (svh does not follow Safari's sliding toolbar), never on the card's height.
  expect(ground).toContain('padding-block-start: max(var(--space-8), 18svh);')
  expect(ground.lastIndexOf('padding-block-start:')).toBeGreaterThan(ground.lastIndexOf('padding:'))
  // Set Up's long form starts at the top margin, so Start the Pilot stays on a 1280 x 800 screen.
  expect(css).toMatch(/\.ground\.long\s*\{\s*padding-block-start: var\(--space-8\);\s*\}/)
})

test('the page title is display type, as every other page title is (PageTitle: 32 px, Inter 700)', () => {
  const title = /\n\.title\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(title).toContain('font-size: var(--text-32);')
  expect(title).toContain('font-weight: var(--weight-display);')
  expect(title).toContain('line-height: var(--leading-display);')
})

test('FR-SHELL-01 below 48rem the page title is the 34 px large title, as PageTitle is', () => {
  const start = css.indexOf('@media (width < 48rem)')
  expect(start).toBeGreaterThan(-1)
  expect(css.slice(start)).toMatch(/\.title\s*\{[^}]*font-size: var\(--text-34\);/)
})
