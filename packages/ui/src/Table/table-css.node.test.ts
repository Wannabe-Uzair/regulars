// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./Table.module.css', import.meta.url), 'utf8')
const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''

test('FR-MEM-03 rows are divided by the one line, and numbers line up at the end in tabular figures', () => {
  expect(rule('.table tbody > tr > *')).toContain('border-block-start: var(--border-hairline) solid var(--color-line);')
  expect(rule('.table [data-numeric]')).toContain('text-align: end;')
  expect(rule('.table [data-numeric]')).toContain('font-variant-numeric: var(--font-numeric);')
})

test('FR-MEM-03 the sticky first column stacks on --layer-sticky, painted with the ground so rows slide under it', () => {
  const sticky = rule('.sticky :is(th, td):first-child')
  expect(sticky).toContain('position: sticky;')
  expect(sticky).toContain('z-index: var(--layer-sticky);')
  expect(sticky).toContain('background-color: var(--table-ground);')
})

test("NFR-USE-02 the frame has room in the inline direction for the focus ring at a row's ends, and nothing moves", () => {
  const scroll = rule('.scroll')
  expect(scroll).toContain('padding-inline: calc(var(--focus-width) + var(--focus-offset));')
  expect(scroll).toContain('margin-inline: calc(-1 * (var(--focus-width) + var(--focus-offset)));')
})
