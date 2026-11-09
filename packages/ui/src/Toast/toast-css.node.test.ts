// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { border } from '../tokens.ts'

const css = readFileSync(new URL('./Toast.module.css', import.meta.url), 'utf8')
const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''

test('the attention band is a strip inside the thin edge, clipped by the radius, at the band width', () => {
  expect(border.band).toBe('4px')
  const attention = rule(".toast[data-tone='attention']")
  // The edge stays thin, so the radius curves the same as every other toast's; only its colour changes.
  expect(attention).toContain('border-inline-start-color: var(--color-attention);')
  expect(attention).not.toMatch(/border-inline-start:/)
  expect(attention).toContain('overflow: hidden;')
  const strip = rule(".toast[data-tone='attention']::before")
  expect(strip).toContain('inline-size: var(--border-band);')
  expect(strip).toContain('inset-block: 0;')
  expect(strip).toContain('inset-inline-start: 0;')
  expect(strip).toContain('background-color: var(--color-attention);')
})

const sheetOpen = ":root:has([data-presentation='sheet'][data-state='open'])"

test('FR-SHELL-01 while a sheet is open the stack moves to the top edge, clear of the safe area, newest on top', () => {
  const top = rule(`${sheetOpen} .stack`)
  expect(top).toContain('inset-block: calc(var(--space-4) + env(safe-area-inset-top, 0)) auto;')
  // The newest toast is last in the list, so the reversed column puts it at the top edge.
  expect(top).toContain('flex-direction: column-reverse;')
})

test('NFR-USE-04 at the top edge a toast enters from above over base, and only when motion is welcome', () => {
  const [before, motion = ''] = css.split('@media (prefers-reduced-motion: no-preference) {')
  expect(before).not.toContain('animation:')
  const entering = motion.split(`\n  ${sheetOpen} .toast[data-state='open'] {\n`)[1]?.split('}')[0] ?? ''
  expect(entering).toContain('animation: toast-in-top var(--motion-base) var(--ease-emphasised);')
  expect(css).toMatch(
    /@keyframes toast-in-top \{\n {2}from \{\n {4}opacity: 0;\n {4}transform: translateY\(calc\(-1 \* var\(--space-4\)\)\);/,
  )
})

test('NFR-USE-04 the toasts making room slide on translate over base, only when motion is welcome, and never scale', () => {
  const [before, motion = ''] = css.split('@media (prefers-reduced-motion: no-preference) {')
  expect(before).not.toContain('transition')
  const sliding = motion.split('\n  .toast {\n')[1]?.split('}')[0] ?? ''
  expect(sliding).toContain('transition: translate var(--motion-base) var(--ease-emphasised);')
  // No stacked cards: nothing scales.
  expect(css).not.toMatch(/scale/)
})
