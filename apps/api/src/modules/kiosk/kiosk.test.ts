// The kiosk API (FR-KIOSK-01 to 06, NFR-SEC-03), with legacy server/test/kiosk.test.mjs ported (its six tests keep
// their names after the ID) and data-fixes.test.mjs's kiosk join.
import { type ErrorCode, KioskGymResponse, KioskSearchResponse, KioskWelcome, type LiveEvent } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { TEST_NOW } from '../../platform/context.ts'
import { ERROR_COPY, ERROR_STATUS } from '../../platform/http/errors.ts'
import { createMemoryRateLimitStore, createRateLimits } from '../../platform/rate-limit.ts'
import { call } from '../../test/http.ts'
import { addMember, KIT } from '../../test/members.ts'
import { openStream, readUntil } from '../../test/sse.ts'
import { makeWorld, TODAY, type World } from '../../test/world.ts'
import { kioskModule } from './index.ts'

const K = '/api/kiosk/kiosk-token-1'
const NOW = TEST_NOW.toISOString()

const failure = (code: ErrorCode) => [ERROR_STATUS[code], { error: { code, message: t(ERROR_COPY[code]) } }]
const answer = (r: { status: number; body: unknown }) => [r.status, r.body]

const checkIn = (w: World, body: unknown) => call(w.app, 'POST', `${K}/checkin`, { body })
const joinAs = (w: World, body: unknown) => call(w.app, 'POST', `${K}/join`, { body })
const visits = async (w: World, memberId: number) => (await w.ctx.repos.checkins.listByMember({ gymId: w.gym.id }, memberId)).length
const memberNamed = async (w: World, firstName: string) => {
  const m = (await w.ctx.repos.members.listByGym(w.gym.id)).find((x) => x.firstName === firstName)
  if (!m) throw new Error(`no member ${firstName}`)
  return m
}
/** Every event the bus carries from now on. */
const hear = (w: World) => {
  const events: LiveEvent[] = []
  w.ctx.bus.subscribe((e) => events.push(e))
  return events
}
/** A world whose clock the test moves. */
const movableWorld = async (factor = 1) => {
  let now = TEST_NOW.getTime()
  const clock = () => new Date(now)
  const w = await makeWorld({ clock, rateLimits: createRateLimits(createMemoryRateLimitStore(), clock, factor) })
  return { w, advance: (ms: number) => void (now += ms) }
}
const asUk = (w: World) => w.ctx.repos.gyms.updateSettings(w.gym.id, { name: w.gym.name, timezone: 'Europe/London', country: 'GB' })

/** Archive a member as staff do, through the members module's route (FR-MEMBER-05). */
const archive = async (w: World, memberId: number) => {
  const r = await call(w.app, 'POST', `/api/members/${memberId}/archive`, { cookie: await w.login(w.owner.email) })
  if (r.status !== 200) throw new Error(`archive ${memberId}: ${r.status} ${JSON.stringify(r.body)}`)
}

/**
 * Archive the member, for real, the moment their next kiosk check-in is about to be written: an archive racing the
 * check-in, which the check-in's own transaction must see.
 */
function archiveDuringNextCheckin(w: World, memberId: number) {
  const checkins = w.ctx.repos.checkins
  const { recordAtKiosk } = checkins
  checkins.recordAtKiosk = async (input) => {
    if (input.memberId === memberId) {
      checkins.recordAtKiosk = recordAtKiosk
      await w.ctx.repos.members.setArchived({ gymId: w.gym.id }, memberId, w.ctx.clock().toISOString())
    }
    return recordAtKiosk(input)
  }
}

const samWelcome = {
  firstName: 'Sam',
  greeting: 'back',
  week: 3,
  weekNumber: 4,
  day: 24,
  visitsThisWeek: 2,
  visitsLine: 'visits',
  status: 'slipping',
}

