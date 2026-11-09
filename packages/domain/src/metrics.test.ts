import { expect, test } from 'vitest'
import { addDays, daysBetween, localDate } from './dates.ts'
import { buildSummaries, cameBack, kpis, paceOf, progress, shortName, STATUSES, statusOf } from './metrics.ts'
import type { MemberSummary } from './metrics.ts'
import { KIT, localNoon, TODAY, TZ } from './test-fixtures.ts'

/** progress() for a member built like the legacy fixture does it, without a DB. */
function pattern({ weeks, daysSinceJoin, current = 0, extra = [] }: { weeks: number[]; daysSinceJoin: number; current?: number; extra?: number[] }) {
  const joinedOn = addDays(TODAY, -daysSinceJoin)
  const days: number[] = []
  weeks.forEach((k, w) => {
    for (let i = 0; i < k; i++) days.push(w * 7 + i)
  })
  for (let i = 0; i < current; i++) days.push(Math.floor(daysSinceJoin / 7) * 7 + i)
  const checkinAts = [...days, ...extra].map((d) => localNoon(addDays(joinedOn, d)))
  return progress({ joinedOn, checkinAts, today: TODAY, timeZone: TZ })
}

test('kit samples: Maya on, Chris below, Hana and Sam slipping', () => {
  const expected = { maya: 'on', chris: 'below', hana: 'slipping', sam: 'slipping' } as const
  for (const [key, status] of Object.entries(expected)) {
    const k = KIT[key as keyof typeof KIT]
    const p = pattern(k)
    expect(p.status, key).toBe(status)
    expect(p.weeks, `${key} weeks[]`).toEqual([...k.weeks, k.current])
    expect(p.week, `${key} current week`).toBe(k.weeks.length)
  }
  expect(pattern(KIT.maya).pace).toBe(3.3)
})

test('a member with 1 finished week is new; with 0 finished weeks pace is null', () => {
  const one = pattern({ weeks: [0], daysSinceJoin: 10 })
  expect(one.status).toBe('new')
  expect(one.pace).toBe(0)
  const zero = pattern({ weeks: [], daysSinceJoin: 3, current: 2 })
  expect(zero.status).toBe('new')
  expect(zero.pace).toBeNull()
  expect(zero.weeks).toEqual([2])
})

test('status rules, first match wins', () => {
  expect(statusOf([1, 1])).toBe('slipping')
  expect(statusOf([4, 1, 0])).toBe('slipping')
  expect(statusOf([1, 2])).toBe('below')
  expect(statusOf([0, 3])).toBe('on')
  expect(statusOf([1])).toBe('new')
  expect(paceOf([3, 4, 3, 3])).toBe(3.3)
  expect(paceOf([2, 1])).toBe(1.5)
})

test('status rule 1, slipping: 2+ finished weeks and the last two each under 2 visits', () => {
  expect(statusOf([0, 0])).toBe('slipping')
  expect(statusOf([5, 5, 1, 1])).toBe('slipping')
  expect(statusOf([2, 1])).not.toBe('slipping') // 2 visits is not under 2
  expect(statusOf([1, 2])).not.toBe('slipping')
  expect(statusOf([1, 1, 2])).not.toBe('slipping') // only the last two weeks count
  expect(statusOf([0])).not.toBe('slipping') // one finished week is never slipping
})

test('status rule 2, new: fewer than 2 finished weeks, whatever the visits', () => {
  expect(statusOf([])).toBe('new')
  expect(statusOf([0])).toBe('new')
  expect(statusOf([7])).toBe('new')
  expect(statusOf([7, 7])).not.toBe('new')
})

test('status rule 3, on the line: the last finished week had 3 or more visits', () => {
  expect(statusOf([0, 3])).toBe('on')
  expect(statusOf([1, 3])).toBe('on') // the earlier week under 2 does not make it slipping
  expect(statusOf([3, 7])).toBe('on')
  expect(statusOf([3, 2])).not.toBe('on') // only the last week counts
})

test('status rule 4, below the line: everything else', () => {
  expect(statusOf([3, 2])).toBe('below')
  expect(statusOf([0, 2])).toBe('below')
  expect(statusOf([2, 1])).toBe('below')
  expect(statusOf([1, 1, 2])).toBe('below')
})

test('STATUSES lists the four codes statusOf returns', () => {
  expect(STATUSES).toEqual(['on', 'below', 'slipping', 'new'])
  for (const f of [[0, 3], [3, 2], [1, 1], []]) expect(STATUSES).toContain(statusOf(f))
})

test('several check-ins on one day count once', () => {
  const joinedOn = addDays(TODAY, -10)
  const d = addDays(joinedOn, 1)
  const p = progress({ joinedOn, checkinAts: [`${d}T13:00:00.000Z`, `${d}T18:00:00.000Z`, `${d}T23:00:00.000Z`], today: TODAY, timeZone: TZ })
  expect(p.weeks).toEqual([1, 0])
})

