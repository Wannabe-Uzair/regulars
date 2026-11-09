// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

test('FR-KIOSK-07 the kiosk pattern paints the theme block’s kiosk blend over the page ground, under the grain', () => {
  const css = readFileSync(new URL('./MeshBackground.module.css', import.meta.url), 'utf8')
  expect(css).toMatch(/\n\.mesh\.kiosk \{\n {2}background-image: var\(--blend-kiosk\);\n\}/)
  expect(css).toMatch(/\n\.root \{[^}]*background-color: var\(--color-bg\);/)
})

test('FR-KIOSK-07 the site mesh is flat in light: every stop mixes only bg and bg-alt, and the grain is per theme', () => {
  const css = readFileSync(new URL('./MeshBackground.module.css', import.meta.url), 'utf8')
  // The lift's light branch is bg-alt, which Iris makes the ground itself; the dark branch keeps its touch of bg-alt.
  expect(css).toMatch(
    /--mesh-lift: light-dark\(\n {4}var\(--color-bg-alt\),\n {4}color-mix\(in oklab, var\(--color-bg-alt\) 18%, var\(--color-bg\)\)\n {2}\);/,
  )
  const mesh = css.split('\n.mesh {')[1]?.split('\n}')[0] ?? ''
  const roles = new Set([...mesh.matchAll(/var\(--color-([a-z-]+)\)/g)].map((m) => m[1]))
  expect([...roles].sort()).toEqual(['bg', 'bg-alt'])
  expect(css).toMatch(/\n\.grain \{[^}]*opacity: var\(--opacity-grain\);/)
})