describe('the gym and its token', () => {
  test('FR-KIOSK-01 a bad kiosk token is a 404; the right one gives the gym name', async () => {
    const w = await makeWorld()
    expect(answer(await call(w.app, 'GET', '/api/kiosk/not-a-token'))).toEqual(failure('linkInvalid'))
    expect((await call(w.app, 'POST', '/api/kiosk/not-a-token/checkin', { body: { phone: '3125550042' } })).status).toBe(404)
    expect((await call(w.app, 'GET', '/api/kiosk/not-a-token/search?q=sa')).status).toBe(404)
    expect((await call(w.app, 'POST', '/api/kiosk/not-a-token/join', { body: { firstName: 'Al' } })).status).toBe(404)
    const r = await call(w.app, 'GET', K)
    expect(answer(r)).toEqual([200, { gymName: 'Northside Strength', isDemo: false, country: 'US' }])
    expect(KioskGymResponse.strict().safeParse(r.body).success).toBe(true)
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toEqual([])
  })

  test("FR-KIOSK-02 the gym call carries the gym's country, for the number as it's typed", async () => {
    const w = await makeWorld()
    await asUk(w)
    expect((await call(w.app, 'GET', K)).body).toMatchObject({ country: 'GB' })
  })

  test('NFR-REL-01 the kiosk holds nothing open: it hears no events and every answer is plain JSON', async () => {
    const w = await makeWorld()
    expect(kioskModule.subscribe).toBeUndefined()
    const sam = await addMember(w, { ...KIT.sam, phone: '+13125550042' })
    const answers = [
      await call(w.app, 'GET', K),
      await call(w.app, 'GET', `${K}/search?q=sam`),
      await checkIn(w, { memberId: sam }),
      await joinAs(w, { firstName: 'Al' }),
    ]
    for (const r of answers) {
      expect(r.status).toBe(200)
      expect(r.res.headers.get('content-type')).toMatch(/^application\/json/)
    }
  })
})

