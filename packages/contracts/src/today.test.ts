import { describe, expect, test } from 'vitest'
import { summary } from './test-fixtures.ts'
import { TodayResponse } from './today.ts'

// The old GET /api/today, for a coach with one slipping member checked in today.
const today = {
  kpis: { newMembers: 14, onTheLinePct: 62, slipping: 1, nudgedThisWeek: 3 },
  slipping: [summary],
  checkinsToday: [{ memberId: 12, name: 'Sam O.', at: '2026-11-06T13:30:00.000Z' }],
  board: [summary, { ...summary, id: 13, name: 'Ana B.', status: 'on' }],
  hasMembers: true,
}

describe('TodayResponse', () => {
  test('accepts the Today payload, and an empty gym', () => {
    expect(TodayResponse.safeParse(today).success).toBe(true)
    const empty = { kpis: { newMembers: 0, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 }, slipping: [], checkinsToday: [], board: [], hasMembers: false }
    expect(TodayResponse.safeParse(empty).success).toBe(true)
  })

  test.each([
    ['the old snake_case check-in', { checkinsToday: [{ member_id: 12, name: 'Sam O.', at: '2026-11-06T13:30:00.000Z' }] }],
    ['a percent over 100', { kpis: { ...today.kpis, onTheLinePct: 140 } }],
    ['no board', { board: undefined }],
    ['no hasMembers', { hasMembers: undefined }],
    ['a hasMembers that is not a boolean', { hasMembers: 1 }],
    ['a check-in without a time', { checkinsToday: [{ memberId: 12, name: 'Sam O.', at: 'today' }] }],
  ])('rejects %s', (_, patch) => {
    expect(TodayResponse.safeParse({ ...today, ...patch }).success).toBe(false)
  })
})