test('day index uses the gym timezone', () => {
  expect(localDate('2026-11-06T03:00:00.000Z', TZ)).toBe('2026-11-05')
  expect(localDate('2026-11-06T03:00:00.000Z', 'UTC')).toBe('2026-11-06')
  const joinedOn = '2026-11-01'
  // 02:00Z on Nov 3 is the evening of Nov 2 in Chicago: day 1, not day 2.
  const p = progress({ joinedOn, checkinAts: ['2026-11-03T02:00:00.000Z'], today: TODAY, timeZone: TZ })
  expect([...p.visitedDays]).toEqual([1])
  expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
})

test('check-ins from day 90 on do not count; week 12 is the last week', () => {
  const late = pattern({ weeks: Array<number>(12).fill(1), daysSinceJoin: 95, extra: [90, 91, 92] })
  expect(late.weeks.reduce((a, b) => a + b, 0)).toBe(12)
  const d89 = pattern({ weeks: Array<number>(12).fill(3), daysSinceJoin: 89 })
  expect(d89.week).toBe(12)
  expect(d89.weeks).toHaveLength(13)
})

test('days since last visit: null if never, else today minus the last visit', () => {
  expect(pattern({ weeks: [], daysSinceJoin: 3 }).daysSinceLastVisit).toBeNull()
  const p = pattern({ weeks: [3, 2], daysSinceJoin: 16 })
  expect(p.lastVisitOn).toBe(addDays(TODAY, -8)) // week 1 = days 7, 8
  expect(p.daysSinceLastVisit).toBe(8)
})

test('KPIs: newMembers, onTheLinePct over members with a finished week, slipping, nudgedThisWeek', () => {
  const s = (status: MemberSummary['status'], daysSinceJoin: number) => ({ status, daysSinceJoin, weeks: [] })
  const k = kpis([s('on', 30), s('on', 20), s('below', 40), s('slipping', 50), s('new', 3), s('new', 10)], 4)
  expect(k).toEqual({ newMembers: 6, onTheLinePct: 40, slipping: 1, nudgedThisWeek: 4 })
  expect(kpis([s('new', 2)], 0)).toEqual({ newMembers: 1, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 })
})

test('came back: a check-in within 7 days after the nudge', () => {
  const sent = '2026-11-01T18:00:00.000Z'
  expect(cameBack(sent, ['2026-11-08T17:59:00.000Z'])).toBe(true)
  expect(cameBack(sent, ['2026-11-08T18:01:00.000Z'])).toBe(false)
  expect(cameBack(sent, ['2026-10-31T18:00:00.000Z'])).toBe(false)
})

test('came back at exactly 7 days counts; 1 ms later or at the moment of sending does not', () => {
  const sent = '2026-11-01T18:00:00.000Z' // the week spans the DST change: 7 days is still 168 hours
  expect(cameBack(sent, ['2026-11-08T18:00:00.000Z'])).toBe(true)
  expect(cameBack(sent, ['2026-11-08T18:00:00.001Z'])).toBe(false)
  expect(cameBack(sent, [sent])).toBe(false)
  expect(cameBack(sent, [])).toBe(false)
  expect(cameBack(sent, ['2026-11-20T00:00:00.000Z', '2026-11-02T09:00:00.000Z'])).toBe(true)
})

test('shortName: first name and last initial', () => {
  expect(shortName('Sam', 'ortiz')).toBe('Sam O.')
  expect(shortName('Sam', '  Ortiz ')).toBe('Sam O.')
  expect(shortName('Sam', '')).toBe('Sam')
  expect(shortName('Sam', null)).toBe('Sam')
  expect(shortName('Sam', '   ')).toBe('Sam')
})

test('buildSummaries: one MemberSummary per member, with coach, latest nudge and progress', () => {
  const joinedOn = addDays(TODAY, -KIT.sam.daysSinceJoin)
  const days = [0, 1, 7, 21]
  const summaries = buildSummaries({
    members: [
      { id: 1, firstName: 'Sam', lastName: 'Ortiz', phone: '+13125550100', coachId: 10, joinedOn },
      { id: 2, firstName: 'Leo', lastName: null, phone: null, coachId: null, joinedOn: TODAY },
    ],
    checkins: days.map((d) => ({ memberId: 1, at: localNoon(addDays(joinedOn, d)) })),
    users: [{ id: 10, name: 'Priya S.' }],
    lastNudges: [{ memberId: 1, sentAt: '2026-11-02T15:00:00.000Z' }],
    today: TODAY,
    timeZone: TZ,
  })
  expect(summaries).toEqual([
    {
      id: 1, firstName: 'Sam', lastName: 'Ortiz', name: 'Sam O.', phone: '+13125550100', coachId: 10, coachName: 'Priya S.',
      joinedOn, daysSinceJoin: 24, week: 3, weeks: [2, 1, 0, 1], pace: 1, status: 'slipping',
      lastVisitOn: addDays(joinedOn, 21), daysSinceLastVisit: 3, lastNudgeAt: '2026-11-02T15:00:00.000Z',
    },
    {
      id: 2, firstName: 'Leo', lastName: '', name: 'Leo', phone: null, coachId: null, coachName: null,
      joinedOn: TODAY, daysSinceJoin: 0, week: 0, weeks: [0], pace: null, status: 'new',
      lastVisitOn: null, daysSinceLastVisit: null, lastNudgeAt: null,
    },
  ])
})
