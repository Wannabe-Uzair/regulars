// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { label } from './tokens.ts'

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8')

describe('sentence-case labels', () => {
  test('NFR-USE-01 the label tokens show the words as COPY.md writes them: no capitals, no extra tracking', () => {
    expect(label.transform).toBe('none')
    expect(label.tracking).toBe('normal')
  })

  test.each(['Tag', 'StatusTag', 'Kpi', 'Eyebrow'])('%s uses the label tokens for case and tracking', (name) => {
    const css = read(`./${name}/${name}.module.css`)
    expect(css).toContain('var(--label-transform)')
    expect(css).toContain('var(--label-tracking)')
  })

  // ARCHITECTURE §9 "Labels": table column headers, and the small labels over each fact, in the label tokens.
  test.each([
    ['Table', '.table thead th'],
    ['FactList', '.label'],
  ])(
    'NFR-USE-01 %s shows its labels (%s) in the label tokens: size, weight, tracking and capitals',
    (name, selector) => {
      const css = read(`./${name}/${name}.module.css`)
      const rule = css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''
      for (const token of ['--label-size', '--label-weight', '--label-tracking', '--label-transform']) {
        expect(rule, `${name} ${selector} lacks ${token}`).toContain(`var(${token})`)
      }
    },
  )
})
