// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { motion } from '../tokens.ts'

const css = `\n${readFileSync(new URL('./Spinner.module.css', import.meta.url), 'utf8')}`
const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''
const [outside, reduced = ''] = css.split('@media (prefers-reduced-motion: reduce) {')

test('NFR-USE-04 a spinner shows only after its delay, 400 ms by default, then fades in over --motion-fast', () => {
  expect(motion.delay.busy).toBe('400ms')
  expect(rule('.spinner')).toContain(
    'animation: spinner-in var(--motion-fast) var(--ease-standard) var(--spinner-delay, var(--delay-busy)) both;',
  )
  // While it waits it is hidden, from screen readers as well, so a quick answer never announces it.
  expect(css).toMatch(/@keyframes spinner-in \{\n {2}from \{\n {4}opacity: 0;\n {4}visibility: hidden;\n {2}\}\n\}/)
})

test('NFR-USE-04 under reduced motion it still waits, then appears without fading', () => {
  // The wait sits outside the reduced-motion block, where base.css zeroes --motion-fast but keeps --delay-busy.
  expect(outside).toContain('animation: spinner-in')
  expect(reduced).not.toContain('.spinner {')
  expect(reduced).not.toContain('spinner-in')
})
