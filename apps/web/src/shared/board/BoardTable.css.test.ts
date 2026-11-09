// @vitest-environment node
// The board's layout lives in its stylesheet, so the DOM is the same at every width: from 48rem a table that scrolls
// sideways in its own frame (compact on a laptop), below it a two-line card per member that is one link (pick I3).
// These pin the rules that make each width.
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const css = readFileSync(new URL('./BoardTable.module.css', import.meta.url), 'utf8')

/** The stylesheet outside any media query. */
const base = css.slice(0, css.indexOf('@media'))

/** The body of the media query that starts with `query`. */
function media(query: string): string {
  const start = css.indexOf(`@media ${query} {`)
  expect(start, query).toBeGreaterThanOrEqual(0)
  return css.slice(start, css.indexOf('\n}\n', start))
}

/** The declarations of a rule, matched at the start of a line (indented inside a media query). */
function rule(sheet: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\n *${escaped} \\{\\n([^}]*)\\}`).exec(sheet)?.[1] ?? ''
}

const phone = media('(width < 48rem)')
const laptop = media('(pointer: fine) and (width >= 64rem)')
const room = 'var(--focus-room)'
const target = 'min-block-size: calc(var(--space-10) + var(--space-1));'
const tint = 'animation: tint var(--motion-linger) var(--ease-standard);'

describe('from 48rem, the table', () => {
  test('FR-BOARD-01 scrolls sideways in its own frame, with the names held at the left edge', () => {
    expect(rule(base, '.scroll')).toContain('overflow-x: auto;')
    expect(rule(base, '.name')).toContain('position: sticky;')
  })

  test('F31 the head cells share one padding, so New member sits level with Weeks and Status', () => {
    expect(rule(base, '.board thead th')).toContain('padding-block: 0 var(--space-2);')
  })

  test('NFR-USE-03 FR-BOARD-02 the name link is a 44 px block that sets the row’s height, with no padding round it', () => {
    expect(rule(base, '.name')).toContain('padding-block: 0;')
    expect(rule(base, '.link')).toContain('display: flex;')
    expect(rule(base, '.link')).toContain(target)
  })

  test('NFR-USE-03 FR-BOARD-04 a sorting head cell holds a 44 px button, and adds no padding of its own', () => {
    expect(rule(base, '.sort')).toContain(target)
    // 44 px wide too: "Pace" with its caret is about 44 px at 12 px, and these buttons also serve touch from 48rem.
    expect(rule(base, '.sort')).toContain('min-inline-size: calc(var(--space-10) + var(--space-1));')
    expect(rule(base, '.board thead th:has(> .sort)')).toContain('padding-block: 0;')
  })

  test('FR-BOARD-04 the pace head puts its caret first, so the word ends level with the right-aligned figures', () => {
    expect(rule(base, '.board .paceHead .sort')).toContain('flex-direction: row-reverse;')
  })

  test('FR-BOARD-04 a head button’s focus ring is a capsule clear of its words, which stay level with the column (audit B2-19)', () => {
    const sort = rule(base, '.sort')
    expect(sort).toContain('border-radius: var(--radius-full);')
    expect(sort).toContain('padding: 0 var(--space-2);')
    // The margin takes the padding back on the side the words align to: the start, or the pace's end.
    expect(sort).toContain('margin-inline-start: calc(-1 * var(--space-2));')
    expect(rule(base, '.board .paceHead .sort')).toContain('margin-inline: 0 calc(-1 * var(--space-2));')
    // At its start the frame keeps the names' button's padding, so the frame doesn't cut its ring; its margin takes it
    // back.
    expect(rule(base, '.scroll')).toContain('padding-inline-start: var(--space-2);')
    expect(rule(base, '.scroll')).toContain('margin-inline-start: calc(-1 * var(--space-2));')
    // The ring reaches past its cell, so on a laptop, where the head cells stick with a fill, the focused one rises.
    expect(rule(laptop, '.board thead th:has(> .sort:focus-visible)')).toContain(
      'z-index: calc(var(--layer-sticky) + 3);',
    )
    // After the pace, status starts 16 px off: the pace's 8 px of padding and status's own meet without overlapping.
    expect(rule(base, '.paceHead + .statusHead,\n.paceCell + .statusCell')).toContain(
      'padding-inline-start: var(--space-4);',
    )
  })

  test('F34 the frame gives focus rings room at the row ends and under the last row, taken back by its margin', () => {
    const scroll = rule(base, '.scroll')
    expect(scroll).toContain('--focus-room: calc(var(--focus-width) + var(--focus-offset));')
    expect(scroll).toContain(`padding: 0 ${room} ${room};`)
    expect(scroll).toContain(`margin: 0 calc(-1 * ${room}) calc(-1 * ${room});`)
  })

  test('skill-4 the lines between rows are hairlines', () => {
    expect(rule(base, '.board tbody tr + tr > *')).toContain(
      'border-block-start: var(--border-hairline) solid var(--color-line);',
    )
  })

  test('FR-BOARD-03 a check-in tints its row, and the tint fades over --motion-linger', () => {
    expect(rule(base, '.fresh > *')).toContain(tint)
    // Only a start: each cell fades to its own background (the name's surface, the others' none).
    const keyframes = /@keyframes tint \{\n([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    expect(keyframes).toBe('  from {\n    background-color: var(--color-tint-fill);\n  }')
  })
})

describe('from 64rem with a fine pointer, the compact table', () => {
  test('FR-BOARD-04 from 1024 px with a fine pointer the board is compact, with a sticky header row and name column', () => {
    // The frame scrolls both ways inside the window, so its head row can stick.
    const scroll = rule(laptop, '.scroll')
    expect(scroll).toContain('max-block-size: calc(100dvh - 14rem);')
    expect(scroll).toContain('overflow: auto;')
    const head = rule(laptop, '.board thead th')
    expect(head).toContain('position: sticky;')
    expect(head).toContain('inset-block-start: 0;')
    expect(head).toContain('background-color: var(--color-surface);')
    // The corner cell is a name cell too, so it sticks both ways, a layer above the head row and the names.
    expect(rule(base, '.name')).toContain('inset-inline-start: 0;')
    expect(head).toContain('z-index: calc(var(--layer-sticky) + 1);')
    expect(rule(laptop, '.board thead .name')).toContain('z-index: calc(var(--layer-sticky) + 2);')
    // Cells pad less; the rows stay at the name link's 44 px.
    expect(rule(laptop, '.cell')).toContain('padding: var(--space-1) var(--border-thick);')
    expect(laptop).not.toContain('min-block-size')
  })
})

describe('below 48rem, a card per member (I3)', () => {
  test('FR-BOARD-01 no head row and no table layout: each row is a wrapping flex line, with a line between cards', () => {
    expect(rule(phone, '.board,\n  .board tbody')).toContain('display: block;')
    expect(rule(phone, '.board thead')).toContain('display: none;')
    const row = rule(phone, '.board tbody tr')
    expect(row).toContain('display: flex;')
    expect(row).toContain('flex-wrap: wrap;')
    expect(rule(phone, '.board tbody tr + tr')).toContain(
      'border-block-start: var(--border-hairline) solid var(--color-line);',
    )
    expect(rule(phone, '.board tbody tr + tr > *')).toContain('border-block-start: none;')
  })

  test('FR-BOARD-02 a phone card is one link to the member: the name link’s ::after covers the card', () => {
    expect(rule(phone, '.board tbody tr')).toContain('position: relative;')
    // The name is static, so the link's ::after is placed on the row, not on the name's cell.
    expect(rule(phone, '.name')).toContain('position: static;')
    expect(rule(phone, '.name')).toContain('min-inline-size: 0;')
    const cover = rule(phone, '.link::after')
    expect(cover).toContain('position: absolute;')
    expect(cover).toContain('inset: 0;')
    // Its focus ring goes round the card.
    expect(rule(phone, '.link:focus-visible')).toContain('outline: none;')
    expect(rule(phone, '.link:focus-visible::after')).toContain('outline: var(--focus-width) solid var(--color-focus);')
  })

  test('FR-BOARD-02 the first line is the name and the status; the weeks, then the pace, the second; no actions', () => {
    // The rule that sets the selector's order (a selector can also share a rule with another).
    const order = (selector: string) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\n *${escaped} \\{\\n[^}]*?order: (\\d+);`).exec(phone)?.[1]
    }
    // A full-width break after the first line (::before).
    expect(rule(phone, '.board tbody tr::before')).toContain('flex-basis: 100%;')
    const lines = ['.name', '.statusCell', '.board tbody tr::before', '.cell', '.paceCell']
    expect(lines.map((s) => Number(order(s)))).toEqual([1, 2, 3, 4, 5])
    expect(css).not.toMatch(/\.actions/)
  })

  test('FR-BOARD-03 on a phone the tint fills the whole card, and its cells take none of their own', () => {
    expect(rule(phone, '.fresh')).toContain(tint)
    // A see-through cell fading over the card's own fade would show darker than the card.
    expect(rule(phone, '.fresh > *')).toContain('animation: none;')
  })
})

describe('the board page on a laptop (audit B2-18)', () => {
  test('the page is no taller than the window less the shell padding, but never under 28rem, so a short window keeps rows', () => {
    const page = readFileSync(new URL('../../features/board/screens/Board.module.css', import.meta.url), 'utf8')
    expect(page).toContain('max-block-size: max(calc(100dvh - 2 * var(--space-6)), 28rem);')
  })
})
