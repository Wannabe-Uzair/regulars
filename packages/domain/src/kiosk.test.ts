import { describe, expect, test } from 'vitest'
import { addDays } from './dates.ts'
import { KIOSK_HITS, kioskSearch, type KioskSearchMember, kioskWelcome, nextKioskCoach } from './kiosk.ts'

const TODAY = '2026-11-06'
const TZ = 'America/Chicago'
/** Local noon in Chicago. */
const noon = (date: string) => `${date}T18:00:00.000Z`

/** A member who joined `daysSinceJoin` days ago and visited on the given day indexes, at local noon. */
const welcome = (daysSinceJoin: number, days: readonly number[], joined = false) => {
  const joinedOn = addDays(TODAY, -daysSinceJoin)
  return kioskWelcome({
    firstName: 'Sam',
    joinedOn,
    checkinAts: days.map((d) => noon(addDays(joinedOn, d))),
    today: TODAY,
    timeZone: TZ,
    joined,
  })
}

describe('kioskWelcome', () => {
  test('FR-KIOSK-05 Sam on day 24 (weeks 2, 1, 0, one visit this week, then today) is week 4, 2 visits, slipping', () => {
    expect(welcome(24, [0, 1, 7, 21, 24])).toEqual({
      firstName: 'Sam',
      greeting: 'back',
      week: 3,
      weekNumber: 4,
      day: 24,
      visitsThisWeek: 2,
      visitsLine: 'visits',
      status: 'slipping',
    })
  })

  test('FR-KIOSK-05 a join is the first visit: day 0, week 1, 1 visit, new', () => {
    expect(welcome(0, [0], true)).toEqual({
      firstName: 'Sam',
      greeting: 'first',
      week: 0,
      weekNumber: 1,
      day: 0,
      visitsThisWeek: 1,
      visitsLine: 'visit',
      status: 'new',
    })
  })

  test("FR-KIOSK-05 a staff-added member's only check-in on their join day is the first visit (KS12)", () => {
    expect(welcome(0, [0])).toMatchObject({ greeting: 'first', day: 0, weekNumber: 1, visitsThisWeek: 1 })
  })

  test('FR-KIOSK-05 a second check-in on the join day, or a first one later, says welcome back', () => {
    expect(welcome(0, [0, 0])).toMatchObject({ greeting: 'back', day: 0, weekNumber: 1 })
    expect(welcome(8, [8])).toMatchObject({ greeting: 'back', day: 8, weekNumber: 2 })
  })

  test('FR-KIOSK-05 days 84 to 89 are week 13; from day 90 the week is dropped and the visits line stays', () => {
    expect(welcome(89, [84, 85, 89])).toMatchObject({ greeting: 'back', week: 12, weekNumber: 13, visitsThisWeek: 3, visitsLine: 'line' })
    expect(welcome(90, [83, 90])).toMatchObject({ greeting: 'plain', week: 12, day: 90, visitsThisWeek: 1, visitsLine: 'visit' })
  })

  test('FR-KIOSK-05 day 100 keeps week 12 and counts only its own 7-day block', () => {
    // The block holding day 100 starts on day 98.
    expect(welcome(100, [97, 98, 100])).toMatchObject({ greeting: 'plain', week: 12, day: 100, visitsThisWeek: 2, visitsLine: 'visits' })
  })

  test("FR-KIOSK-05 two check-ins on one local day count once, and the day is the gym's", () => {
    const joinedOn = addDays(TODAY, -3)
    const w = kioskWelcome({
      firstName: 'Sam',
      joinedOn,
      // 03:00Z on the 6th is the evening of the 5th in Chicago.
      checkinAts: [`${TODAY}T15:00:00.000Z`, `${TODAY}T20:00:00.000Z`, `${TODAY}T03:00:00.000Z`],
      today: TODAY,
      timeZone: TZ,
      joined: false,
    })
    expect(w.visitsThisWeek).toBe(2)
  })

  test('FR-KIOSK-05 a join date after today gives a negative day and week 1', () => {
    expect(welcome(-3, [])).toMatchObject({ greeting: 'back', week: 0, weekNumber: 1, day: -3, visitsThisWeek: 0, status: 'new' })
  })

  test('FR-KIOSK-05 the visits line: 3 or more is on the line, 1 is one visit, 0 and 2 are visits', () => {
    const line = (days: number[]) => welcome(20, days).visitsLine
    expect([line([]), line([14]), line([14, 15]), line([14, 15, 16]), line([14, 15, 16, 17])]).toEqual([
      'visits',
      'visit',
      'visits',
      'line',
      'line',
    ])
  })
})

