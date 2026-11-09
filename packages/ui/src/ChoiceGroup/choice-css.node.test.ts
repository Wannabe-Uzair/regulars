// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const css = readFileSync(new URL('./ChoiceGroup.module.css', import.meta.url), 'utf8')
/** A rule's body, at the top level or one level into an at-rule (the hover rules sit in `@media (hover: hover)`). */
const rule = (selector: string) =>
  (css.split(`\n${selector} {\n`)[1] ?? css.split(`\n  ${selector} {\n`)[1])?.split('}')[0] ?? ''

test('NFR-USE-03 every option keeps the 44 px touch target, in both looks', () => {
  expect(rule('.option')).toContain('min-block-size: calc(var(--space-10) + var(--space-1));')
})

test("NFR-USE-03 FR-KIOSK-07 ChoiceGroup's lg options are at least 64 px tall", () => {
  expect(rule('.lg .option')).toContain('min-block-size: var(--space-16);')
  expect(rule('.lg .option')).toContain('font-size: var(--text-21);')
  // It comes after the base option rule, so its height wins.
  expect(css.indexOf('\n.lg .option {')).toBeGreaterThan(css.indexOf('\n.option {'))
})

test('stretched options share the full width equally', () => {
  expect(rule('.stretch')).toContain('inline-size: auto;')
  expect(rule('.stretch .option')).toContain('flex: 1 1 0;')
})

test('FR-KIOSK-02 stretched lg options keep their words on one line in half a 390 px phone', () => {
  expect(rule('.lg.stretch .option')).toContain('padding-inline: var(--space-2);')
  expect(rule('.lg.stretch .option')).toContain('white-space: nowrap;')
  expect(css.indexOf('\n.lg.stretch .option {')).toBeGreaterThan(css.indexOf('\n.lg .option {'))
})

test('NFR-USE-01 the chosen option takes the main-button colours, and its hover the tested hover fill', () => {
  expect(rule('.option:has(:checked)')).toContain('background-color: var(--color-action);')
  expect(rule('.option:has(:checked)')).toContain('color: var(--color-on-action);')
  expect(rule('.option:has(:checked):hover')).toContain('background-color: var(--color-action-hover);')
  // The border moves with the fill, so the chosen chip's edge doesn't stay a step behind on hover.
  expect(rule('.option:has(:checked):hover')).toContain('border-color: var(--color-action-hover);')
})

test("NFR-USE-01 a chosen chip's mark takes the chip's text colour and keeps its shape", () => {
  // The chip's text colour stands 4.5:1 on the fill. StatusDot draws in currentColor, so its shape stays its own.
  const chosen = rule('.option:has(:checked) .dot')
  expect(chosen).toContain('color: var(--color-on-action);')
  expect(chosen).not.toContain('background-color')
  expect(chosen).not.toContain('box-shadow')
  expect(css).not.toMatch(/\.dot\[data-status=/)
})

test('NFR-USE-02 the focus ring shows on the option whose radio has keyboard focus', () => {
  expect(rule('.option:has(:focus-visible)')).toContain('outline: var(--focus-width) solid var(--color-focus);')
})

test('the segmented look is a static surface thumb with a hairline edge on a highlight track, with no strong outline', () => {
  expect(rule('.segmented')).toContain('background-color: var(--color-highlight);')
  expect(rule('.segmented')).not.toContain('border: ')
  expect(rule('.segmented')).not.toContain('line-strong')
  const thumb = rule('.segmented .option:has(:checked)')
  expect(thumb).toContain('background-color: var(--color-surface);')
  expect(thumb).toContain('border-color: var(--color-line);')
  expect(thumb).toContain('color: var(--color-text);')
  // Hover and press keep the thumb as it is.
  expect(rule('.segmented .option:has(:checked):hover')).toContain('background-color: var(--color-surface);')
  expect(rule('.segmented .option:has(:checked):active')).toContain('background-color: var(--color-surface);')
  // Chips keep their tint fill.
  expect(rule('.chips .option:not(:has(:checked))')).toContain('border-color: var(--color-line-strong);')
})
