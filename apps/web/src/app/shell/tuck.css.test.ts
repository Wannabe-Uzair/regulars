// @vitest-environment node
// The large title tucking into the phone's bar is CSS reading `data-tucked` (tuck.ts): these pin where and how it moves.
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('./AppShell.module.css', import.meta.url), 'utf8')
const base = css.replace(/\n@media [^{]*\{\n[\s\S]*?\n\}\n/g, '\n')
const media = (query: string) => {
  const start = css.indexOf(`@media ${query} {`)
  expect(start, query).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('\n}\n', start))
}
const phone = media('(width < 48rem)')
const rule = (sheet: string, selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\n *${escaped} \\{\\n([^}]*)\\}`).exec(sheet)?.[1] ?? ''
}
const quickSpring = 'var(--motion-spring-quick) var(--ease-spring-quick)'

describe('below 48rem', () => {
  test('FR-SHELL-01 the bar title sits over the bar, still until the title tucks, then the gym name gives way to it', () => {
    const barTitle = rule(phone, '.barTitle')
    expect(barTitle).toContain('position: absolute;')
    expect(barTitle).toContain('opacity: 0;')
    expect(barTitle).toContain('pointer-events: none;')
    expect(barTitle).toContain('env(safe-area-inset-top, 0px)')
    expect(rule(phone, '.header[data-tucked] .barTitle')).toContain('opacity: 1;')
    expect(rule(phone, '.header[data-tucked] .gymArea > :not(.barTitle)')).toContain('opacity: 0;')
  })

  test("ARCHITECTURE §2 the tucked bar's Sample data tag holds the trailing edge, the leading one left for Back (audit B2-20)", () => {
    const tag = rule(phone, '.barTitle > .sample')
    expect(tag).toContain('grid-column: 3;')
    expect(tag).toContain('justify-self: end;')
    expect(rule(phone, '.barTitleText')).toContain('grid-column: 2;')
    // For a coach, the tag stands clear of Log Out, which sits over the end column.
    expect(rule(phone, '.header:has(.coachActions) .barTitle > .sample')).toContain('margin-inline-end: 6rem;')
  })

  test('ARCHITECTURE §9 the small title fades in on the quick spring, after the gym name has gone, from the motion tokens', () => {
    // Every --motion-* is 0 ms under reduced motion (base.css), so then the two swap with no animation.
    expect(rule(phone, '.header[data-tucked] .barTitle')).toContain(
      `transition: opacity ${quickSpring} var(--motion-fast);`,
    )
    expect(rule(phone, '.header[data-tucked] .gymArea > :not(.barTitle)')).toContain(
      'transition: opacity var(--motion-fast) var(--ease-standard);',
    )
    expect(phone).not.toMatch(/\d+m?s\b/)
  })
})

test('FR-SHELL-02 from 48rem nothing tucks: the bar title is hidden and no rule outside the phone reads data-tucked', () => {
  expect(rule(base, '.barTitle')).toContain('display: none;')
  expect(css.replace(phone, '')).not.toContain('data-tucked')
})
