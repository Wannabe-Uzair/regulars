// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { motion } from '../tokens.ts'

const css = readFileSync(new URL('./Skeleton.module.css', import.meta.url), 'utf8')

test('the shapes stand in the line box of the words they replace, so nothing moves when the words come', () => {
  expect(css).toMatch(/\.line \{[^}]*block-size: 1lh;/)
  // A formatting context of its own, or the bar's centring margin would collapse through and push the line down.
  expect(css).toMatch(/\.line \{[^}]*display: flow-root;/)
})

test('NFR-USE-04 the pulse is slow, waits out --delay-busy, and runs on --motion-linger, which reduced motion zeroes', () => {
  expect(motion.duration.linger).toBe('1600ms')
  expect(css).toContain(
    'animation: pulse var(--motion-linger) var(--ease-standard) var(--delay-busy) infinite alternate;',
  )
  // No fill mode: with no length under reduced motion, the shapes keep their full fill (base.css zeroes the token).
  expect(css).toMatch(/@keyframes pulse \{\n {2}to \{\n {4}opacity: var\(--opacity-skeleton-pulse\);\n {2}\}\n\}/)
  expect(css).not.toContain('prefers-reduced-motion')
})
