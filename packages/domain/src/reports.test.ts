// The report maths (FR-REPORT-01, FR-REPORT-03). The first six tests' expected values were produced by running the
// legacy buildReports on their dataset; the rest are ported from legacy/app/server/reports/test/reports.test.mjs, its
// string ids made numbers. Its first two tests (the empty gym, and the months across a year end) are the "no data"
// test here. legacy/app/server/test/reports.test.mjs and the unit file's Northside smoke test go through the seed, so
// they are ported in apps/api/src/modules/reports.
import { expect, test } from 'vitest'
import { addDays } from './dates.ts'
import { buildReports, REPORTS_LINE } from './reports.ts'
import type { ReportsInput } from './reports.ts'

const noon = (date: string): string => `${date}T18:00:00.000Z`

// Today is 3 Jan 2027 in Chicago, so the cohorts run Oct 2026 to Jan 2027 across the year end.
const DATA: Omit<ReportsInput, 'timeZone'> = {
  today: '2027-01-03',
  now: '2027-01-03T20:00:00.000Z',
  pilotStartedOn: '2026-09-01',
  members: [
    { id: 1, joinedOn: '2026-10-01' },
    { id: 2, joinedOn: '2026-10-31' }, // last day of October
    { id: 3, joinedOn: '2026-11-01' }, // first day of November
    { id: 4, joinedOn: '2026-11-30' },
    { id: 5, joinedOn: '2026-12-05' },
    { id: 6, joinedOn: '2027-01-02' },
    { id: 7, joinedOn: '2026-09-15' }, // outside the four cohort months, still in visitsByWeek
  ],
  checkins: [
    { memberId: 1, at: noon('2026-10-26') },
    { memberId: 1, at: noon('2026-11-25') },
    { memberId: 1, at: noon('2026-12-25') },
    { memberId: 1, at: '2026-12-25T23:00:00.000Z' }, // same local day: counts once
    { memberId: 2, at: '2026-11-30T05:30:00.000Z' }, // 29 Nov 23:30 CST: day 29
    { memberId: 3, at: '2026-12-01T05:30:00.000Z' }, // 30 Nov 23:30 CST: day 29
    { memberId: 3, at: noon('2026-12-24') },
    { memberId: 5, at: noon('2026-12-05') },
    { memberId: 5, at: noon('2026-12-06') },
    { memberId: 5, at: '2026-12-13T18:00:00.001Z' }, // 7 days and 1 ms after member 5's nudge
    { memberId: 6, at: noon('2027-01-02') },
    { memberId: 7, at: noon('2026-09-16') },
    { memberId: 7, at: noon('2026-09-17') },
    { memberId: 7, at: noon('2026-10-08') },
    { memberId: 7, at: noon('2026-11-10') },
    { memberId: 7, at: noon('2026-12-12') },
  ],
  nudges: [
    { memberId: 2, sentAt: '2026-11-23T05:30:00.000Z' }, // check-in exactly 7 days later: came back
    { memberId: 3, sentAt: '2026-11-24T05:30:00.000Z' }, // check-in exactly 7 days later: came back
    { memberId: 4, sentAt: noon('2026-12-10') }, // no check-in
    { memberId: 5, sentAt: noon('2026-12-06') }, // check-in 1 ms too late, and one before it
    { memberId: 1, sentAt: '2027-01-03T21:00:00.000Z' }, // after `now`
    { memberId: 7, sentAt: noon('2026-10-05') }, // 90 days ago: outside
    { memberId: 7, sentAt: noon('2026-10-06') }, // 89 days ago: inside, came back on 8 Oct
  ],
}

test('FR-REPORT-01 cohorts by joining month, in the gym time zone, across the year end', () => {
  expect(buildReports({ ...DATA, timeZone: 'America/Chicago' }).cohorts).toEqual([
    { month: '2026-10', joined: 2, day30: 100, day60: 50, day90: 100 },
    { month: '2026-11', joined: 2, day30: 50, day60: 100, day90: null },
    { month: '2026-12', joined: 1, day30: null, day60: null, day90: null },
    { month: '2027-01', joined: 1, day30: null, day60: null, day90: null },
  ])
})

