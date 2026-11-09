// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const src = new URL('./', import.meta.url)
const modules = readdirSync(src, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.module.css'))
  .sort()
/** A module's CSS without its comments, from a leading newline so its first rule splits like the rest. */
const read = (file: string) => `\n${readFileSync(new URL(file, src), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')}`

/** A rule's body, by its exact selector at the top level. */
const rule = (css: string, selector: string) => css.split(`\n${selector} {\n`)[1]?.split('}')[0] ?? ''

describe('depth (ARCHITECTURE §9 "Depth, materials and density")', () => {
  test.each(modules)('NFR-USE-01 %s uses no --shadow-raised, the retired alias', (file) => {
    expect(read(file)).not.toContain('--shadow-raised')
  })

  test.each([
    ['Menu/Menu.module.css', 'flyout', '.content'],
    ['Tooltip/Tooltip.module.css', 'flyout', '.content'],
    ['Toast/Toast.module.css', 'float', '.toast'],
    ['Dialog/Dialog.module.css', 'modal', '.content'],
  ])('NFR-USE-01 %s takes its shadow role, --shadow-%s', (file, role, selector) => {
    expect(rule(read(file), selector)).toContain(`box-shadow: var(--shadow-${role});`)
  })

  test.each(['Card/Card.module.css', 'Panel/Panel.module.css'])('NFR-USE-01 %s has no shadow at rest', (file) => {
    expect(read(file)).not.toContain('box-shadow')
  })

  test.each(modules)('NFR-USE-01 every separator and card edge in %s is the hairline in --color-line', (file) => {
    for (const [line] of read(file).matchAll(/[^;{}\n]*solid var\(--color-line\)/g)) {
      expect(line.trim(), file).toMatch(/: var\(--border-hairline\) solid var\(--color-line\)$/)
    }
  })

  test('finds the hairlines: cards, panels, tables, tabs, tags, menus, tooltips, toasts and dialogs', () => {
    const withHairline = modules.filter((file) => read(file).includes('var(--border-hairline) solid var(--color-line)'))
    expect(withHairline).toEqual(
      expect.arrayContaining(
        ['Card', 'Panel', 'Table', 'Tabs', 'Tag', 'Menu', 'Tooltip', 'Toast', 'Dialog'].map(
          (n) => `${n}/${n}.module.css`,
        ),
      ),
    )
  })
})
