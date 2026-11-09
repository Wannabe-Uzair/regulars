import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { WEEKS, weekCells } from './weeks.ts'

// Week 9 in progress with 1 visit so far; weeks 6 to 8 finished with 0, 1 and 0.
const sam = { week: 9, weeks: [3, 3, 2, 3, 1, 1, 0, 1, 0, 1], status: 'slipping' } as const

describe('the week marks', () => {
  test('FR-BOARD-01 every member has 13 marks, and weeks after the current one are not reached yet', () => {
    const cells = weekCells(sam)
    expect(cells).toHaveLength(WEEKS)
    for (const [w, cell] of cells.entries()) {
      if (w <= 9) continue
      expect(cell).toMatchObject({ kind: 'future', label: t('a11y.cell.future', { n: w + 1 }) })
      expect(cell.flag).toBeFalsy()
    }
    // A week the data doesn't reach is not reached yet, even before the current one.
    expect(weekCells({ week: 2, weeks: [3], status: 'new' })[1]?.kind).toBe('future')
  })

  test('FR-BOARD-01 the week in progress is full at 3 visits and an outline below, with its count so far', () => {
    expect(weekCells(sam)[9]).toMatchObject({ kind: 'outline', label: t('a11y.cell.nowOne', { n: 10 }) })
    const two = weekCells({ week: 1, weeks: [3, 2], status: 'new' })[1]
    expect(two).toMatchObject({ kind: 'outline', label: t('a11y.cell.now', { n: 2, v: 2 }) })
    const three = weekCells({ week: 1, weeks: [3, 3], status: 'new' })[1]
    expect(three).toMatchObject({ kind: 'full', label: t('a11y.cell.now', { n: 2, v: 3 }) })
    expect(weekCells({ week: 0, weeks: [0], status: 'new' })[0]?.kind).toBe('outline')
  })

  test('FR-BOARD-01 finished weeks are full at 3 or more, some at 1 or 2, and none at 0, each with its label', () => {
    const cells = weekCells({ week: 4, weeks: [4, 2, 1, 0, 0], status: 'below' })
    expect(cells.slice(0, 4).map((c) => [c.kind, c.label])).toEqual([
      ['full', t('a11y.cell.visits', { n: 1, v: 4 })],
      ['some', t('a11y.cell.visits', { n: 2, v: 2 })],
      ['some', t('a11y.cell.one', { n: 3 })],
      ['none', t('a11y.cell.none', { n: 4 })],
    ])
  })

  test("FR-BOARD-01 only a slipping member's last two finished weeks are flagged", () => {
    const flagged = (member: Parameters<typeof weekCells>[0]) =>
      weekCells(member).flatMap((c, w) => (c.flag ? [w] : []))
    expect(flagged(sam)).toEqual([7, 8])
    expect(flagged({ ...sam, status: 'below' })).toEqual([])
  })

  test('FR-BOARD-03 a fresh check-in pops the week in progress, with a new key for each check-in', () => {
    const before = weekCells(sam)
    expect(before.some((c) => c.fresh)).toBe(false)
    const first = weekCells(sam, '12@2026-11-07T17:42:00.000Z')
    const second = weekCells(sam, '12@2026-11-07T18:10:00.000Z')
    expect(first.flatMap((c, w) => (c.fresh ? [w] : []))).toEqual([9])
    expect(first[9]?.key).not.toBe(before[9]?.key)
    expect(second[9]?.key).not.toBe(first[9]?.key)
    // Every other mark keeps its key, so only the fresh one mounts again.
    expect(first.map((c) => c.key).filter((_, w) => w !== 9)).toEqual(before.map((c) => c.key).filter((_, w) => w !== 9))
  })
})
