// @vitest-environment node
// The Nudge button's stylesheet: once it reads Nudged, scrolling it into view leaves it clear of the toast stack.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const read = (url: URL) => readFileSync(url, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const button = read(new URL('./NudgeButton.module.css', import.meta.url))
const toast = read(new URL('../../../../../packages/ui/src/Toast/Toast.module.css', import.meta.url))

test("FR-TODAY-02 the Nudge button's scroll margin is the toast stack's place plus a toast and the row's rest (audit B2-03)", () => {
  // The stack's offset from the bottom edge, as the toast's own stylesheet sets it: the margin starts there.
  const stack = /\.stack \{[^}]*inset-block-end: calc\(([^;]*)\);/.exec(toast)?.[1]
  expect(stack).toBeDefined()
  const margin = /\.trigger \{[^}]*scroll-margin-block-end: calc\(([^;]*)\);/
    .exec(button)?.[1]
    ?.replace(/\s+/g, ' ')
    .trim()
  // A toast of up to two lines (about 68 px on a phone), the row's last line under the button (about 26 px) and 8 px of air.
  expect(margin).toBe(`${stack!} + var(--space-24) + var(--space-2)`)
})
