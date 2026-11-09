// @vitest-environment node
// The invite page sits outside the shell, so its stylesheet keeps the sign-in frame's gutters itself.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./screens/Invite.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const tsx = readFileSync(new URL('./screens/Invite.tsx', import.meta.url), 'utf8')

test("FR-STAFF-04 the invite page keeps clear of the screen's edges and a sideways phone's notch, as the sign-in page does", () => {
  const ground = /\.ground\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(ground).toContain('padding: var(--space-8) var(--space-4);')
  expect(ground).toContain('max(var(--space-4), env(safe-area-inset-left, 0px))')
  expect(ground).toContain('max(var(--space-4), env(safe-area-inset-right, 0px))')
  expect(ground.lastIndexOf('padding-inline:')).toBeGreaterThan(ground.lastIndexOf('padding:'))
  expect(tsx).toContain('<MeshBackground className={styles.ground}>')
  expect(tsx).toContain('<main className={styles.main}>')
})

test('the bad-link title is display type, as every other page title is (PageTitle: 32 px, Inter 700)', () => {
  const title = /\n\.title\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
  expect(title).toContain('font-size: var(--text-32);')
  expect(title).toContain('font-weight: var(--weight-display);')
  expect(title).toContain('line-height: var(--leading-display);')
})

test('FR-SHELL-01 below 48rem the bad-link title is the 34 px large title, as PageTitle is', () => {
  const start = css.indexOf('@media (width < 48rem)')
  expect(start).toBeGreaterThan(-1)
  expect(css.slice(start)).toMatch(/\.title\s*\{[^}]*font-size: var\(--text-34\);/)
})
