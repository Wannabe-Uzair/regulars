import { describe, expect, test } from 'vitest'
import {
  coachOptions,
  filterMembers,
  type FilterableMember,
  isFiltered,
  isStatusFilter,
  matchesSearch,
  NO_COACH,
  offeredCoach,
  STATUS_FILTERS,
} from './filters.ts'

type Row = FilterableMember & { id: number; coachName: string | null }

const row = (id: number, over: Partial<Row> = {}): Row => ({
  id,
  firstName: 'Sam',
  lastName: 'Ortiz',
  phone: null,
  status: 'on',
  coachId: 2,
  coachName: 'Priya S.',
  ...over,
})

describe('the search', () => {
  test('FR-MEM-02 the search folds case and accents on both sides, inside "first last"', () => {
    const jose = row(1, { firstName: 'José', lastName: 'Núñez' })
    expect(matchesSearch(jose, 'jose')).toBe(true)
    expect(matchesSearch(jose, 'JOSÉ NUÑ')).toBe(true)
    expect(matchesSearch(jose, 'se nu')).toBe(true) // across the space between the names
    expect(matchesSearch(jose, '  jose   nunez ')).toBe(true) // spaces trimmed and collapsed
    expect(matchesSearch(row(2, { firstName: 'jose', lastName: '' }), 'José')).toBe(true)
    expect(matchesSearch(jose, 'maria')).toBe(false)
  })

  test('FR-GLOBAL-04 a single name is searched alone, with an empty or missing last name', () => {
    expect(matchesSearch(row(1, { firstName: 'Leo', lastName: '' }), 'leo')).toBe(true)
    expect(matchesSearch(row(1, { firstName: 'Leo', lastName: null }), 'leo')).toBe(true)
    expect(matchesSearch(row(1, { firstName: 'Leo', lastName: null }), 'leo ')).toBe(true)
    expect(matchesSearch(row(1, { firstName: 'Leo', lastName: null }), 'null')).toBe(false)
  })

  test('FR-MEM-02 a digit query drops its leading zeros and finds the phone from 3 digits', () => {
    const pk = row(1, { firstName: 'Ayesha', lastName: 'Khan', phone: '+923001234567' })
    const uk = row(2, { firstName: 'Tom', lastName: 'Hart', phone: '+447911123456' })
    const us = row(3, { firstName: 'Dave', lastName: 'Kim', phone: '+13125550142' })
    expect(matchesSearch(pk, '0300 123')).toBe(true) // the national form typed at a Lahore desk
    expect(matchesSearch(pk, '0300-1234567')).toBe(true)
    expect(matchesSearch(uk, '07911 123456')).toBe(true)
    expect(matchesSearch(uk, '00 44 7911')).toBe(true)
    expect(matchesSearch(uk, '+44 7911')).toBe(true)
    expect(matchesSearch(us, '(312) 555')).toBe(true)
    expect(matchesSearch(us, '555-0142')).toBe(true)
    expect(matchesSearch(us, '0142')).toBe(true) // the zero dropped, '142' is still inside it
    expect(matchesSearch(us, '0999')).toBe(false)
    expect(matchesSearch(us, '012')).toBe(false) // two digits left after the zero
    expect(matchesSearch(us, '31')).toBe(false)
    expect(matchesSearch(row(4, { phone: null }), '312 555')).toBe(false) // no phone at all
  })

  test('FR-MEM-02 a blank search finds everyone', () => {
    expect(matchesSearch(row(1), '')).toBe(true)
    expect(matchesSearch(row(1), '   ')).toBe(true)
  })
})

