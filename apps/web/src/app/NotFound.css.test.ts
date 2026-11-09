// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const page = readFileSync(new URL('./NotFound.module.css', import.meta.url), 'utf8')
const member = readFileSync(new URL('../features/members/screens/Member.module.css', import.meta.url), 'utf8')
const invite = readFileSync(new URL('../features/invite/screens/Invite.module.css', import.meta.url), 'utf8')

/** The declarations of one rule, by its selector, as written. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`)
  expect(start, selector).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('}', start))
}

test('B2-09 Page Not Found and Member Not Found set their sentence alike, with no lone last word', () => {
  for (const sentence of [rule(page, '.line'), rule(member, '.notFound')]) {
    expect(sentence).toContain('font-size: var(--text-16);')
    expect(sentence).toContain('line-height: var(--leading-body);')
    expect(sentence).toContain('text-wrap: pretty;')
  }
})

test('B2-09 both space the title, the sentence and the way back 16 px apart, from the top of the page', () => {
  expect(rule(page, '.body')).toContain('gap: var(--space-4);')
  const missing = rule(member, '.missing')
  expect(missing).toContain('gap: var(--space-4);')
  // The member head's pull toward its back link is undone, as there is no back link above it.
  expect(missing).toContain('margin-block-start: 0;')
  expect(member.indexOf('\n.missing {')).toBeGreaterThan(member.indexOf('\n.head {'))
})

test("out of the shell, the page is the bad invite's centred card: the same ground, column, card and head", () => {
  // Visitor check M2: not a small heading pinned top-left, but the frame Log In and the bad invite use.
  for (const selector of ['.ground', '.main', '.main .card', '.card', '.head', '.head > :first-child', '.brand']) {
    const bare = (css: string) => rule(css, selector).replace(/\s*\/\*[\s\S]*?\*\//g, '')
    expect(bare(page), selector).toBe(bare(invite))
  }
  expect(rule(page, '.ground')).toContain('align-content: center;')
  expect(rule(page, '.ground')).toContain('min-block-size: 100dvh;')
  expect(rule(page, '.main')).toContain('max-inline-size: 400px;')
})
