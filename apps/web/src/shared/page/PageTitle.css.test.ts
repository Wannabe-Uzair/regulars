// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./PageTitle.module.css', import.meta.url), 'utf8')

test('FR-SHELL-06 a page title is 32 px at the display leading, as tokens.ts asks of 32 px and up', () => {
  expect(css).toContain('font-size: var(--text-32);')
  expect(css).toContain('line-height: var(--leading-display);')
})

test('FR-SHELL-06 the page title takes the display weight, as display type of 32 px and up does (ARCHITECTURE §9)', () => {
  expect(css).toContain('font-weight: var(--weight-display);')
})

test('FR-SHELL-01 below 48rem the page title is the 34 px large title; from 48rem it stays 32 px', () => {
  const start = css.indexOf('@media (width < 48rem) {')
  expect(start).toBeGreaterThan(0)
  expect(css.slice(start)).toContain('font-size: var(--text-34);')
  expect(css.slice(0, start)).not.toContain('--text-34')
})
