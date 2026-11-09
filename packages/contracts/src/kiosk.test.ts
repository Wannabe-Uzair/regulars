import type { KioskSearchHit as DomainKioskSearchHit, KioskWelcome as DomainKioskWelcome } from '@tenure/domain'
import { describe, expect, expectTypeOf, test } from 'vitest'
import {
  KioskCheckinRequest,
  KioskGymResponse,
  KioskJoinRequest,
  KioskSearchHit,
  KioskSearchResponse,
  KioskWelcome,
} from './kiosk.ts'

/** The parsed value, or the first issue's message (an ErrorCode). */
const outcome = (schema: typeof KioskCheckinRequest | typeof KioskJoinRequest, body: unknown) => {
  const r = schema.safeParse(body)
  return r.success ? r.data : r.error.issues[0]?.message
}

describe('KioskCheckinRequest', () => {
  test.each([
    [{ memberId: 7 }, { memberId: 7 }],
    [{ memberId: 7, phone: '312' }, { memberId: 7 }],
    [{ memberId: null, phone: '(312) 555-0142' }, { phone: '(312) 555-0142' }],
    [{ phone: '(312) 555-0142' }, { phone: '(312) 555-0142' }],
    [{ phone: '' }, { phone: '' }],
    [{ memberId: 'abc' }, 'memberNotFound'],
    [{ memberId: '12' }, 'memberNotFound'],
    [{ memberId: 0 }, 'memberNotFound'],
    [{ memberId: 1.5 }, 'memberNotFound'],
    [{ phone: 'x'.repeat(41) }, 'phone'],
    [{ phone: 3125550142 }, 'generic'],
    [{}, 'generic'],
  ])('FR-KIOSK-02 a member id wins, else a phone as typed: %j gives %j', (body, expected) => {
    expect(outcome(KioskCheckinRequest, body)).toEqual(expected)
  })
})

describe('KioskJoinRequest', () => {
  test.each([
    [{ firstName: ' Zed ' }, { firstName: 'Zed', lastName: null, phone: null }],
    [{ firstName: 'Yan', lastName: ' Lee ' }, { firstName: 'Yan', lastName: 'Lee', phone: null }],
    [{ firstName: 'Yan', lastName: '   ' }, { firstName: 'Yan', lastName: null, phone: null }],
    [{ firstName: 'Yan', lastName: null }, { firstName: 'Yan', lastName: null, phone: null }],
    [{ firstName: 'Al', phone: '' }, { firstName: 'Al', lastName: null, phone: null }],
    [{ firstName: 'Al', phone: '   ' }, { firstName: 'Al', lastName: null, phone: null }],
    [{ firstName: 'Al', phone: null }, { firstName: 'Al', lastName: null, phone: null }],
    [{ firstName: 'Al', phone: ' (312) 555-0177 ' }, { firstName: 'Al', lastName: null, phone: '(312) 555-0177' }],
    [{ firstName: 'Mary  Ann', lastName: 'de  la Cruz' }, { firstName: 'Mary Ann', lastName: 'de la Cruz', phone: null }],
    [{}, 'kioskFirstName'],
    [{ firstName: ' ' }, 'kioskFirstName'],
    [{ firstName: 5 }, 'kioskFirstName'],
    [{ firstName: 'x'.repeat(41) }, 'kioskFirstName'],
    [{ firstName: 'Al', lastName: 5 }, 'generic'],
    [{ firstName: 'Al', lastName: 'x'.repeat(41) }, 'generic'],
    [{ firstName: 'Al', phone: 5 }, 'phone'],
    [{ firstName: 'Al', phone: 'x'.repeat(41) }, 'phone'],
    [{ firstName: '', lastName: 5 }, 'kioskFirstName'],
  ])('FR-KIOSK-04 a first name is required, and a blank last name or phone is none: %j gives %j', (body, expected) => {
    expect(outcome(KioskJoinRequest, body)).toEqual(expected)
  })

  test('FR-KIOSK-04 a name typed with a combining accent is stored composed', () => {
    expect(KioskJoinRequest.parse({ firstName: 'José' }).firstName).toBe('José')
  })

  test('FR-KIOSK-04 a 40-character first name is taken', () => {
    expect(KioskJoinRequest.parse({ firstName: 'x'.repeat(40) }).firstName).toHaveLength(40)
  })
})

describe('KioskWelcome', () => {
  const sam = {
    firstName: 'Sam',
    greeting: 'back',
    week: 3,
    weekNumber: 4,
    day: 24,
    visitsThisWeek: 2,
    visitsLine: 'visits',
    status: 'slipping',
  }

  test('FR-KIOSK-05 carries what the welcome says, a negative day included', () => {
    expect(KioskWelcome.parse(sam)).toEqual(sam)
    expect(KioskWelcome.safeParse({ ...sam, day: -3, week: 0, weekNumber: 1 }).success).toBe(true)
  })

  test.each([
    ['week 13', { week: 13 }],
    ['week number 14', { weekNumber: 14 }],
    ['8 visits in a week', { visitsThisWeek: 8 }],
    ['an unknown status', { status: 'gone' }],
    ['an unknown greeting', { greeting: 'hello' }],
    ['an unknown visits line', { visitsLine: 'many' }],
  ])('FR-KIOSK-05 rejects %s', (_, patch) => {
    expect(KioskWelcome.safeParse({ ...sam, ...patch }).success).toBe(false)
  })
})

describe('the search and the gym', () => {
  test('FR-KIOSK-02 at most 6 hits of {memberId, name}', () => {
    const hits = Array.from({ length: 7 }, (_, i) => ({ memberId: i + 1, name: 'Sam O.' }))
    expect(KioskSearchResponse.safeParse(hits.slice(0, 6)).success).toBe(true)
    expect(KioskSearchResponse.safeParse(hits).success).toBe(false)
  })

  test("FR-KIOSK-01 the gym call is the gym's name, whether it is the demo, and its country", () => {
    expect(KioskGymResponse.safeParse({ gymName: 'Northside', isDemo: false, country: 'GB' }).success).toBe(true)
    expect(KioskGymResponse.safeParse({ gymName: 'Northside', isDemo: false }).success).toBe(false)
  })

  test('the wire types equal the domain types', () => {
    expectTypeOf<KioskWelcome>().toEqualTypeOf<DomainKioskWelcome>()
    expectTypeOf<KioskSearchHit>().toEqualTypeOf<DomainKioskSearchHit>()
  })
})