test('FR-REPORT-03 the late-evening check-ins fall on another day in UTC, which changes day30', () => {
  expect(buildReports({ ...DATA, timeZone: 'UTC' }).cohorts.map((c) => c.day30)).toEqual([50, 0, null, null])
})

test('FR-REPORT-01 visitsByWeek: mean visits per finished week, still coming vs slipped', () => {
  expect(buildReports({ ...DATA, timeZone: 'America/Chicago' }).visitsByWeek).toEqual([
    { week: 1, stillComing: 0, slipped: 1 },
    { week: 2, stillComing: 0, slipped: 0.3 },
    { week: 3, stillComing: 0, slipped: 0 },
    { week: 4, stillComing: 0.5, slipped: 0.3 },
    { week: 5, stillComing: 0.5, slipped: 0.5 },
    { week: 6, stillComing: 0, slipped: 0 },
    { week: 7, stillComing: 0, slipped: 0 },
    { week: 8, stillComing: 1, slipped: 0 },
    { week: 9, stillComing: 0, slipped: 0.5 },
    { week: 10, stillComing: 0, slipped: 0 },
    { week: 11, stillComing: 0, slipped: 0 },
    { week: 12, stillComing: 0, slipped: 0 },
    { week: 13, stillComing: 1.2, slipped: 1.2 }, // one visit in six days, read as a 7-day week
  ])
})

test('FR-NUDGE-07 nudges in the last 90 days up to now, and how many came back within 7 days', () => {
  expect(buildReports({ ...DATA, timeZone: 'America/Chicago' }).nudges).toEqual({
    sent: 5,
    cameBack: 3,
    waiting: 0,
    rate: 60,
  })
})

test('FR-REPORT-01 without now, a nudge later today still counts', () => {
  expect(buildReports({ ...DATA, now: undefined, timeZone: 'America/Chicago' }).nudges).toEqual({
    sent: 6,
    cameBack: 3,
    waiting: 1,
    rate: 60,
  })
})

test('FR-REPORT-01 no data: four empty cohorts back across the year, null averages and rate', () => {
  const r = buildReports({
    today: '2026-03-15',
    now: null,
    timeZone: 'UTC',
    pilotStartedOn: '2025-12-01',
    members: [],
    checkins: [],
    nudges: [],
  })
  expect(r.cohorts).toEqual(
    ['2025-12', '2026-01', '2026-02', '2026-03'].map((month) => ({
      month,
      joined: 0,
      day30: null,
      day60: null,
      day90: null,
    })),
  )
  expect(r.visitsByWeek).toHaveLength(13)
  expect(r.visitsByWeek.every((w) => w.stillComing === null && w.slipped === null)).toBe(true)
  expect(r.nudges).toEqual({ sent: 0, cameBack: 0, waiting: 0, rate: null })
})

test('FR-REPORT-01 the visits chart carries the line at 3 a week', () => {
  expect(REPORTS_LINE).toBe(3)
  expect(buildReports({ ...DATA, timeZone: 'America/Chicago' }).line).toBe(3)
})

// Ported from legacy/app/server/reports/test/reports.test.mjs.
const TZ = 'America/Chicago'
// Local noon-ish UTC instant for a local date (same calendar day in Chicago in all fixtures).
const at = (ymd: string): string => `${ymd}T17:00:00Z`
const run = (o: Partial<ReportsInput> & Pick<ReportsInput, 'today'>) =>
  buildReports({ timeZone: TZ, pilotStartedOn: '2026-01-01', members: [], checkins: [], nudges: [], ...o })

