// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = `\n${readFileSync(new URL('./RollingNumber.module.css', import.meta.url), 'utf8')}`
const base = readFileSync(new URL('../base.css', import.meta.url), 'utf8')
const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''
const reduced = base.split('@media (prefers-reduced-motion: reduce) {')[1] ?? ''

test('a digit rolls to its value on the smooth spring, when it changes and from 0 when it first shows', () => {
  const column = rule('.digit::after')
  expect(column).toContain('transform: translateY(calc(var(--digit) * -10%));')
  expect(column).toContain('transition: transform var(--motion-spring) var(--ease-spring);')
  expect(column).toContain('animation: roll-in var(--motion-spring) var(--ease-spring) backwards;')
  expect(css).toMatch(/@keyframes roll-in \{\n {2}from \{\n {4}transform: translateY\(0\);\n {2}\}\n\}/)
})

test('NFR-USE-04 under Reduce Motion the value appears at once: the roll takes only the spring, which base.css zeroes', () => {
  // No other duration anywhere in the module, and no reduced-motion block of its own: base.css stills it.
  expect(css.match(/var\(--motion-[\w-]+\)/g)).toEqual(['var(--motion-spring)', 'var(--motion-spring)'])
  expect(css).not.toContain('prefers-reduced-motion')
  expect(reduced).toContain('--motion-spring: 0ms;')
})

test('the figures are tabular and never break, so nothing jumps while they roll', () => {
  expect(rule('.rolling')).toContain('font-variant-numeric: var(--font-numeric);')
  expect(rule('.figure')).toContain('white-space: nowrap;')
  // The window clips with clip-path, which keeps the inline-block on the text's baseline (overflow would not).
  expect(rule('.digit')).toContain('clip-path: inset(0);')
  expect(rule('.digit')).not.toContain('overflow')
})
