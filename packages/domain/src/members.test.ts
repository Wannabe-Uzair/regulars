import { describe, expect, test } from 'vitest'
import { localeFor } from './locale.ts'
import { byMemberName, cleanName, first90Window, isCalendarDate, joinedByToday, memberDays } from './members.ts'
import { buildSummaries, inFirst90, shortName } from './metrics.ts'
import { TODAY, TZ } from './test-fixtures.ts'

const named = (id: number, firstName: string, lastName: string | null = null) => ({ id, firstName, lastName })
const sorted = (locale: string, list: ReturnType<typeof named>[]) =>
  [...list].sort(byMemberName(locale)).map((m) => [m.firstName, m.lastName ?? ''].join(' ').trim() || String(m.id))

describe('names', () => {
  test('FR-MEM-04 a name shows as "First L.", or a single name alone', () => {
    expect(shortName('Sam', 'Ortiz')).toBe('Sam O.')
    expect(shortName('Leo', null)).toBe('Leo')
    expect(shortName('Leo', '')).toBe('Leo')
    expect(shortName('Leo', '   ')).toBe('Leo')
    expect(shortName('ana', 'lópez')).toBe('ana L.')
  })

  test('FR-MEM-04 members sort by first name, then no last name first, then last name, then id', () => {
    const list = [named(1, 'Sam', 'Ortiz'), named(2, 'Sam'), named(3, 'Ana', 'Lee'), named(4, 'Leo'), named(5, 'Sam', 'Lee')]
    expect(sorted('en-US', list)).toEqual(['Ana Lee', 'Leo', 'Sam', 'Sam Lee', 'Sam Ortiz'])
    // A blank last name sorts as none.
    expect([named(7, 'Sam', 'Ortiz'), named(8, 'Sam', '')].sort(byMemberName('en-US')).map((m) => m.id)).toEqual([8, 7])
  })

  test("FR-MEM-04 members sort with the gym's locale: case and accents fall to the id, numbers count up", () => {
    expect([named(2, 'ana'), named(1, 'Ana')].sort(byMemberName('en-US')).map((m) => m.id)).toEqual([1, 2])
    expect([named(1, 'José'), named(2, 'Jose')].sort(byMemberName('en-US')).map((m) => m.id)).toEqual([1, 2])
    expect(sorted('en-US', [named(1, 'Sam 10'), named(2, 'Sam 2')])).toEqual(['Sam 2', 'Sam 10'])
    // Swedish puts Ö after Z; English beside O.
    expect(sorted('sv', [named(1, 'Örjan'), named(2, 'Zoe')])).toEqual(['Zoe', 'Örjan'])
    expect(sorted(localeFor('GB'), [named(1, 'Örjan'), named(2, 'Zoe')])).toEqual(['Örjan', 'Zoe'])
  })

  test('FR-MEM-05 a typed name is trimmed, its inner spaces collapsed and its accents composed', () => {
    expect(cleanName('  Mary   Ann ')).toBe('Mary Ann')
    expect(cleanName('José')).toBe('José')
    expect(cleanName('José')).toBe(cleanName('José'))
    expect(cleanName('   ')).toBe('')
  })
})

describe('the first 90 days', () => {
  test('FR-MEM-01 the first-90-days window is the join dates of days 0 to 89', () => {
    const { from, to } = first90Window(TODAY)
    expect([from, to]).toEqual(['2026-08-09', TODAY])
    const members = [
      { id: 1, firstName: 'Day', lastName: '89', phone: null, coachId: null, joinedOn: from },
      { id: 2, firstName: 'Day', lastName: '90', phone: null, coachId: null, joinedOn: '2026-08-08' },
    ]
    const days = buildSummaries({ members, checkins: [], users: [], today: TODAY, timeZone: TZ }).map((s) => s.daysSinceJoin)
    expect(days).toEqual([89, 90])
    expect(days.map(inFirst90)).toEqual([true, false])
  })

  test('FR-MEMBER-01 the member page has days 0 to 89, each visited at most once, by the gym date, up to today', () => {
    const joinedOn = '2026-10-01'
    const days = memberDays({
      joinedOn,
      checkinAts: [
        '2026-10-02T03:30:00.000Z', // 22:30 on 1 Oct in Chicago: day 0
        '2026-10-03T15:00:00.000Z', // day 2, twice
        '2026-10-03T23:00:00.000Z',
        '2026-11-07T15:00:00.000Z', // tomorrow: not yet
        '2026-09-30T15:00:00.000Z', // before joining
      ],
      today: TODAY,
      timeZone: TZ,
    })
    expect(days).toHaveLength(90)
    expect(days[0]).toEqual({ date: joinedOn, day: 0, visited: true })
    expect(days[89]).toEqual({ date: '2026-12-29', day: 89, visited: false })
    expect(days.filter((d) => d.visited).map((d) => d.day)).toEqual([0, 2])
  })

  test('FR-MEM-05 a join date is a real calendar date, today or earlier in the gym', () => {
    expect(isCalendarDate('2026-11-06')).toBe(true)
    expect(isCalendarDate('2024-02-29')).toBe(true)
    for (const bad of ['2026-02-31', '2025-02-29', '2026-13-01', '1899-12-31', '2026-1-1', '06/11/2026', '']) {
      expect(isCalendarDate(bad), bad).toBe(false)
    }
    expect(joinedByToday(TODAY, TODAY)).toBe(true)
    expect(joinedByToday('2020-01-01', TODAY)).toBe(true)
    expect(joinedByToday('2026-11-07', TODAY)).toBe(false)
  })
})
