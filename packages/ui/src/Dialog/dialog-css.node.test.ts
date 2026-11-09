// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./Dialog.module.css', import.meta.url), 'utf8')
/** A rule's body, at the top level or one level into an at-rule. */
const rule = (selector: string) =>
  (css.split(`\n${selector} {\n`)[1] ?? css.split(`\n  ${selector} {\n`)[1])?.split('}')[0] ?? ''

test('NFR-USE-02 the body has room for a focus ring inside the frame that clips it, and nothing moves', () => {
  const body = rule('.body')
  expect(body).toContain('padding: calc(var(--focus-width) + var(--focus-offset));')
  expect(body).toContain('margin: calc(-1 * (var(--focus-width) + var(--focus-offset)));')
})

test('NFR-USE-04 dialogs and sheets rise on the smooth spring and leave on the quick one, the scrim fading over base', () => {
  const [before, motion = ''] = css.split('@media (prefers-reduced-motion: no-preference) {')
  expect(before).not.toContain('animation:')
  const animation = (selector: string) => motion.split(`\n  ${selector} {\n`)[1]?.split('}')[0]?.trim()
  for (const shown of ['dialog', 'sheet']) {
    expect(animation(`.content[data-presentation='${shown}'][data-state='open']`)).toBe(
      `animation: ${shown}-in var(--motion-spring) var(--ease-spring);`,
    )
    expect(animation(`.content[data-presentation='${shown}'][data-state='closed']`)).toBe(
      `animation: ${shown}-out var(--motion-spring-quick) var(--ease-spring-quick);`,
    )
  }
  // One scrim for both, over base on the standard easing both ways.
  expect(animation(".overlay[data-state='open']")).toBe('animation: fade-in var(--motion-base) var(--ease-standard);')
  expect(animation(".overlay[data-state='closed']")).toBe(
    'animation: fade-out var(--motion-base) var(--ease-standard);',
  )
  expect(motion).not.toContain('.overlay[data-presentation=')
})

test('NFR-USE-01 the surface is opaque, with the modal shadow and a hairline edge, and its body keeps its scroll', () => {
  const content = rule('.content')
  expect(content).toContain('background-color: var(--color-raised);')
  expect(content).toContain('box-shadow: var(--shadow-modal);')
  expect(content).toContain('border: var(--border-hairline) solid var(--color-line);')
  expect(rule('.body')).toContain('overscroll-behavior: contain;')
})

test('FR-NUDGE-01 with a Cancel, the header is three cells and the title is centred between them', () => {
  expect(rule(".header[data-dismiss='cancel']")).toContain('grid-template-columns: 1fr minmax(0, auto) 1fr;')
  expect(rule(".header[data-dismiss='cancel'] .title")).toContain('text-align: center;')
})

test("the description is 16 px body text, so a confirm's what-happens line isn't its smallest text", () => {
  expect(rule('.description')).toContain('font-size: var(--text-16);')
})
