import { expect, test } from 'vitest'
import { boardOrder, slippingOrder } from './board.ts'
import type { BoardRow, SlippingRow } from './board.ts'

test('boardOrder: slipping first, then newest joiners first, then lowest id', () => {
  const rows: BoardRow[] = [
    { id: 1, status: 'on', joinedOn: '2026-09-01' },
    { id: 2, status: 'slipping', joinedOn: '2026-08-20' },
    { id: 3, status: 'new', joinedOn: '2026-11-05' },
    { id: 4, status: 'below', joinedOn: '2026-10-01' },
    { id: 5, status: 'slipping', joinedOn: '2026-10-15' },
    { id: 7, status: 'on', joinedOn: '2026-10-01' },
    { id: 6, status: 'below', joinedOn: '2026-10-01' },
  ]
  expect([...rows].sort(boardOrder).map((r) => r.id)).toEqual([5, 2, 3, 4, 6, 7, 1])
})

test('boardOrder is 0 only for the same id, and antisymmetric', () => {
  const a: BoardRow = { id: 1, status: 'on', joinedOn: '2026-10-01' }
  const b: BoardRow = { id: 2, status: 'below', joinedOn: '2026-10-01' }
  expect(boardOrder(a, a)).toBe(0)
  expect(Math.sign(boardOrder(a, b))).toBe(-Math.sign(boardOrder(b, a)))
})

test('slippingOrder: most days since last visit first, never visited counts as the most, then lowest id', () => {
  const rows: SlippingRow[] = [
    { id: 1, daysSinceJoin: 30, daysSinceLastVisit: 9 },
    { id: 2, daysSinceJoin: 20, daysSinceLastVisit: 15 },
    { id: 3, daysSinceJoin: 15, daysSinceLastVisit: null }, // never: counts as 16
    { id: 4, daysSinceJoin: 40, daysSinceLastVisit: 16 },
    { id: 5, daysSinceJoin: 25, daysSinceLastVisit: 9 },
  ]
  expect([...rows].sort(slippingOrder).map((r) => r.id)).toEqual([3, 4, 2, 1, 5])
})
