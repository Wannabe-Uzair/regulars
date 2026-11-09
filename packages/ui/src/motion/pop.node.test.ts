// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { motion } from '../tokens.ts'

const css = readFileSync(new URL('./pop.module.css', import.meta.url), 'utf8')
const welcome = '@media (prefers-reduced-motion: no-preference) {'

describe('the pop', () => {
  test('FR-BOARD-03 FR-KIOSK-05 scales from 1.25 to 1 over the slow duration with the emphasised easing', () => {
    expect(motion.scale.pop).toBe(1.25)
    expect(motion.duration.slow).toBe('320ms')
    expect(css).toContain('animation: pop var(--motion-slow) var(--ease-emphasised);')
    const keyframes = css.split('@keyframes pop {')[1] ?? ''
    expect(keyframes).toMatch(/from \{\s*transform: scale\(var\(--scale-pop\)\);\s*\}/)
    // It ends at the element's own size: no `to` frame that would hold another scale.
    expect(keyframes).not.toContain('to {')
  })

  test('NFR-USE-04 is declared only when motion is welcome, so nothing moves under reduced motion', () => {
    const [outside, inside = ''] = css.split(welcome)
    expect(outside).not.toContain('animation')
    expect(inside.split('@keyframes')[0]).toContain('animation: pop')
  })
})