const cohortFixture = () => {
  const members = [
    { id: 1, joinedOn: '2026-08-01' }, // 97 days
    { id: 2, joinedOn: '2026-08-20' }, // 78 days
    { id: 3, joinedOn: '2026-09-10' }, // 57 days
    { id: 4, joinedOn: '2026-10-30' }, // 7 days
    { id: 5, joinedOn: '2026-07-31' }, // outside the 4 months
  ]
  const checkins = [
    { memberId: 1, at: at('2026-08-26') }, // day 25: inside the day-30 window 23..29
    { memberId: 1, at: at('2026-09-23') }, // day 53: in 60's window 53..59
    { memberId: 2, at: at('2026-09-11') }, // day 22: just before the day-30 window
    { memberId: 2, at: at('2026-09-19') }, // day 30: just after the day-30 window
    { memberId: 2, at: at('2026-10-14') }, // day 55 (twice, same day)
    { memberId: 2, at: '2026-10-14T23:00:00Z' },
    { memberId: 3, at: at('2026-10-03') }, // day 23: first day of the window
    { memberId: 5, at: at('2026-08-30') },
  ]
  return { members, checkins }
}

test('FR-REPORT-01 cohorts: joined, day30/60/90 percentages and nulls', () => {
  const r = run({ today: '2026-11-06', ...cohortFixture() })
  expect(r.cohorts).toEqual([
    { month: '2026-08', joined: 2, day30: 50, day60: 100, day90: 0 }, // day90: only member 1 reached it, no visit in 83..89
    { month: '2026-09', joined: 1, day30: 100, day60: null, day90: null },
    { month: '2026-10', joined: 1, day30: null, day60: null, day90: null },
    { month: '2026-11', joined: 0, day30: null, day60: null, day90: null },
  ])
})

test('FR-REPORT-01 cohorts: percentage is rounded to an integer', () => {
  const members = [1, 2, 3].map((id) => ({ id, joinedOn: '2026-10-01' })) // 36 days
  const checkins = [{ memberId: 1, at: at('2026-10-27') }] // day 26
  const r = run({ today: '2026-11-06', members, checkins })
  expect(r.cohorts[2]?.day30).toBe(33)
})

test('FR-REPORT-03 cohorts: dates use gym-local time across the 2026-11-01 DST change in America/Chicago', () => {
  const members = [
    { id: 1, joinedOn: '2026-11-01' }, // 34 days at 2026-12-05
    { id: 2, joinedOn: '2026-11-01' },
    { id: 3, joinedOn: '2026-10-31' },
    { id: 4, joinedOn: '2026-12-01' },
  ]
  const checkins = [
    // 2026-12-01T05:30Z = Nov 30 23:30 CST = day 29 local (a hit); in UTC it would be day 30 (a miss)
    { memberId: 1, at: '2026-12-01T05:30:00Z' },
    // 2026-12-02T05:30Z = Dec 1 23:30 CST = day 30 local (a miss)
    { memberId: 2, at: '2026-12-02T05:30:00Z' },
    // 2026-11-01T04:30Z = Oct 31 23:30 CDT: day 0 of member 3, so no day-30 visit
    { memberId: 3, at: '2026-11-01T04:30:00Z' },
  ]
  const r = run({ today: '2026-12-05', members, checkins })
  expect(r.cohorts.map((c) => c.month)).toEqual(['2026-09', '2026-10', '2026-11', '2026-12'])
  expect(r.cohorts[1]).toEqual({ month: '2026-10', joined: 1, day30: 0, day60: null, day90: null })
  expect(r.cohorts[2]).toEqual({ month: '2026-11', joined: 2, day30: 50, day60: null, day90: null })
  expect(r.cohorts[3]).toEqual({ month: '2026-12', joined: 1, day30: null, day60: null, day90: null })
})

test('FR-REPORT-03 visitsByWeek: 23:30 CDT Oct 31 and 00:30 CDT Nov 1 are different local days', () => {
  const members = [{ id: 1, joinedOn: '2026-10-31' }]
  const checkins = [
    { memberId: 1, at: '2026-11-01T04:30:00Z' }, // Oct 31 23:30 CDT, day 0
    { memberId: 1, at: '2026-11-01T05:30:00Z' }, // Nov 1 00:30 CDT, day 1 (same UTC day)
  ]
  const r = run({ today: '2026-11-20', members, checkins })
  expect(r.visitsByWeek[0]).toEqual({ week: 1, stillComing: null, slipped: 2 })
})