describe('check-in', () => {
  test('FR-KIOSK-03 checkin by phone welcomes the member; a second one within the hour is not stored', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { ...KIT.sam, phone: '+13125550042' })
    const events = hear(w)
    const before = await visits(w, sam)
    const r = await checkIn(w, { phone: '(312) 555-0042' })
    expect(answer(r)).toEqual([200, samWelcome])
    expect(KioskWelcome.strict().safeParse(r.body).success).toBe(true)
    expect(await visits(w, sam)).toBe(before + 1)
    expect(events).toEqual([
      { type: 'checkin.recorded', gymId: w.gym.id, memberId: sam, coachId: w.owner.id, name: 'Sam O.', at: NOW },
    ])
    const again = await checkIn(w, { memberId: sam })
    expect(answer(again)).toEqual([200, samWelcome])
    expect(await visits(w, sam)).toBe(before + 1)
    expect(events).toHaveLength(1)
    expect(answer(await checkIn(w, { phone: '312-555-0099' }))).toEqual(failure('kioskNotFound'))
  })

  test('FR-KIOSK-03 an hour after the last check-in, the next one is stored', async () => {
    const { w, advance } = await movableWorld()
    const sam = await addMember(w, { ...KIT.sam, phone: '+13125550042' })
    const events = hear(w)
    await checkIn(w, { memberId: sam })
    advance(59 * 60 * 1000)
    await checkIn(w, { memberId: sam })
    expect(events).toHaveLength(1)
    advance(60 * 1000)
    expect((await checkIn(w, { memberId: sam })).status).toBe(200)
    expect(events.map((e) => e.type)).toEqual(['checkin.recorded', 'checkin.recorded'])
    expect(events[1]).toMatchObject({ at: new Date(TEST_NOW.getTime() + 60 * 60 * 1000).toISOString() })
  })

  test("FR-PRIV-02 the kiosk can't check in another gym's member", async () => {
    const w = await makeWorld()
    const { gym: other } = await w.ctx.repos.gyms.createWithOwner({
      gym: { name: 'Other', slug: 'other', timezone: 'America/Chicago', country: 'US', pilotStartedOn: TODAY, kioskToken: 'other-token' },
      owner: { email: 'owner@other.test', name: 'Olga O.', passwordHash: 'h' },
      templates: DEFAULT_TEMPLATES,
      createdAt: NOW,
    })
    const { created } = await w.ctx.repos.members.applyImport({
      gymId: other.id,
      at: NOW,
      creates: [{ firstName: 'Zed', lastName: null, phone: '+13125550042', email: null, joinedOn: TODAY, coachId: null, externalId: null }],
      updates: [],
      checkins: [],
    })
    const zed = created[0]?.id
    if (zed === undefined) throw new Error('no member')
    const events = hear(w)
    expect(answer(await checkIn(w, { memberId: zed }))).toEqual(failure('memberNotFound'))
    expect(answer(await checkIn(w, { phone: '(312) 555-0042' }))).toEqual(failure('kioskNotFound'))
    expect(await w.ctx.repos.checkins.listByMember({ gymId: other.id }, zed)).toEqual([])
    expect(events).toEqual([])
  })

  test('FR-GLOBAL-02 a mistyped + at a US gym reads the digits as a US number', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { ...KIT.sam, phone: '+13125550042' })
    expect(answer(await checkIn(w, { phone: '+312 555 0042' }))).toEqual([200, samWelcome])
    expect(await visits(w, sam)).toBe(KIT.sam.weeks.reduce((a, b) => a + b, 0) + KIT.sam.current + 1)
  })

  test('FR-GLOBAL-02 a UK gym reads phones as UK numbers, and a US number needs its +1', async () => {
    const w = await makeWorld()
    await asUk(w)
    const ana = await addMember(w, { first: 'Ana', phone: '+447911123456', daysSinceJoin: 3 })
    const sam = await addMember(w, { ...KIT.sam, phone: '+13125550042' })
    expect((await checkIn(w, { phone: '07911 123456' })).body).toMatchObject({ firstName: 'Ana' })
    expect(await visits(w, ana)).toBe(1)
    expect(answer(await checkIn(w, { phone: '(312) 555-0042' }))).toEqual(failure('phone'))
    expect((await checkIn(w, { phone: '+1 312 555 0042' })).body).toMatchObject({ firstName: 'Sam' })
    expect(await visits(w, sam)).toBe(KIT.sam.weeks.reduce((a, b) => a + b, 0) + KIT.sam.current + 1)
    expect((await joinAs(w, { firstName: 'Bea', phone: '07911 123457' })).status).toBe(200)
    expect((await memberNamed(w, 'Bea')).phone).toBe('+447911123457')
    expect(answer(await joinAs(w, { firstName: 'Bea', phone: '+44 7911 123457' }))).toEqual(failure('duplicate'))
  })

  test('FR-KIOSK-02 bad check-in bodies answer the old codes', async () => {
    const w = await makeWorld()
    await addMember(w, { ...KIT.sam, phone: '+13125550042' })
    expect(answer(await checkIn(w, {}))).toEqual(failure('generic'))
    expect(answer(await checkIn(w, { phone: 3125550042 }))).toEqual(failure('generic'))
    expect(answer(await checkIn(w, 'not json'))).toEqual(failure('generic'))
    expect(answer(await checkIn(w, { memberId: 'abc' }))).toEqual(failure('memberNotFound'))
    expect(answer(await checkIn(w, { memberId: 999 }))).toEqual(failure('memberNotFound'))
    expect(answer(await checkIn(w, { phone: 'nope' }))).toEqual(failure('phone'))
    expect(answer(await checkIn(w, { phone: '3'.repeat(41) }))).toEqual(failure('phone'))
  })
})

