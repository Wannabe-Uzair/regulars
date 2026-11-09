// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./Button.module.css', import.meta.url), 'utf8')
const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''

test('NFR-USE-03 FR-KIOSK-07 the lg size is the kiosk button: 64 px tall, at 21 px', () => {
  expect(rule('.lg')).toContain('min-block-size: var(--space-16);')
  expect(rule('.lg')).toContain('font-size: var(--text-21);')
})

test('NFR-USE-03 the md size keeps the 44 px touch target', () => {
  expect(rule('.md')).toContain('min-block-size: calc(var(--space-10) + var(--space-1));')
})

test('NFR-USE-03 the sm size keeps the 44 px touch target too, with its 14 px label and smaller padding', () => {
  expect(rule('.sm')).toContain('min-block-size: calc(var(--space-10) + var(--space-1));')
  expect(rule('.sm')).toContain('padding: var(--space-1) var(--space-3);')
  expect(rule('.sm')).toContain('font-size: var(--text-14);')
})

test("IconButton's sm stays the centred dialog's 32 px square, over the button's 44 px minimum", () => {
  const icon = readFileSync(new URL('../IconButton/IconButton.module.css', import.meta.url), 'utf8')
  const sm = icon.split('\n.icon.sm {\n')[1]?.split('}')[0] ?? ''
  expect(sm).toContain('min-block-size: var(--space-8);')
  expect(sm).toContain('block-size: var(--space-8);')
})
