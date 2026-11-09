// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

// A grid's implicit column is `auto`, and it grows to its widest child. The board is wider than a phone, so on one it
// widened the whole page, header and all, instead of scrolling inside its own frame (ARCHITECTURE §8, page grids).
const src = fileURLToPath(new URL('../', import.meta.url))
const read = (file: string) => readFileSync(src + file, 'utf8')

/** The declarations of a rule at the top level of a stylesheet (rules inside a media query are indented). */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|\\n)${escaped} \\{\\n([^}]*)\\}`).exec(css)?.[1] ?? ''
}

const shrinkable = /grid-template-columns: minmax\(0, 1fr\);/

describe('page grids', () => {
  test('the app frame has one column, which may be narrower than its content', () => {
    expect(rule(read('app/shell/AppShell.module.css'), '.frame')).toMatch(shrinkable)
  })

  test("every .page grid has a column that may be narrower than its content, so a wide child scrolls in itself", () => {
    const sheets = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.module.css'))
    const pages = sheets.filter((file) => rule(read(file), '.page').includes('display: grid'))
    expect(pages).toContain('features/today/screens/Today.module.css')
    for (const file of pages) expect(rule(read(file), '.page'), file).toMatch(shrinkable)
  })
})

describe('level KPI figures', () => {
  test("each tile is a grid and the Kpi's figure sits at the bottom of it, so figures in a row stay level", () => {
    expect(rule(read('features/today/screens/Today.module.css'), '.kpis > *')).toMatch(/display: grid;/)
    expect(rule(read('../../../packages/ui/src/Kpi/Kpi.module.css'), '.value')).toMatch(/margin-block-start: auto;/)
  })
})

describe('links', () => {
  test('every rule that colours a link also underlines it with the link token', () => {
    const roots = [src, fileURLToPath(new URL('../../../../packages/ui/src/', import.meta.url))]
    const sheets = roots.flatMap((root) =>
      readdirSync(root, { recursive: true, encoding: 'utf8' })
        .filter((f) => f.endsWith('.module.css'))
        .map((f) => root + f),
    )
    const links: string[] = []
    for (const file of sheets) {
      for (const [, selector, body] of readFileSync(file, 'utf8').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/(?:^|[\s;])color: var\(--color-link\);/.test(body ?? '')) continue
        links.push(file)
        expect(body, `${file} ${selector?.trim()}`).toMatch(/text-decoration: var\(--link-decoration\);/)
      }
    }
    // ui's text-link style is the one every link inside a sentence takes, so the check can't pass by finding nothing.
    expect(links.some((f) => f.endsWith('TextLink/TextLink.module.css'))).toBe(true)
  })
})

describe('touch targets', () => {
  const touchTarget = 'min-block-size: calc(var(--space-10) + var(--space-1));'

  test("NFR-USE-03 the small quiet buttons on member rows and facts still reach 44 px, over the button's own size", () => {
    // Open is ui's sm alone (F33): sm is 44 px itself.
    expect(rule(read('../../../packages/ui/src/Button/Button.module.css'), '.sm')).toContain(touchTarget)
    expect(rule(read('features/members/components/Facts.module.css'), 'button.change')).toContain(touchTarget)
  })
})