describe('the name search', () => {
  test('FR-KIOSK-02 search shows first name and last initial only, at most 6', async () => {
    const w = await makeWorld()
    for (let i = 0; i < 8; i++) await addMember(w, { first: 'Sam', last: `Ortiz${i}`, daysSinceJoin: 3 })
    await addMember(w, { first: 'Samira', last: 'Khan', daysSinceJoin: 3 })
    await addMember(w, { first: 'Maya', last: 'Reyes', daysSinceJoin: 3 })
    const r = await call(w.app, 'GET', `${K}/search?q=SA`)
    expect(r.status).toBe(200)
    const hits = KioskSearchResponse.parse(r.body)
    expect(hits).toHaveLength(6)
    for (const hit of hits) expect(Object.keys(hit)).toEqual(['memberId', 'name'])
    expect(JSON.stringify(r.body)).not.toContain('Ortiz')
    expect(hits[0]?.name).toBe('Sam O.')
    expect(((await call(w.app, 'GET', `${K}/search?q=maya%20r`)).body as { name: string }[]).map((h) => h.name)).toEqual(['Maya R.'])
    expect((await call(w.app, 'GET', `${K}/search?q=`)).body).toEqual([])
    expect((await call(w.app, 'GET', `${K}/search`)).body).toEqual([])
  })

  test('FR-KIOSK-02 the search folds accents, and its pick checks the member in', async () => {
    const w = await makeWorld()
    const jose = await addMember(w, { first: 'José', last: 'Ruiz', daysSinceJoin: 3 })
    const r = await call(w.app, 'GET', `${K}/search?q=JOSE`)
    expect(r.body).toEqual([{ memberId: jose, name: 'José R.' }])
    expect((await checkIn(w, { memberId: jose })).body).toMatchObject({ firstName: 'José' })
    expect(await visits(w, jose)).toBe(1)
  })

  test('FR-KIOSK-02 archived members are left out of the search', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { first: 'Sam', last: 'Ortiz', daysSinceJoin: 3 })
    const sal = await addMember(w, { first: 'Sal', last: 'Lee', daysSinceJoin: 3 })
    await archive(w, sam)
    expect((await call(w.app, 'GET', `${K}/search?q=sa`)).body).toEqual([{ memberId: sal, name: 'Sal L.' }])
  })
})