describe('the filter', () => {
  const sam = row(1, { status: 'slipping', coachId: 2 })
  const ana = row(2, { firstName: 'Ana', lastName: 'Bell', status: 'new', coachId: 3, coachName: 'Mike T.' })
  const zoe = row(3, { firstName: 'Zoë', lastName: 'King', status: 'slipping', coachId: null, coachName: null })
  const lee = row(4, { firstName: 'Lee', lastName: 'Park', status: 'on', coachId: 2, phone: '+13125550142' })
  const list = [sam, ana, zoe, lee]
  const ids = (rows: readonly Row[]) => rows.map((r) => r.id)

  test('FR-MEM-02 the status chips are All, then Slipping, New, On the line and Below the line', () => {
    expect(STATUS_FILTERS).toEqual(['all', 'slipping', 'new', 'on', 'below'])
    expect(isStatusFilter('slipping')).toBe(true)
    expect(isStatusFilter('archived')).toBe(false)
    expect(isStatusFilter(undefined)).toBe(false)
  })

  test("FR-MEM-02 the status, the coach and the search apply together, keeping the list's order", () => {
    expect(ids(filterMembers(list, {}))).toEqual([1, 2, 3, 4])
    expect(ids(filterMembers(list, { status: 'all' }))).toEqual([1, 2, 3, 4])
    expect(ids(filterMembers(list, { status: 'slipping' }))).toEqual([1, 3])
    expect(ids(filterMembers(list, { coach: 2 }))).toEqual([1, 4])
    expect(ids(filterMembers(list, { status: 'slipping', coach: 2 }))).toEqual([1])
    expect(ids(filterMembers(list, { coach: 2, q: '312 555' }))).toEqual([4])
    expect(ids(filterMembers(list, { q: 'zoe' }))).toEqual([3])
    expect(ids(filterMembers(list, { status: 'below' }))).toEqual([])
    // The caller's own rows come back, not copies.
    expect(filterMembers(list, { coach: 3 })[0]).toBe(ana)
  })

  test('FR-MEM-02 the status chips match members in their first 90 days only; from day 90 only All keeps them', () => {
    const day89 = row(5, { status: 'slipping', daysSinceJoin: 89 })
    const day90 = row(6, { status: 'slipping', daysSinceJoin: 90 })
    const day200 = row(7, { status: 'on', daysSinceJoin: 200 })
    const past = [day89, day90, day200]
    expect(ids(filterMembers(past, { status: 'slipping' }))).toEqual([5])
    expect(ids(filterMembers(past, { status: 'on' }))).toEqual([])
    expect(ids(filterMembers(past, { status: 'all' }))).toEqual([5, 6, 7])
    // The search and the coach filter still find them.
    expect(ids(filterMembers(past, { coach: 2, q: 'sam' }))).toEqual([5, 6, 7])
  })

  test('FR-MEM-02 the coach filter finds the members with no coach, and a coach id only that coach', () => {
    expect(ids(filterMembers(list, { coach: NO_COACH }))).toEqual([3])
    expect(ids(filterMembers(list, { coach: 3 }))).toEqual([2])
    expect(ids(filterMembers(list, { coach: 99 }))).toEqual([])
  })

  test('FR-MEM-02 a filter is set when a status, a coach or a non-blank search narrows the list', () => {
    expect(isFiltered({})).toBe(false)
    expect(isFiltered({ status: 'all', q: '  ' })).toBe(false)
    expect(isFiltered({ status: 'new' })).toBe(true)
    expect(isFiltered({ coach: NO_COACH })).toBe(true)
    expect(isFiltered({ q: 'sam' })).toBe(true)
  })
})

describe("the owner's coach choices", () => {
  test('FR-MEM-02 the coach choices come from the members given: each coach once, by name, then no coach', () => {
    const members = [
      { coachId: 3, coachName: 'Mike T.' },
      { coachId: 2, coachName: 'priya S.' },
      { coachId: 3, coachName: 'Mike T.' },
      { coachId: 5, coachName: 'Ángel R.' },
      { coachId: 7, coachName: null }, // a coach the staff list can't name
    ]
    expect(coachOptions(members, 'en-US')).toEqual({
      coaches: [
        { id: 5, name: 'Ángel R.' },
        { id: 3, name: 'Mike T.' },
        { id: 2, name: 'priya S.' },
      ],
      noCoach: false,
    })
    expect(coachOptions([...members, { coachId: null, coachName: null }], 'en-US').noCoach).toBe(true)
    expect(coachOptions([], 'en-GB')).toEqual({ coaches: [], noCoach: false })
  })

  test('FR-MEM-02 two coaches with one name are both offered, in id order', () => {
    const { coaches } = coachOptions(
      [
        { coachId: 9, coachName: 'Sam O.' },
        { coachId: 4, coachName: 'Sam O.' },
      ],
      'en-US',
    )
    expect(coaches.map((c) => c.id)).toEqual([4, 9])
  })

  test('FR-MEM-02 a coach filter the list no longer offers reads as all coaches', () => {
    const options = { coaches: [{ id: 2, name: 'Priya S.' }], noCoach: false }
    expect(offeredCoach(2, options)).toBe(2)
    expect(offeredCoach(3, options)).toBeUndefined()
    expect(offeredCoach(NO_COACH, options)).toBeUndefined()
    expect(offeredCoach(NO_COACH, { ...options, noCoach: true })).toBe(NO_COACH)
    expect(offeredCoach(undefined, options)).toBeUndefined()
  })
})