test('FR-REPORT-01 nudges: a nudge sent after now is ignored', () => {
  const r = run({
    today: '2026-11-06',
    now: '2026-11-06T12:00:00Z',
    nudges: [{ memberId: 1, sentAt: '2026-11-06T13:00:00Z' }],
  })
  expect(r.nudges).toEqual({ sent: 0, cameBack: 0, waiting: 0, rate: null })
})

const weekFixture = () => {
  const members = [
    { id: 1, joinedOn: '2026-10-01' }, // 36 days
    { id: 2, joinedOn: '2026-10-01' }, // 36 days
    { id: 3, joinedOn: '2026-10-20' }, // 17 days
    { id: 13, joinedOn: '2026-07-01' }, // 128 days, older than 90
    { id: 14, joinedOn: '2026-08-08' }, // exactly 90 days: week 13 just finished
    { id: 15, joinedOn: '2026-08-09' }, // 89 days: week 13 not finished
  ]
  const v = (memberId: number, ...days: string[]) => days.map((d) => ({ memberId, at: at(d) }))
  const checkins = [
    ...v(1, '2026-10-01', '2026-10-01', '2026-10-03', '2026-10-09', '2026-10-30'), // day 0 twice, 2, 8, 29
    ...v(2, '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06'), // days 1,3,4,5 (last visit 31 days ago)
    ...v(3, '2026-10-21', '2026-11-02'), // days 1, 13
    ...v(13, '2026-09-23', '2026-09-28', '2026-09-29'), // days 84, 89, 90 (day 90 is outside week 13)
    ...v(14, '2026-11-05'), // day 89
  ]
  return { members, checkins }
}