describe('joining', () => {
  test('FR-KIOSK-04 join creates a week-0 member checked in today, coaches in turn among the active coaches', async () => {
    const w = await makeWorld()
    const events = hear(w)
    const coaches: (number | null)[] = []
    for (const firstName of ['Ana', 'Ben', 'Cy', 'Di']) {
      const r = await joinAs(w, { firstName, lastName: 'Kiosk', phone: null })
      expect(answer(r)).toEqual([
        200,
        { firstName, greeting: 'first', week: 0, weekNumber: 1, day: 0, visitsThisWeek: 1, visitsLine: 'visit', status: 'new' },
      ])
      const m = await memberNamed(w, firstName)
      expect([m.joinedOn, m.source, m.lastName, m.phone]).toEqual([TODAY, 'kiosk', 'Kiosk', null])
      expect(await visits(w, m.id)).toBe(1)
      coaches.push(m.coachId)
    }
    // Coaches only (answers.md, 7 Nov): the owner is never in the turn while a coach is active.
    expect(coaches).toEqual([w.coach.id, w.coach2.id, w.coach.id, w.coach2.id])
    expect(events.map((e) => e.type)).toEqual(Array(4).fill(['member.joined', 'checkin.recorded']).flat())
    // A turned-off coach is skipped: after Jordan (Di) comes Jordan again, not Priya.
    await w.ctx.repos.users.setActive(w.gym.id, w.coach.id, false)
    await joinAs(w, { firstName: 'Ed' })
    expect((await memberNamed(w, 'Ed')).coachId).toBe(w.coach2.id)
    expect(answer(await joinAs(w, { firstName: ' ' }))).toEqual(failure('kioskFirstName'))
    expect((await joinAs(w, { firstName: 'Fi', phone: '(312) 555-0077' })).status).toBe(200)
    expect((await memberNamed(w, 'Fi')).phone).toBe('+13125550077')
    expect(answer(await joinAs(w, { firstName: 'Fi', phone: '312.555.0077' }))).toEqual(failure('duplicate'))
  })

  test('FR-KIOSK-04 a join publishes member.joined, then checkin.recorded, with the coach it was given', async () => {
    const w = await makeWorld()
    const events = hear(w)
    await joinAs(w, { firstName: 'Ana', lastName: 'Lee' })
    const ana = await memberNamed(w, 'Ana')
    expect(ana.coachId).toBe(w.coach.id)
    expect(events).toEqual([
      { type: 'member.joined', gymId: w.gym.id, memberId: ana.id, coachId: w.coach.id },
      { type: 'checkin.recorded', gymId: w.gym.id, memberId: ana.id, coachId: w.coach.id, name: 'Ana L.', at: NOW },
    ])
  })

  test('FR-KIOSK-04 a member given to the owner by hand leaves the coaches in turn; with no active coach, the owner coaches', async () => {
    const w = await makeWorld()
    await joinAs(w, { firstName: 'Ana' })
    await addMember(w, { first: 'Bo', coachId: w.owner.id, daysSinceJoin: 3 })
    await joinAs(w, { firstName: 'Cy' })
    expect((await memberNamed(w, 'Cy')).coachId).toBe(w.coach2.id)
    await w.ctx.repos.users.setActive(w.gym.id, w.coach.id, false)
    await w.ctx.repos.users.setActive(w.gym.id, w.coach2.id, false)
    const events = hear(w)
    await joinAs(w, { firstName: 'Di' })
    const di = await memberNamed(w, 'Di')
    expect(di.coachId).toBe(w.owner.id)
    expect(events.map((e) => 'coachId' in e && e.coachId)).toEqual([w.owner.id, w.owner.id])
  })

  test('FR-KIOSK-04 the demo gym stores no phone from a join, so a visitor never lands in the sample data with theirs', async () => {
    const w = await makeWorld()
    const { findByKioskToken } = w.ctx.repos.gyms
    w.ctx.repos.gyms.findByKioskToken = async (token) => {
      const gym = await findByKioskToken(token)
      return gym && { ...gym, isDemo: true }
    }
    const r = await joinAs(w, { firstName: 'Vi', phone: '(312) 555-0199' })
    expect(r.body).toMatchObject({ firstName: 'Vi', greeting: 'first' })
    expect((await memberNamed(w, 'Vi')).phone).toBeNull()
    expect(answer(await checkIn(w, { phone: '(312) 555-0199' }))).toEqual(failure('kioskNotFound'))
    // Two visitors typing the same number both join: nothing was stored to clash with.
    expect((await joinAs(w, { firstName: 'Wu', phone: '(312) 555-0199' })).status).toBe(200)
  })

  test('FR-KIOSK-04 kiosk join: a last name of only spaces is treated as none', async () => {
    const w = await makeWorld()
    expect((await joinAs(w, { firstName: 'Zed', lastName: '   ', phone: null })).status).toBe(200)
    expect((await memberNamed(w, 'Zed')).lastName).toBeNull()
    expect((await joinAs(w, { firstName: 'Yan', lastName: ' Lee ', phone: null })).status).toBe(200)
    expect((await memberNamed(w, 'Yan')).lastName).toBe('Lee')
  })

  test('FR-KIOSK-04 a join takes the gym-local date: 03:00Z on the 7th joins on the 6th in Chicago', async () => {
    const w = await makeWorld({ clock: () => new Date('2026-11-07T03:00:00.000Z') })
    await joinAs(w, { firstName: 'Late' })
    expect((await memberNamed(w, 'Late')).joinedOn).toBe('2026-11-06')
  })

  test('FR-GLOBAL-04 a single name joins, is found and checks in as itself', async () => {
    const { w, advance } = await movableWorld()
    const events = hear(w)
    expect((await joinAs(w, { firstName: 'Zed' })).body).toMatchObject({ firstName: 'Zed', greeting: 'first' })
    expect(events.find((e) => e.type === 'checkin.recorded')).toMatchObject({ name: 'Zed' })
    const zed = (await memberNamed(w, 'Zed')).id
    expect((await call(w.app, 'GET', `${K}/search?q=zed`)).body).toEqual([{ memberId: zed, name: 'Zed' }])
    advance(2 * 60 * 60 * 1000)
    const r = await checkIn(w, { memberId: zed })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ firstName: 'Zed', greeting: 'back', visitsThisWeek: 1 })
    expect(await visits(w, zed)).toBe(2)
  })

  test('FR-KIOSK-04 bad join bodies answer the old codes, the first name first', async () => {
    const w = await makeWorld()
    expect(answer(await joinAs(w, {}))).toEqual(failure('kioskFirstName'))
    expect(answer(await joinAs(w, { firstName: 'x'.repeat(41) }))).toEqual(failure('kioskFirstName'))
    expect(answer(await joinAs(w, { firstName: '', lastName: 5 }))).toEqual(failure('kioskFirstName'))
    expect(answer(await joinAs(w, { firstName: 'Al', lastName: 5 }))).toEqual(failure('generic'))
    expect(answer(await joinAs(w, { firstName: 'Al', phone: 'nope' }))).toEqual(failure('phone'))
    expect(answer(await joinAs(w, { firstName: 'Al', phone: 5 }))).toEqual(failure('phone'))
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toEqual([])
  })
})

