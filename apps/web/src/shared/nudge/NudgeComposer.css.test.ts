// @vitest-environment node
// The Nudge composer's look in its stylesheet: the message field shows no resize grip, under a finger or a mouse.
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./NudgeComposer.module.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

test('FR-NUDGE-02 the message keeps its rows with no resize grip on every screen, not only under a finger (audit A15)', () => {
  // A rule at the top level (a line's start), so no media query limits it; the element outweighs Textarea's own resize.
  const message = /^textarea\.message \{([^}]*)\}/m.exec(css)?.[1] ?? ''
  expect(message).toContain('resize: none;')
})