test('FR-REPORT-01 visitsByWeek: groups, finished weeks, duplicates, week 13', () => {
  const r = run({ today: '2026-11-06', ...weekFixture() })
  const w = r.visitsByWeek
  expect(w).toHaveLength(13)
  expect(w.map((x) => x.week)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  expect(w[0]).toEqual({ week: 1, stillComing: 1.0, slipped: 1.3 }) // still: 2,1,0 / slipped: 4,0,0
  expect(w[1]).toEqual({ week: 2, stillComing: 0.7, slipped: 0 })
  expect(w[2]).toEqual({ week: 3, stillComing: 0, slipped: 0 }) // member 3 has not yet finished week 3
  expect(w[3]).toEqual({ week: 4, stillComing: 0, slipped: 0 })
  expect(w[4]).toEqual({ week: 5, stillComing: 0.5, slipped: 0 }) // member 1 finished week 5 (35 <= 36), 1 visit
  expect(w[5]).toEqual({ week: 6, stillComing: 0, slipped: 0 }) // member 1 has not finished week 6
  expect(w[11]).toEqual({ week: 12, stillComing: 0, slipped: 0 }) // member 15 (89 days) finished week 12
  expect(w[12]).toEqual({ week: 13, stillComing: 1.2, slipped: 2.3 }) // 14 / 13 times 7/6; 15 not finished; day 90 not counted
})

test('FR-REPORT-01 visitsByWeek: a group with nobody in it is null; stillComing boundary is 13 days', () => {
  const members = [
    { id: 1, joinedOn: '2026-09-01' },
    { id: 2, joinedOn: '2026-09-01' },
  ]
  const checkins = [
    { memberId: 1, at: at('2026-09-02') },
    { memberId: 1, at: at('2026-10-24') }, // 13 days before today: still coming
    { memberId: 2, at: at('2026-09-03') },
    { memberId: 2, at: at('2026-10-23') }, // 14 days before today: slipped
  ]
  const r = run({ today: '2026-11-06', members, checkins })
  expect(r.visitsByWeek[0]).toEqual({ week: 1, stillComing: 1, slipped: 1 })
  expect(r.visitsByWeek[7]).toEqual({ week: 8, stillComing: 1, slipped: 1 }) // days 53 and 52 fall in week 8 (days 49..55)
  const only = run({ today: '2026-11-06', members: members.slice(0, 1), checkins: checkins.slice(1, 2) })
  expect(only.visitsByWeek[0]?.slipped).toBeNull()
  expect(only.visitsByWeek[0]?.stillComing).toBe(0)
})

test('FR-NUDGE-07 nudges: exactly 7 days counts, 7 days + 1 minute does not, strictly after, 90-day window', () => {
  const nudges = [
    { memberId: 1, sentAt: '2026-10-10T15:00:00Z' }, // visit exactly 7 days later: counts
    { memberId: 2, sentAt: '2026-10-10T15:00:00Z' }, // visit 7 days + 1 minute: does not
    { memberId: 3, sentAt: '2026-10-12T15:00:00Z' }, // visit at the same instant and before: does not
    { memberId: 4, sentAt: '2026-10-12T15:00:00Z' }, // visit 1 minute later: counts
    { memberId: 5, sentAt: '2026-08-09T15:00:00Z' }, // 89 days ago: in the window, no visit
    { memberId: 6, sentAt: '2026-08-08T15:00:00Z' }, // 90 days ago: outside, even though a visit followed
  ]
  const checkins = [
    { memberId: 1, at: '2026-10-17T15:00:00Z' },
    { memberId: 2, at: '2026-10-17T15:01:00Z' },
    { memberId: 3, at: '2026-10-12T15:00:00Z' },
    { memberId: 3, at: '2026-10-12T14:00:00Z' },
    { memberId: 4, at: '2026-10-12T15:01:00Z' },
    { memberId: 4, at: '2026-10-13T15:01:00Z' }, // second visit does not double count
    { memberId: 6, at: '2026-08-09T15:00:00Z' },
  ]
  const r = run({ today: '2026-11-06', now: '2026-11-06T18:00:00Z', nudges, checkins })
  expect(r.nudges).toEqual({ sent: 5, cameBack: 2, waiting: 0, rate: 40 })
})

test('FR-REPORT-01 cohorts: day N window is N-7..N-1 and requires having reached day N', () => {
  const members = [
    { id: 1, joinedOn: '2026-10-07' },
    { id: 2, joinedOn: '2026-10-07' },
  ] // 30 days at 2026-11-06
  const checkins = [
    { memberId: 1, at: at('2026-10-30') }, // day 23: hit
    { memberId: 2, at: at('2026-11-06') }, // day 30: outside
  ]
  expect(run({ today: '2026-11-06', members, checkins }).cohorts[2]?.day30).toBe(50)
  expect(run({ today: '2026-11-05', members, checkins: checkins.slice(0, 1) }).cohorts[2]?.day30).toBeNull() // day 29: not reached
})

// The old suite's follow-up: a gym far east of UTC, whose day starts while UTC's is still the day before.
test('FR-REPORT-03 Auckland: a nudge later today is left out with now, and counts at age 0 without it', () => {
  const nudges = [{ memberId: 1, sentAt: '2026-11-06T23:00:00Z' }] // 12:00 on 7 Nov in Auckland
  const base = { today: '2026-11-07', timeZone: 'Pacific/Auckland', nudges }
  expect(run({ ...base, now: '2026-11-06T20:00:00Z' }).nudges).toEqual({ sent: 0, cameBack: 0, waiting: 0, rate: null }) // 09:00 local
  expect(run(base).nudges).toEqual({ sent: 1, cameBack: 0, waiting: 1, rate: null })
})

test("FR-REPORT-03 Auckland: the 90-day window counts nudges by the gym's dates, not UTC's", () => {
  // 12:30Z on 9 Aug is 00:30 on 10 Aug in Auckland (NZST, +12): 89 days before 7 Nov there, 90 in UTC.
  const nudges = [{ memberId: 1, sentAt: '2026-08-09T12:30:00Z' }]
  const base = { today: '2026-11-07', now: '2026-11-06T20:00:00Z', nudges }
  expect(run({ ...base, timeZone: 'Pacific/Auckland' }).nudges.sent).toBe(1)
  expect(run({ ...base, timeZone: 'UTC' }).nudges.sent).toBe(0)
})

test('FR-NUDGE-07 Reports count came back as 7 times 24 hours, also across the clock change', () => {
  // Nudged at 18:30 CDT on Sat 31 Oct 2026; clocks go back on 1 Nov, so 18:00 CST on Sat 7 Nov is 168.5 hours later.
  // The same pair a week earlier is 167.5 hours apart.
  const nudges = [
    { memberId: 1, sentAt: '2026-10-31T23:30:00Z' },
    { memberId: 2, sentAt: '2026-10-24T23:30:00Z' },
  ]
  const checkins = [
    { memberId: 1, at: '2026-11-08T00:00:00Z' },
    { memberId: 2, at: '2026-10-31T23:00:00Z' },
  ]
  const r = run({ today: '2026-11-08', now: '2026-11-08T18:00:00Z', nudges, checkins })
  expect(r.nudges).toEqual({ sent: 2, cameBack: 1, waiting: 0, rate: 50 })
})

test('FR-REPORT-01 nudges: the rate leaves out a nudge still inside its 7 days, and waiting is counted', () => {
  const nudges = [
    { memberId: 1, sentAt: '2026-11-04T15:00:00Z' }, // 2 days ago, no visit yet: waiting
    { memberId: 2, sentAt: '2026-10-20T15:00:00Z' }, // visit 2 days later: came back
    { memberId: 3, sentAt: '2026-10-20T15:00:00Z' }, // no visit: no visit
  ]
  const checkins = [{ memberId: 2, at: '2026-10-22T15:00:00Z' }]
  const r = run({ today: '2026-11-06', now: '2026-11-06T18:00:00Z', nudges, checkins })
  expect(r.nudges).toEqual({ sent: 3, cameBack: 1, waiting: 1, rate: 50 })
})

test('FR-REPORT-01 nudges: only waiting nudges give no rate', () => {
  const r = run({
    today: '2026-11-06',
    now: '2026-11-06T18:00:00Z',
    nudges: [{ memberId: 1, sentAt: '2026-11-05T15:00:00Z' }],
  })
  expect(r.nudges).toEqual({ sent: 1, cameBack: 0, waiting: 1, rate: null })
})

test('FR-REPORT-01 visitsByWeek: week 13 has six days, so a daily visitor reads 7.0 there, as in every other week', () => {
  const members = [{ id: 1, joinedOn: '2026-08-01' }] // 97 days at 2026-11-06
  const checkins = Array.from({ length: 90 }, (_, d) => ({ memberId: 1, at: at(addDays('2026-08-01', d)) }))
  const w = run({ today: '2026-11-06', members, checkins }).visitsByWeek
  expect(w[11]?.stillComing).toBe(7)
  expect(w[12]).toEqual({ week: 13, stillComing: 7, slipped: null })
})

test("FR-REPORT-01 cohorts start at the gym's first month: the pilot start, or an earlier member's join month", () => {
  const base = { today: '2026-11-06' }
  const months = (o: Partial<ReportsInput>) => run({ ...base, ...o }).cohorts.map((c) => [c.month, c.joined])
  expect(months({ pilotStartedOn: '2026-10-14' })).toEqual([
    ['2026-10', 0],
    ['2026-11', 0],
  ])
  expect(months({ pilotStartedOn: '2026-11-02' })).toEqual([['2026-11', 0]])
  expect(months({ pilotStartedOn: '2026-10-14', members: [{ id: 1, joinedOn: '2026-09-20' }] })).toEqual([
    ['2026-09', 1],
    ['2026-10', 0],
    ['2026-11', 0],
  ])
  expect(months({ pilotStartedOn: '2026-10-14', members: [{ id: 1, joinedOn: '2026-11-03' }] })).toEqual([
    ['2026-10', 0],
    ['2026-11', 1],
  ])
  expect(months({ pilotStartedOn: '2025-01-01' }).map((m) => m[0])).toEqual([
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
  ])
})
