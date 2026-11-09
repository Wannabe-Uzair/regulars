// @vitest-environment node
// Today's look in its stylesheet (the 7 Nov harmony fixes, then the redesign): no red band, the list rows and the breakpoints.
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('./Today.module.css', import.meta.url), 'utf8')

/** The declarations of a rule, matched at the start of a line (indented inside a media query). */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\n *${escaped} \\{\\n([^}]*)\\}`).exec(css)?.[1] ?? ''
}

describe("Today's stylesheet", () => {
  test("FR-TODAY-02 no red band: no attention colour in Today's CSS (ARCHITECTURE §9: red is the Slipping count, marks, words and edges)", () => {
    expect(css).not.toContain('hazard')
    expect(css).not.toContain('--color-attention')
    expect(css).not.toContain('4px')
  })

  test('F28 the KPIs go two by two below 48rem, a breakpoint in rem, so a larger text size moves it with the shell', () => {
    expect(css).toContain('@media (width < 48rem) {')
    expect(css).not.toMatch(/@media[^{]*px/)
  })

  test("F32 a list row's name takes the interface weight, so the panel's heading outranks it", () => {
    expect(rule('.name')).toContain('font-weight: var(--weight-interface);')
  })

  test("FR-TODAY-02 Show All's words line up with the rows' names: the plain button is pulled back by its inline padding (Button sm: --space-3)", () => {
    expect(rule('.showAll')).toContain('margin-inline-start: calc(-1 * var(--space-3));')
  })
})
