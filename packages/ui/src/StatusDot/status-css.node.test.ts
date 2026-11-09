// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { themes } from '../tokens.ts'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

/** A rule's body, by its exact selector. */
const rule = (css: string, selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''

test('NFR-USE-01 StatusDot draws each status in its own status role, slipping in the attention red', () => {
  const css = read('./StatusDot.module.css')
  expect(rule(css, ".dot[data-status='on']")).toContain('color: var(--color-status-on);')
  expect(rule(css, ".dot[data-status='below']")).toContain('color: var(--color-status-below);')
  expect(rule(css, ".dot[data-status='new']")).toContain('color: var(--color-status-new);')
  expect(rule(css, ".dot[data-status='slipping']")).toContain('color: var(--color-attention);')
  // Sized in em, so the mark follows the text beside it (ARCHITECTURE §9, the status marks).
  expect(rule(css, '.dot')).toContain('inline-size: 0.75em;')
  expect(rule(css, '.dot')).toContain('block-size: 0.75em;')
})

test('NFR-USE-01 in light only slipping is red: on, below and new are neutral, with no green or amber', () => {
  const light = themes.light.color
  expect(light['status-on']).toBe('var(--color-text)')
  expect(light['status-below']).toBe('var(--color-text)')
  expect(light['status-new']).toBe('var(--color-text-soft)')
  for (const role of ['status-on-text', 'status-below-text', 'status-new-text'] as const) {
    expect(light[role]).toBe('var(--color-text)')
  }
  expect(light.attention).toBe('#E0102E')
  expect(light['attention-text']).toBe('#D40624')
})

test("NFR-USE-01 StatusTag's words take each status's text role, slipping the attention text", () => {
  const css = read('../StatusTag/StatusTag.module.css')
  expect(rule(css, '.status.on')).toContain('color: var(--color-status-on-text);')
  expect(rule(css, '.status.below')).toContain('color: var(--color-status-below-text);')
  expect(rule(css, '.status.new')).toContain('color: var(--color-status-new-text);')
  expect(rule(css, '.status.slipping')).toContain('color: var(--color-attention-text);')
})

test("FR-BOARD-01 a slipping member's flagged weeks, empty or 1 visit, take the 2 px red edge over their own", () => {
  const css = read('../Marks/Marks.module.css')
  expect(rule(css, '.mark[data-flag]')).toContain('border: var(--border-thick) solid var(--color-attention);')
  // Same specificity as the kinds' rules, so it must come after them to win over the empty week's outline.
  const flag = css.indexOf('\n.mark[data-flag] {')
  for (const kind of ['none', 'some']) {
    expect(css.indexOf(`\n.mark[data-mark='${kind}'] {`), kind).toBeLessThan(flag)
  }
})

/** A module's `@media (forced-colors: active)` block, and its rule bodies by selector. */
function forced(file: string) {
  const block = `\n${read(file).split('@media (forced-colors: active) {\n')[1]?.split('\n}\n')[0] ?? ''}`
  const body = (selector: string) => block.split(`\n  ${selector} {\n`)[1]?.split('}')[0] ?? ''
  return { block, body }
}

/** Every colour a block sets: in a contrast theme each must be a system colour, never a token or a literal. */
const colours = (block: string) =>
  [...block.matchAll(/(?:^|\s)(?:color|background-color|border-color|fill|stroke):\s*([^;]+);/g)].map((m) => m[1])
const system = ['CanvasText', 'GrayText', 'Canvas', 'Highlight']

test('NFR-USE-06 in forced colours the status shapes and week marks keep their form in system colours', () => {
  const dot = forced('./StatusDot.module.css')
  expect(dot.body('.dot')).toContain('forced-color-adjust: none;')
  const drawn = ".dot[data-status='on'],\n  .dot[data-status='below'],\n  .dot[data-status='slipping']"
  expect(dot.body(drawn)).toContain('color: CanvasText;')
  expect(dot.body(".dot[data-status='new']")).toContain('color: GrayText;')
  expect(colours(dot.block).length).toBeGreaterThan(0)
  for (const colour of colours(dot.block)) expect(system, colour).toContain(colour)

  const marks = forced('../Marks/Marks.module.css')
  expect(marks.body('.mark,\n  .days')).toContain('forced-color-adjust: none;')
  // Filled, grey, outlined or edged: each kind keeps a form of its own.
  expect(marks.body(".mark[data-mark='full']")).toContain('background-color: CanvasText;')
  expect(marks.body(".mark[data-mark='some']")).toContain('background-color: GrayText;')
  expect(marks.body(".mark[data-mark='none'],\n  .mark[data-mark='outline']")).toContain('border-color: CanvasText;')
  expect(marks.body(".mark[data-mark='future']")).toContain('border-color: GrayText;')
  expect(marks.body('.mark[data-flag]')).toContain('border-color: Highlight;')
  expect(marks.body(".day[data-day='visited']")).toContain('fill: CanvasText;')
  expect(marks.body(".day[data-day='missed']")).toContain('stroke: CanvasText;')
  expect(marks.body(".day[data-day='ahead']")).toContain('fill: GrayText;')
  expect(marks.body('.currentWeek')).toContain('stroke: CanvasText;')
  for (const colour of colours(marks.block)) expect(system, colour).toContain(colour)
  // The flag still comes after the kinds, so its edge wins there too.
  expect(marks.block.indexOf('.mark[data-flag]')).toBeGreaterThan(marks.block.indexOf(".mark[data-mark='future']"))
})
