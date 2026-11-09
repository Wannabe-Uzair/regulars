// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

// A leading newline, so the file's first rule splits like the rest.
const css = `\n${readFileSync(new URL('./Button.module.css', import.meta.url), 'utf8')}`
const rule = (selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''

test("the danger button's hover edge fades like every other hover, since the transition covers box-shadow", () => {
  const transition = /transition:([^;]+);/.exec(rule('.button'))?.[1] ?? ''
  for (const property of ['background-color', 'border-color', 'box-shadow', 'color']) {
    expect(transition).toContain(`${property} var(--motion-fast) var(--ease-standard)`)
  }
})

test('NFR-USE-04 a busy button keeps its fill and words for the busy delay, then fades its label out (pick F2)', () => {
  // Hover still fills a busy button, so its fill doesn't fall back the moment it's clicked; a press on it shows nothing.
  for (const variant of ['primary', 'secondary', 'quiet', 'plain', 'tinted', 'danger', 'destructive']) {
    expect(css).toContain(`\n  .${variant}:hover:not(:disabled)`)
    expect(css).toContain(`\n.${variant}:active:not(:disabled, .loading)`)
  }
  // The label waits out the same delay as Spinner's before it fades, and is never hidden at once.
  const label = rule('.loading .content')
  expect(label).toContain('animation: busy-label-out var(--motion-fast) var(--ease-standard) var(--delay-busy) both;')
  expect(label).not.toContain('opacity')
  expect(css).toMatch(/@keyframes busy-label-out \{\n {2}to \{\n {4}opacity: 0;\n {2}\}\n\}/)
  expect(css).not.toContain('prefers-reduced-motion')
})

test('NFR-USE-01 every variant is a capsule, the tinted one on the tint fill and the plain one in tint words', () => {
  expect(rule('.button')).toContain('border-radius: var(--radius-full);')
  expect(css).not.toMatch(/border-radius: var\(--radius-(?!full)/)
  expect(rule('.tinted')).toContain('background-color: var(--color-tint-fill);')
  expect(rule('.tinted')).toContain('color: var(--color-on-tint-fill);')
  expect(rule('.plain')).toContain('color: var(--color-action);')
  expect(rule('.plain')).not.toContain('background-color')
  // An alert's destructive confirm is filled red under its own words, never red words on a tint.
  expect(rule('.destructive')).toContain('background-color: var(--color-danger);')
  expect(rule('.destructive')).toContain('color: var(--color-on-danger);')
  // The Nudge is never red: no button reads the retired attention fill (ARCHITECTURE §9).
  expect(css).not.toContain('--color-attention')
  expect(css).not.toContain('--color-on-attention')
})

test('FR-TODAY-02 the done check springs in on the smooth spring, and is still under reduced motion by the tokens', () => {
  expect(rule('.check')).toContain('animation: done-check-in var(--motion-spring) var(--ease-spring) both;')
  expect(css).toMatch(/@keyframes done-check-in \{\n {2}from \{\n {4}opacity: 0;/)
})