describe('the welcome', () => {
  test("FR-KIOSK-05 a member added by staff is welcomed as new on their join day's first check-in, and back after (KS12)", async () => {
    const { w, advance } = await movableWorld()
    const omar = await addMember(w, { first: 'Omar', daysSinceJoin: 0 })
    expect((await checkIn(w, { memberId: omar })).body).toMatchObject({ firstName: 'Omar', greeting: 'first', day: 0, weekNumber: 1 })
    advance(2 * 60 * 60 * 1000)
    expect((await checkIn(w, { memberId: omar })).body).toMatchObject({ greeting: 'back', day: 0, weekNumber: 1 })
  })

  test('FR-KIOSK-05 the welcome names its headline and carries its numbers: first, Week {n}, and plain from day 90', async () => {
    const w = await makeWorld()
    expect((await joinAs(w, { firstName: 'Ana' })).body).toMatchObject({ greeting: 'first', day: 0, weekNumber: 1 })
    const maya = await addMember(w, KIT.maya)
    expect((await checkIn(w, { memberId: maya })).body).toEqual({
      firstName: 'Maya',
      greeting: 'back',
      week: 9,
      weekNumber: 10,
      day: 66,
      visitsThisWeek: 3,
      visitsLine: 'line',
      status: 'on',
    })
    const old = await addMember(w, { first: 'Old', daysSinceJoin: 95, weeks: Array<number>(13).fill(3) })
    expect((await checkIn(w, { memberId: old })).body).toMatchObject({ greeting: 'plain', day: 95, visitsThisWeek: 1, visitsLine: 'visit' })
  })
})

describe('archived members', () => {
  test('FR-KIOSK-06 an archived member typed by phone or picked by id is sent to the front desk, and nothing is recorded', async () => {
    const w = await makeWorld()
    const dave = await addMember(w, { first: 'Dave', last: 'Kim', phone: '+13125550042', daysSinceJoin: 40, weeks: [3, 2] })
    await archive(w, dave)
    const before = await visits(w, dave)
    const events = hear(w)
    expect(answer(await checkIn(w, { phone: '(312) 555-0042' }))).toEqual(failure('memberArchived'))
    expect(answer(await checkIn(w, { memberId: dave }))).toEqual(failure('memberArchived'))
    expect(t('api.memberArchived')).toBe('Please see the front desk to check in.')
    expect(await visits(w, dave)).toBe(before)
    expect(events).toEqual([])
  })

  test("FR-KIOSK-06 a join with an archived member's phone is sent to the front desk, and no member is made", async () => {
    const w = await makeWorld()
    const dave = await addMember(w, { first: 'Dave', last: 'Kim', phone: '+13125550042', daysSinceJoin: 40 })
    await addMember(w, { first: 'Lin', phone: '+13125550043', daysSinceJoin: 3 })
    await archive(w, dave)
    const before = await w.ctx.repos.members.listByGym(w.gym.id)
    const events = hear(w)
    expect(answer(await joinAs(w, { firstName: 'Dave', lastName: 'Kim', phone: '(312) 555-0042' }))).toEqual(failure('memberArchived'))
    // A live member's number is still just taken.
    expect(answer(await joinAs(w, { firstName: 'Riya', phone: '(312) 555-0043' }))).toEqual(failure('duplicate'))
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toEqual(before)
    expect(events).toEqual([])
  })

  test('FR-KIOSK-06 a member archived while their check-in is written is sent to the front desk, and nothing is recorded', async () => {
    const w = await makeWorld()
    const dave = await addMember(w, { first: 'Dave', phone: '+13125550042', daysSinceJoin: 40 })
    archiveDuringNextCheckin(w, dave)
    const events = hear(w)
    expect(answer(await checkIn(w, { phone: '(312) 555-0042' }))).toEqual(failure('memberArchived'))
    expect(await visits(w, dave)).toBe(0)
    expect(events).toEqual([])
  })
})