describe('kioskSearch', () => {
  let id = 0
  const m = (firstName: string, lastName: string | null = null): KioskSearchMember => ({ id: ++id, firstName, lastName })

  test('FR-KIOSK-02 "SA" gives the first 6 of 8 Sams and Samira, in the given order, as first name and initial', () => {
    const sams = Array.from({ length: 8 }, (_, i) => m('Sam', `Ortiz${i}`))
    const members = [...sams, m('Samira', 'Khan'), m('Maya', 'Reyes')]
    const hits = kioskSearch(members, 'SA')
    expect(hits).toHaveLength(KIOSK_HITS)
    expect(hits).toEqual(sams.slice(0, 6).map((s) => ({ memberId: s.id, name: 'Sam O.' })))
    expect(kioskSearch([m('Samira', 'Khan'), ...sams], 'sa')[0]).toMatchObject({ name: 'Samira K.' })
  })

  test('FR-KIOSK-02 "maya r" finds Maya R., whatever the case and spacing', () => {
    const maya = m('Maya', 'Reyes')
    const members = [m('Maya', 'Lopez'), maya, m('Mayra', 'Ruiz')]
    expect(kioskSearch(members, 'maya r')).toEqual([{ memberId: maya.id, name: 'Maya R.' }])
    expect(kioskSearch(members, '  MAYA   r ')).toEqual([{ memberId: maya.id, name: 'Maya R.' }])
    expect(kioskSearch(members, 'maya r.')).toEqual([{ memberId: maya.id, name: 'Maya R.' }])
  })

  test('FR-KIOSK-02 an empty or blank query finds nobody', () => {
    const members = [m('Sam', 'Ortiz')]
    expect(kioskSearch(members, '')).toEqual([])
    expect(kioskSearch(members, '   ')).toEqual([])
  })

  test('FR-GLOBAL-04 a single name is found and shown alone', () => {
    const zed = m('Zed')
    expect(kioskSearch([zed], 'zed')).toEqual([{ memberId: zed.id, name: 'Zed' }])
    expect(kioskSearch([m('Zed', '   ')], 'z')[0]?.name).toBe('Zed')
  })

  test('FR-KIOSK-02 accents fold both ways', () => {
    const joseR = m('José', 'Ruiz')
    const joseM = m('Jose', 'Mata')
    expect(kioskSearch([joseR], 'jose').map((h) => h.name)).toEqual(['José R.'])
    expect(kioskSearch([joseM], 'JOSÉ').map((h) => h.name)).toEqual(['Jose M.'])
    // An accent typed as a combining mark.
    expect(kioskSearch([joseR], 'José r')).toHaveLength(1)
  })

  test('FR-KIOSK-02 a last name alone finds nobody', () => {
    expect(kioskSearch([m('Sam', 'Ortiz')], 'ortiz')).toEqual([])
    expect(kioskSearch([m('Sam', 'Ortiz')], 'sam ortiz')).toEqual([])
  })
})

describe('the coach turn', () => {
  const owner = { id: 1, role: 'owner', active: true } as const
  const priya = { id: 2, role: 'coach', active: true } as const
  const jordan = { id: 3, role: 'coach', active: true } as const
  const staff = [jordan, owner, priya]

  test('FR-KIOSK-04 walk-ins go to the active coaches in turn, by id, never to an owner while a coach is active', () => {
    expect(nextKioskCoach(staff, [])).toBe(priya.id)
    expect(nextKioskCoach(staff, [null])).toBe(priya.id)
    expect(nextKioskCoach(staff, [priya.id])).toBe(jordan.id)
    expect(nextKioskCoach(staff, [jordan.id, priya.id])).toBe(priya.id)
  })

  test("FR-KIOSK-04 a member given to the owner by hand, or to nobody, doesn't move the turn", () => {
    expect(nextKioskCoach(staff, [owner.id, null, priya.id])).toBe(jordan.id)
  })

  test('FR-KIOSK-04 an inactive coach is skipped, and the turn carries on after a coach who has gone', () => {
    expect(nextKioskCoach([owner, { ...priya, active: false }, jordan], [jordan.id])).toBe(jordan.id)
    const kim = { id: 4, role: 'coach', active: true } as const
    expect(nextKioskCoach([owner, priya, { ...jordan, active: false }, kim], [jordan.id])).toBe(kim.id)
  })

  test('FR-KIOSK-04 a gym with no active coach gives walk-ins to its active owners, and with no one active to nobody', () => {
    const co = { id: 5, role: 'owner', active: true } as const
    const gone = { ...priya, active: false }
    expect(nextKioskCoach([owner, gone, co], [priya.id])).toBe(owner.id)
    expect(nextKioskCoach([owner, gone, co], [owner.id, priya.id])).toBe(co.id)
    expect(nextKioskCoach([{ ...owner, active: false }, gone], [])).toBeNull()
  })
})
