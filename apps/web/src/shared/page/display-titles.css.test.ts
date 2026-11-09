// @vitest-environment node
// ARCHITECTURE §9, Type: titles of 32 px and up are display type, in Inter 700.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const src = new URL('../../', import.meta.url)

/** A rule's body, by its exact selector at the top level of the sheet. */
const rule = (file: string, selector: string) => {
  const css = readFileSync(new URL(file, src), 'utf8')
  return css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''
}

test.each([
  ['shared/page/PageTitle.module.css', '.title'],
  ['features/website/screens/Home.module.css', '.title'],
  ['features/kiosk/screens/Kiosk.module.css', '.title'],
  ['features/kiosk/components/Panel.module.css', '.title'],
  ['features/kiosk/components/Welcome.module.css', '.headline'],
])('NFR-USE-01 %s %s, a title of 32 px and up, takes the display weight', (file, selector) => {
  const body = rule(file, selector)
  expect(body).toMatch(/font-size: var\(--text-(32|44|48|64)\);/)
  expect(body).toContain('font-weight: var(--weight-display);')
})