describe('the kiosk limit', () => {
  test('NFR-SEC-03 the kiosk allows 30 requests a minute per IP, then 429', async () => {
    const w = await makeWorld()
    for (let i = 0; i < 30; i++) expect((await call(w.app, 'GET', K)).status, `request ${i + 1}`).toBe(200)
    expect(answer(await call(w.app, 'GET', `${K}/search?q=a`))).toEqual(failure('kioskTooMany'))
  })

  test('NFR-SEC-03 a bad token counts toward the limit too, and the window frees up after a minute', async () => {
    const { w, advance } = await movableWorld()
    for (let i = 0; i < 30; i++) expect((await call(w.app, 'GET', '/api/kiosk/nope')).status).toBe(404)
    expect(answer(await call(w.app, 'GET', K))).toEqual(failure('kioskTooMany'))
    expect(answer(await joinAs(w, { firstName: 'Al' }))).toEqual(failure('kioskTooMany'))
    expect(await w.ctx.repos.members.listByGym(w.gym.id)).toEqual([])
    advance(60 * 1000)
    expect((await call(w.app, 'GET', K)).status).toBe(200)
  })

  test('NFR-SEC-03 TENURE_LIMIT_FACTOR multiplies the kiosk limit', async () => {
    const { w } = await movableWorld(2)
    for (let i = 0; i < 60; i++) expect((await call(w.app, 'GET', K)).status, `request ${i + 1}`).toBe(200)
    expect(answer(await call(w.app, 'GET', K))).toEqual(failure('kioskTooMany'))
  })
})

describe('live events', () => {
  test("FR-LIVE-02 a coach hears kiosk check-ins of their own members only; the owner hears everyone's", async () => {
    const w = await makeWorld()
    const mine = await addMember(w, { first: 'Mine', last: 'Test', phone: '+13125550011', coachId: w.coach.id, daysSinceJoin: 3 })
    const theirs = await addMember(w, { first: 'Theirs', last: 'Test', phone: '+13125550022', coachId: w.coach2.id, daysSinceJoin: 3 })
    const coach = await openStream(w.app, await w.login(w.coach.email))
    const owner = await openStream(w.app, await w.login(w.owner.email))
    try {
      expect((await checkIn(w, { phone: '3125550022' })).status).toBe(200)
      expect((await checkIn(w, { phone: '3125550011' })).status).toBe(200)
      const event = { type: 'checkin.recorded', gymId: w.gym.id, memberId: mine, coachId: w.coach.id, name: 'Mine T.', at: NOW }
      const coachText = await readUntil(coach, (s) => s.includes('"name":"Mine T."'))
      expect(coachText).toContain(`event: checkin.recorded\ndata: ${JSON.stringify(event)}\n\n`)
      expect(coachText).not.toContain(`"memberId":${theirs}`)
      const ownerText = await readUntil(owner, (s) => s.includes('"name":"Mine T."'))
      expect(ownerText.indexOf(`"memberId":${theirs}`)).toBeGreaterThan(-1)
      expect(ownerText.indexOf(`"memberId":${theirs}`)).toBeLessThan(ownerText.indexOf(`"memberId":${mine}`))
    } finally {
      await coach.cancel()
      await owner.cancel()
    }
  })

  test('FR-LIVE-01 a kiosk join reaches the stream as member.joined, then checkin.recorded', async () => {
    const w = await makeWorld()
    const owner = await openStream(w.app, await w.login(w.owner.email))
    try {
      expect((await joinAs(w, { firstName: 'Live' })).status).toBe(200)
      const text = await readUntil(owner, (s) => s.includes('event: checkin.recorded'))
      expect(text.indexOf('event: member.joined')).toBeGreaterThan(-1)
      expect(text.indexOf('event: member.joined')).toBeLessThan(text.indexOf('event: checkin.recorded'))
      expect(text).toContain('"name":"Live"')
    } finally {
      await owner.cancel()
    }
  })
})
