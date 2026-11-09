// @vitest-environment node
// Members' look in its stylesheet: the list's names (F32) and the phone's inset grouped list (B2-12).
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./members.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations of a rule, matched at the start of a line. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\n *${escaped} \\{\\n([^}]*)\\}`).exec(css)?.[1] ?? ''
}

test("F32 a member row's name takes the interface weight, as Today's list rows do, so the page's heading outranks it", () => {
  expect(rule('.rowName')).toContain('font-weight: var(--weight-interface);')
  expect(rule('.rowName')).not.toContain('--weight-heading')
})

test("B2-12 on a phone the rows reach the card's sides, with hairlines inset to the text between them and no box of their own", () => {
  expect(rule('.rows')).toContain('margin: calc(-1 * var(--space-3)) calc(-1 * var(--space-6));')
  expect(rule('.row')).toContain('padding: 0 var(--space-6) var(--space-3);')
  expect(rule('.row')).not.toMatch(/border|box-shadow|border-radius/)
  const separator = rule('.row + .row::before')
  expect(separator).toContain('inset-inline: var(--space-6) 0;')
  expect(separator).toContain('border-block-start: var(--border-hairline) solid var(--color-line);')
})
