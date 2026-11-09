import { buildReports } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { ReportsResponse } from './reports.ts'

const empty = buildReports({
  today: '2026-11-06',
  now: '2026-11-06T18:00:00.000Z',
  timeZone: 'America/Chicago',
  pilotStartedOn: '2026-08-01',
  members: [],
  checkins: [],
  nudges: [],
})
const filled = {
  ...empty,
  cohorts: [
    { month: '2026-08', joined: 2, day30: 50, day60: 100, day90: 0 },
    { month: '2026-09', joined: 1, day30: 100, day60: null, day90: null },
    { month: '2026-10', joined: 1, day30: null, day60: null, day90: null },
    { month: '2026-11', joined: 0, day30: null, day60: null, day90: null },
  ],
  nudges: { sent: 6, cameBack: 2, waiting: 1, rate: 40 },
}

describe('ReportsResponse', () => {
  test("FR-REPORT-01 takes the domain's report, an empty gym's and a filled one", () => {
    expect(ReportsResponse.strict().parse(empty)).toEqual(empty)
    expect(ReportsResponse.strict().safeParse(filled).success).toBe(true)
  })

  test('FR-REPORT-01 takes one to four cohort rows: a young gym has fewer', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(ReportsResponse.safeParse({ ...filled, cohorts: filled.cohorts.slice(-n) }).success).toBe(true)
    }
  })

  test.each([
    ['no cohorts', { cohorts: [] }],
    ['five cohorts', { cohorts: [filled.cohorts[0], ...filled.cohorts] }],
    ['no waiting count', { nudges: { sent: 5, cameBack: 2, rate: 40 } }],
    ['twelve weeks', { visitsByWeek: empty.visitsByWeek.slice(1) }],
    [
      'a month written as a date',
      { cohorts: [{ ...filled.cohorts[0], month: '2026-08-01' }, ...filled.cohorts.slice(1)] },
    ],
    ['a percent over 100', { nudges: { sent: 1, cameBack: 2, rate: 200 } }],
    ['a line other than 3', { line: 2 }],
    ['no nudge figures', { nudges: undefined }],
  ])('FR-REPORT-01 refuses %s', (_, change) => {
    expect(ReportsResponse.safeParse({ ...filled, ...change }).success).toBe(false)
  })
})
