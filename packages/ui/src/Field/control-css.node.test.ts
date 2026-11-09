// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./control.module.css', import.meta.url), 'utf8')

test('NFR-USE-01 hovering an invalid input, select or textarea keeps its danger border', () => {
  expect(css).toMatch(/\.control\[aria-invalid='true'\] \{\n {2}border-color: var\(--color-danger\);/)
  const hovers = [...css.matchAll(/^\s*(\.control:hover[^{]*) \{$/gm)].map((m) => m[1])
  expect(hovers.length).toBeGreaterThan(0)
  for (const hover of hovers) expect(hover).toContain("[aria-invalid='true']")
})

test('NFR-USE-01 an invalid field focused draws its ring in danger, the colour of its border, so it shows one colour', () => {
  expect(css).toMatch(/\.control:focus \{\n {2}outline: var\(--focus-width\) solid var\(--color-focus\);/)
  expect(css).toMatch(/\.control\[aria-invalid='true'\]:focus \{\n {2}outline-color: var\(--color-danger\);/)
  // After the plain focus rule and more specific, so it wins either way.
  expect(css.indexOf(".control[aria-invalid='true']:focus {")).toBeGreaterThan(css.indexOf('.control:focus {'))
})
