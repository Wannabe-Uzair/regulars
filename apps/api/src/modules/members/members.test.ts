// The members module: the lists by view, the member page, edits, add, archive, restore and permanent delete.
// Ports permissions.test.mjs's member cases, data-fixes.test.mjs's two PATCH tests, metrics.test.mjs's day-90 list
// lines and nudges.test.mjs's came-back line on the member page.
import {
  Actor,
  type ErrorCode,
  type LiveEvent,
  MemberDetailResponse,
  MembersResponse,
  TodayResponse,
} from '@tenure/contracts'
import { t } from '@tenure/copy'
import { createDb, createRepositories } from '@tenure/db'
import { SEED_TIMEZONE, seedNorthside } from '@tenure/db/seed'
import { addDays, buildSummaries, DEFAULT_TEMPLATES } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { createTestContext } from '../../platform/context.ts'
import { ERROR_COPY } from '../../platform/http/errors.ts'
import { call, cookieOf } from '../../test/http.ts'
import { addMember, localNoon } from '../../test/members.ts'
import { makeWorld, PASSWORD, TODAY, type World } from '../../test/world.ts'
import { memberPage } from './service.ts'

async function world() {
  const w = await makeWorld()
  const mine = await addMember(w, { first: 'Mine', coachId: w.coach.id, daysSinceJoin: 20, weeks: [3, 3] })
  const theirs = await addMember(w, { first: 'Theirs', coachId: w.coach2.id, daysSinceJoin: 20, weeks: [1, 1] })
  const owners = await addMember(w, { first: 'Owners', coachId: w.owner.id, daysSinceJoin: 30, weeks: [2, 2, 2, 2] })
  const events: LiveEvent[] = []
  w.ctx.bus.subscribe((e) => events.push(e))
  return { ...w, mine, theirs, owners, events, coachCookie: await w.login(w.coach.email), ownerCookie: await w.login(w.owner.email) }
}
type W = Awaited<ReturnType<typeof world>>

const error = (code: ErrorCode) => ({ error: { code, message: t(ERROR_COPY[code]) } })

async function list(w: World, cookie: string, view?: string) {
  const r = await call(w.app, 'GET', `/api/members${view === undefined ? '' : `?view=${view}`}`, { cookie })
  expect(r.status).toBe(200)
  return MembersResponse.strict().parse(r.body).members
}
const ids = async (w: World, cookie: string, view?: string) => (await list(w, cookie, view)).map((s) => s.id)

async function page(w: World, cookie: string, id: number) {
  const r = await call(w.app, 'GET', `/api/members/${id}`, { cookie })
  expect(r.status).toBe(200)
  return MemberDetailResponse.strict().parse(r.body)
}

const patch = (w: W, id: number, body: unknown, cookie = w.ownerCookie) => call(w.app, 'PATCH', `/api/members/${id}`, { cookie, body })
const post = (w: W, path: string, body: unknown, cookie = w.ownerCookie) => call(w.app, 'POST', path, { cookie, body })
const archive = (w: W, id: number, cookie = w.ownerCookie) => call(w.app, 'POST', `/api/members/${id}/archive`, { cookie })
const restore = (w: W, id: number, cookie = w.ownerCookie) => call(w.app, 'POST', `/api/members/${id}/restore`, { cookie })
const remove = (w: W, id: number, cookie = w.ownerCookie) => call(w.app, 'DELETE', `/api/members/${id}`, { cookie })

const phoneOf = async (w: World, id: number) => (await w.ctx.repos.members.findInScope({ gymId: w.gym.id }, id))?.phone
const rowOf = async (w: World, id: number) => w.ctx.repos.members.findInScope({ gymId: w.gym.id }, id)

/** A second gym, signed up through the API; its owner's cookie. */
async function otherGym(w: World) {
  const r = await call(w.app, 'POST', '/api/auth/signup', {
    body: { gymName: 'Eastside Barbell', name: 'Eve E.', email: 'eve@eastside.test', password: PASSWORD, timezone: 'America/Chicago', country: 'US' },
  })
  expect(r.status).toBe(200)
  return cookieOf(r.res)
}

describe('the list', () => {
  test("FR-STAFF-07 a coach's members list only has their own members; the owner sees all", async () => {
    const w = await world()
    expect(await ids(w, w.coachCookie, 'everyone')).toEqual([w.mine])
    expect(await ids(w, w.coachCookie)).toEqual([w.mine])
    expect(new Set(await ids(w, w.ownerCookie, 'everyone'))).toEqual(new Set([w.mine, w.theirs, w.owners]))
  })

  test('FR-MEM-01 day 90 drops off the first 90 days, the default view, and is still in Everyone', async () => {
    const w = await makeWorld()
    const d89 = await addMember(w, { first: 'Last', daysSinceJoin: 89, weeks: Array<number>(12).fill(3) })
    const d90 = await addMember(w, { first: 'Gone', daysSinceJoin: 90, weeks: Array<number>(12).fill(3) })
    const cookie = await w.login(w.owner.email)
    expect(await ids(w, cookie)).toEqual([d89])
    expect(await ids(w, cookie, 'first90')).toEqual([d89])
    expect(new Set(await ids(w, cookie, 'everyone'))).toEqual(new Set([d89, d90]))
  })

  test('FR-MEM-01 Everyone is every member not archived, Archived only the archived, for a coach their own in each', async () => {
    const w = await world()
    const old = await addMember(w, { first: 'Old', coachId: w.coach.id, daysSinceJoin: 200 })
    expect((await archive(w, w.mine)).status).toBe(200)
    expect((await archive(w, w.theirs)).status).toBe(200)
    expect(new Set(await ids(w, w.ownerCookie))).toEqual(new Set([w.owners]))
    expect(new Set(await ids(w, w.ownerCookie, 'everyone'))).toEqual(new Set([w.owners, old]))
    expect(new Set(await ids(w, w.ownerCookie, 'archived'))).toEqual(new Set([w.mine, w.theirs]))
    expect(await ids(w, w.coachCookie)).toEqual([])
    expect(await ids(w, w.coachCookie, 'everyone')).toEqual([old])
    expect(await ids(w, w.coachCookie, 'archived')).toEqual([w.mine])
  })

  test('FR-MEM-01 a view outside the three is a 400', async () => {
    const w = await world()
    const r = await call(w.app, 'GET', '/api/members?view=all', { cookie: w.ownerCookie })
    expect([r.status, r.body]).toEqual([400, error('generic')])
  })

  test('FR-MEM-01 a row carries what the board and Members show: the week marks, pace, status and the coach name', async () => {
    const w = await world()
    const [mine] = (await list(w, w.ownerCookie)).filter((s) => s.id === w.mine)
    expect(mine).toMatchObject({ name: 'Mine T.', coachId: w.coach.id, coachName: 'Priya S.', week: 2, weeks: [3, 3, 0], pace: 3, status: 'on' })
    const old = await addMember(w, { first: 'Long', daysSinceJoin: 400, weeks: Array<number>(13).fill(1) })
    const [past] = (await list(w, w.ownerCookie, 'everyone')).filter((s) => s.id === old)
    expect(past?.weeks).toHaveLength(13)
  })

  test("FR-MEM-04 names sort with the gym's locale, a single name alone and first among its namesakes", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const add = (first: string, last: string | null) => addMember(w, { first, last, daysSinceJoin: 5 })
    await add('Sam', 'Ortiz')
    await add('Örjan', 'Berg')
    await add('Leo', 'Garcia')
    await add('Leo', null)
    await add('ana', 'Lee')
    expect((await list(w, cookie)).map((s) => s.name)).toEqual(['ana L.', 'Leo', 'Leo G.', 'Örjan B.', 'Sam O.'])
  })

  test("FR-MEM-01 Everyone's summaries come out as from every check-in, for members with years of visits", async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    const id = await addMember(w, { first: 'Years', daysSinceJoin: 700, weeks: [3, 2, 1, 0, 1, 2, 3, 3, 3, 3, 2, 1, 1] })
    const joinedOn = addDays(TODAY, -700)
    const late = [-3, 90, 91, 300, 699].map((d) => ({ memberId: id, at: localNoon(addDays(joinedOn, d)) }))
    await w.ctx.repos.members.applyImport({ gymId: w.gym.id, at: TODAY, creates: [], updates: [], checkins: late })
    const inputs = await w.ctx.repos.members.summaryInputs({ gymId: w.gym.id })
    const every = (await w.ctx.repos.checkins.listByGym(w.gym.id)).map(({ memberId, at }) => ({ memberId, at }))
    const expected = buildSummaries({ ...inputs, checkins: every, today: TODAY, timeZone: w.gym.timezone })
    expect(await list(w, cookie, 'everyone')).toEqual(expected)
    expect(expected[0]?.daysSinceLastVisit).toBe(1)
  })
})

describe('the member page', () => {
  test('FR-MEMBER-01 member detail: days 0..89, check-ins and nudges', async () => {
    const w = await world()
    const r = await page(w, w.coachCookie, w.mine)
    expect(r.days).toHaveLength(90)
    expect(r.days[0]).toEqual({ date: r.member.joinedOn, day: 0, visited: true })
    expect(r.days.filter((d) => d.visited)).toHaveLength(6)
    expect(r.checkins).toHaveLength(6)
    expect(r.member.source).toBe('csv')
    expect(r.member.archivedAt).toBeNull()
    expect(r.nudges).toEqual([])
  })

  test("FR-STAFF-07 a coach gets 404 for another coach's member, 200 for their own", async () => {
    const w = await world()
    const other = await call(w.app, 'GET', `/api/members/${w.theirs}`, { cookie: w.coachCookie })
    expect([other.status, other.body]).toEqual([404, error('memberNotFound')])
    expect((await call(w.app, 'GET', `/api/members/${w.mine}`, { cookie: w.coachCookie })).status).toBe(200)
    expect((await call(w.app, 'GET', '/api/members/999999', { cookie: w.coachCookie })).status).toBe(404)
  })

  test('FR-MEMBER-01 an id that is not a number is 404 notFound', async () => {
    const w = await world()
    const r = await call(w.app, 'GET', '/api/members/abc', { cookie: w.ownerCookie })
    expect([r.status, r.body]).toEqual([404, error('notFound')])
  })

  test('FR-MEMBER-01 a nudge came back when the member checked in within 7 days after it', async () => {
    const w = await world()
    const sentAt = (daysAgo: number) => `${addDays(TODAY, -daysAgo)}T15:00:00.000Z`
    const nudge = (daysAgo: number, body: string) =>
      w.ctx.repos.nudges.record({ gymId: w.gym.id, memberId: w.mine, userId: w.coach.id, templateId: null, body, sentAt: sentAt(daysAgo) })
    await nudge(10, 'First') // the last visit before it was 11 days ago, and the next is 8 days after it
    await nudge(4, 'Second')
    await w.ctx.repos.members.applyImport({ gymId: w.gym.id, at: TODAY, creates: [], updates: [], checkins: [{ memberId: w.mine, at: sentAt(2) }] })
    const r = await page(w, w.coachCookie, w.mine)
    expect(r.nudges.map((n) => [n.body, n.by, n.cameBack])).toEqual([
      ['Second', 'Priya S.', true],
      ['First', 'Priya S.', false],
    ])
  })

  test("FR-MEMBER-01 every nudge shows its channel, and the ones from before the first version none", async () => {
    const today = '2026-11-06'
    const now = new Date(`${today}T18:00:00.000Z`)
    const { db } = createDb(':memory:')
    const seed = await seedNorthside(db, {
      timezone: SEED_TIMEZONE,
      now,
      today,
      hashPassword: (password) => `fake:${password}`,
      newToken: () => 'kiosk-token',
      templates: DEFAULT_TEMPLATES,
    })
    const ctx = createTestContext({ clock: () => new Date(now), repos: createRepositories(db) })
    const gym = await ctx.repos.gyms.findById(seed.gymId)
    const owner = seed.users.find((u) => u.role === 'owner')
    if (!gym || !owner) throw new Error('seed: no gym or owner')
    const actor = Actor.parse({ ...owner, gymId: gym.id })
    const stored = await ctx.repos.nudges.listByGym(gym.id)
    const nudged = [...new Set(stored.map((n) => n.memberId))]
    const shown = new Map<number, string | null>()
    for (const id of nudged) for (const n of (await memberPage(ctx, actor, gym, id)).nudges) shown.set(n.id, n.channel)
    expect(new Set(shown.values())).toEqual(new Set(['text', 'whatsapp', 'copy', 'in-person']))
    for (const n of stored) expect(shown.get(n.id)).toBe(n.channel)

    // A nudge recorded the old way, own-phone, shows no channel.
    const id = nudged[0] ?? 0
    const old = await ctx.repos.nudges.record({ gymId: gym.id, memberId: id, userId: owner.id, templateId: null, body: 'Old', sentAt: now.toISOString() })
    expect(old.channel).toBe('own-phone')
    expect((await memberPage(ctx, actor, gym, id)).nudges.find((n) => n.id === old.id)?.channel).toBeNull()
  })
})

describe('edits', () => {
  test('FR-MEMBER-02 the owner can change a member coach and phone (normalised to E.164)', async () => {
    const w = await world()
    const r = await patch(w, w.mine, { coachId: w.coach2.id, phone: '(312) 555-0177' })
    expect(r.status).toBe(200)
    const { member } = MemberDetailResponse.strict().parse(r.body)
    expect(member.coachId).toBe(w.coach2.id)
    expect(member.coachName).toBe('Jordan T.')
    expect(member.phone).toBe('+13125550177')
    expect((await patch(w, w.mine, { phone: '12' })).status).toBe(400)
    expect((await patch(w, w.mine, { coachId: 424242 })).status).toBe(400)
  })

  test('FR-MEMBER-02 PATCH member phone: a number another member of the gym has is a 409; own number and a free one are fine', async () => {
    const w = await world()
    const a = await addMember(w, { first: 'Ann', daysSinceJoin: 10, phone: '+13125550001' })
    const b = await addMember(w, { first: 'Bo', daysSinceJoin: 10, phone: '+13125550002' })
    const dup = await patch(w, b, { phone: '(312) 555-0001' })
    expect([dup.status, dup.body]).toEqual([409, error('duplicate')])
    expect(await phoneOf(w, b)).toBe('+13125550002')
    expect((await patch(w, a, { phone: '3125550001' })).status).toBe(200)
    expect((await patch(w, b, { phone: '3125550003' })).status).toBe(200)
  })

  test('FR-MEMBER-02 PATCH member: a refused phone leaves the coach change unsaved too (nothing is half-saved)', async () => {
    const w = await world()
    await addMember(w, { first: 'Ann', daysSinceJoin: 10, phone: '+13125550001' })
    const b = await addMember(w, { first: 'Bo', daysSinceJoin: 10, phone: '+13125550002' })
    const res = await patch(w, b, { coachId: w.coach.id, firstName: 'Bob', phone: '3125550001' })
    expect(res.status).toBe(409)
    expect(await rowOf(w, b)).toMatchObject({ coachId: w.owner.id, firstName: 'Bo', phone: '+13125550002' })
    // Unreadable is refused the same way.
    expect((await patch(w, b, { coachId: w.coach.id, phone: 'call me' })).status).toBe(400)
    expect((await rowOf(w, b))?.coachId).toBe(w.owner.id)
  })

  test('FR-MEMBER-02 the owner renames a member: first name required, last name optional, only the fields sent change', async () => {
    const w = await world()
    const renamed = await patch(w, w.mine, { firstName: '  Mina  ', lastName: 'Shah' })
    expect(MemberDetailResponse.parse(renamed.body).member).toMatchObject({ firstName: 'Mina', lastName: 'Shah', name: 'Mina S.' })
    const single = await patch(w, w.mine, { lastName: '' })
    expect(MemberDetailResponse.parse(single.body).member).toMatchObject({ firstName: 'Mina', lastName: '', name: 'Mina' })
    expect((await patch(w, w.mine, { lastName: null })).status).toBe(200)
    for (const firstName of ['', '   ', null, 'x'.repeat(81)]) {
      const r = await patch(w, w.mine, { firstName })
      expect([r.status, r.body], String(firstName)).toEqual([400, error('memberFirstName')])
    }
    expect(await rowOf(w, w.mine)).toMatchObject({ firstName: 'Mina', lastName: null, coachId: w.coach.id })
    // A phone-only change keeps the name and the coach.
    const before = await rowOf(w, w.mine)
    await patch(w, w.mine, { phone: '312 555 0190' })
    expect(await rowOf(w, w.mine)).toEqual({ ...before, phone: '+13125550190' })
  })

  test('FR-MEMBER-02 the coach is one of the gym\'s active staff, or none; a blank phone clears it', async () => {
    const w = await world()
    await w.ctx.repos.users.setActive(w.gym.id, w.coach2.id, false)
    for (const coachId of [w.coach2.id, 0, 'Priya', 1.5]) {
      const r = await patch(w, w.mine, { coachId })
      expect([r.status, r.body], String(coachId)).toEqual([400, error('coachChoice')])
    }
    const none = MemberDetailResponse.parse((await patch(w, w.mine, { coachId: null, phone: '' })).body).member
    expect([none.coachId, none.coachName, none.phone]).toEqual([null, null, null])
    expect(MemberDetailResponse.parse((await patch(w, w.mine, { coachId: w.owner.id })).body).member.coachName).toBe('Mike R.')
  })

  test("FR-MEMBER-02 the phone is read in the gym's country", async () => {
    const w = await world()
    await w.ctx.repos.gyms.updateSettings(w.gym.id, { name: w.gym.name, timezone: 'Asia/Karachi', country: 'PK' })
    const r = await patch(w, w.mine, { phone: '0300 1234567' })
    expect(MemberDetailResponse.parse(r.body).member.phone).toBe('+923001234567')
  })

  test('FR-STAFF-06 a coach gets 403 on member edits and the permanent delete', async () => {
    const w = await world()
    for (const r of [await patch(w, w.mine, { phone: '312 555 0199' }, w.coachCookie), await remove(w, w.mine, w.coachCookie)]) {
      expect([r.status, r.body]).toEqual([403, error('role')])
    }
    expect(await phoneOf(w, w.mine)).not.toBe('+13125550199')
  })

  test('FR-LIVE-02 a coach change publishes member.updated for the old coach and the new one; other edits once', async () => {
    const w = await world()
    await patch(w, w.mine, { coachId: w.coach2.id })
    const updated = (coachId: number | null) => ({ type: 'member.updated', gymId: w.gym.id, memberId: w.mine, coachId })
    expect(w.events).toEqual([updated(w.coach.id), updated(w.coach2.id)])
    w.events.length = 0
    await patch(w, w.mine, { phone: '312 555 0190', firstName: 'Mo' })
    expect(w.events).toEqual([updated(w.coach2.id)])
    w.events.length = 0
    await patch(w, w.mine, { coachId: w.coach2.id })
    expect(w.events).toEqual([updated(w.coach2.id)])
  })

  test('FR-LIVE-01 a refused edit, or one with nothing in it, publishes nothing', async () => {
    const w = await world()
    await addMember(w, { first: 'Ann', daysSinceJoin: 10, phone: '+13125550001' })
    await patch(w, w.mine, { phone: '3125550001', coachId: w.coach2.id })
    await patch(w, w.mine, { coachId: 424242 })
    await patch(w, w.mine, {})
    expect(w.events).toEqual([])
  })
})

describe('add a member', () => {
  const leo = { firstName: 'Leo', joinedOn: TODAY }

  test('FR-MEM-05 the owner adds a member with a first name, optional last name, phone, joined date and coach', async () => {
    const w = await world()
    const r = await post(w, '/api/members', { firstName: ' Leo ', lastName: '', phone: '(312) 555-0188', joinedOn: addDays(TODAY, -3), coachId: w.coach2.id })
    expect(r.status).toBe(201)
    const { member, days, checkins } = MemberDetailResponse.strict().parse(r.body)
    expect(member).toMatchObject({ firstName: 'Leo', lastName: '', name: 'Leo', phone: '+13125550188', joinedOn: addDays(TODAY, -3), coachId: w.coach2.id, coachName: 'Jordan T.', source: 'app', status: 'new', daysSinceJoin: 3 })
    expect([days.length, checkins]).toEqual([90, []])
    expect(w.events).toEqual([{ type: 'member.joined', gymId: w.gym.id, memberId: member.id, coachId: w.coach2.id }])
    expect(await ids(w, w.ownerCookie)).toContain(member.id)
    // With no coach and no phone.
    const bare = MemberDetailResponse.parse((await post(w, '/api/members', leo)).body).member
    expect([bare.coachId, bare.phone, bare.lastName]).toEqual([null, null, ''])
  })

  test("FR-MEM-05 a coach's new member is theirs, whichever coach they name", async () => {
    const w = await world()
    for (const coachId of [w.coach2.id, null, undefined]) {
      const r = await post(w, '/api/members', { ...leo, coachId }, w.coachCookie)
      expect(r.status).toBe(201)
      const { member } = MemberDetailResponse.parse(r.body)
      expect(member.coachId).toBe(w.coach.id)
      expect(await ids(w, w.coachCookie)).toContain(member.id)
    }
  })

  test('FR-MEM-05 a taken phone is refused, and nothing is added', async () => {
    const w = await world()
    await addMember(w, { first: 'Ann', daysSinceJoin: 10, phone: '+13125550001' })
    const before = await ids(w, w.ownerCookie, 'everyone')
    const r = await post(w, '/api/members', { ...leo, phone: '312-555-0001' })
    expect([r.status, r.body]).toEqual([409, error('duplicate')])
    expect(await ids(w, w.ownerCookie, 'everyone')).toEqual(before)
    expect(w.events).toEqual([])
  })

  test("FR-MEM-05 the joined date is a real date, today or earlier in the gym's time zone", async () => {
    // 03:00Z on 7 Nov is still 6 Nov in Chicago.
    const w = await makeWorld({ clock: () => new Date('2026-11-07T03:00:00.000Z') })
    const cookie = await w.login(w.owner.email)
    const add = (joinedOn: unknown) => call(w.app, 'POST', '/api/members', { cookie, body: { firstName: 'Leo', joinedOn } })
    expect((await add('2026-11-06')).status).toBe(201)
    expect((await add('2024-02-29')).status).toBe(201)
    for (const joinedOn of ['2026-11-07', '2026-02-31', '1899-12-31', '11/06/2026', '', null, undefined]) {
      const r = await add(joinedOn)
      expect([r.status, r.body], String(joinedOn)).toEqual([400, error('joinedOn')])
    }
  })

  test('FR-MEM-05 a first name, a readable phone and an active coach are needed', async () => {
    const w = await world()
    await w.ctx.repos.users.setActive(w.gym.id, w.coach2.id, false)
    const cases: [unknown, ErrorCode][] = [
      [{ ...leo, firstName: ' ' }, 'memberFirstName'],
      [{ joinedOn: TODAY }, 'memberFirstName'],
      [{ ...leo, phone: '12' }, 'phone'],
      [{ ...leo, coachId: w.coach2.id }, 'coachChoice'],
      [{ ...leo, coachId: 424242 }, 'coachChoice'],
    ]
    for (const [body, code] of cases) {
      const r = await post(w, '/api/members', body)
      expect([r.status, r.body], JSON.stringify(body)).toEqual([400, error(code)])
    }
    expect(w.events).toEqual([])
  })
})

describe('archive and restore', () => {
  test('FR-MEMBER-05 owners archive any member, coaches their own; the page still answers, with the time', async () => {
    const w = await world()
    const r = await archive(w, w.theirs)
    expect(r.status).toBe(200)
    expect(MemberDetailResponse.strict().parse(r.body).member.archivedAt).toBe(w.ctx.clock().toISOString())
    expect((await archive(w, w.mine, w.coachCookie)).status).toBe(200)
    const other = await archive(w, w.owners, w.coachCookie)
    expect([other.status, other.body]).toEqual([404, error('memberNotFound')])
    expect((await rowOf(w, w.owners))?.archivedAt).toBeNull()
    expect((await page(w, w.coachCookie, w.mine)).member.archivedAt).not.toBeNull()
    const updated = (memberId: number, coachId: number) => ({ type: 'member.updated', gymId: w.gym.id, memberId, coachId })
    expect(w.events).toEqual([updated(w.theirs, w.coach2.id), updated(w.mine, w.coach.id)])
  })

  test('FR-MEMBER-05 archiving twice keeps the first time and publishes once', async () => {
    let now = new Date('2026-11-06T18:00:00.000Z')
    const w = await makeWorld({ clock: () => new Date(now) })
    const cookie = await w.login(w.owner.email)
    const id = await addMember(w, { first: 'Sam', daysSinceJoin: 5 })
    const events: LiveEvent[] = []
    w.ctx.bus.subscribe((e) => events.push(e))
    const archivedAt = async () => MemberDetailResponse.parse((await call(w.app, 'POST', `/api/members/${id}/archive`, { cookie })).body).member.archivedAt
    expect(await archivedAt()).toBe('2026-11-06T18:00:00.000Z')
    now = new Date('2026-11-06T18:05:00.000Z')
    expect(await archivedAt()).toBe('2026-11-06T18:00:00.000Z')
    expect(events).toHaveLength(1)
  })

  test('FR-MEMBER-05 an archived member leaves Today, the board and the first 90 days, and still has a page', async () => {
    const w = await world()
    await archive(w, w.theirs)
    const today = TodayResponse.parse((await call(w.app, 'GET', '/api/today', { cookie: w.ownerCookie })).body)
    expect(new Set(today.board.map((s) => s.id))).toEqual(new Set([w.mine, w.owners]))
    expect(today.slipping).toEqual([])
    expect(today.kpis.newMembers).toBe(2)
    expect(today.kpis.slipping).toBe(0)
    expect(await ids(w, w.ownerCookie)).not.toContain(w.theirs)
    expect((await page(w, w.ownerCookie, w.theirs)).member.id).toBe(w.theirs)
  })

  test("FR-MEMBER-05 a member archived after checking in today leaves Today's check-ins", async () => {
    const w = await world()
    // Now is 2026-11-06 12:00 in Chicago: both check-ins are today, at 09:00 local.
    const checkins = [w.mine, w.theirs].map((memberId) => ({ memberId, at: '2026-11-06T15:00:00.000Z' }))
    await w.ctx.repos.members.applyImport({ gymId: w.gym.id, at: w.ctx.clock().toISOString(), creates: [], updates: [], checkins })
    const checkedIn = async (cookie: string) =>
      TodayResponse.parse((await call(w.app, 'GET', '/api/today', { cookie })).body).checkinsToday.map((c) => c.memberId)
    expect(new Set(await checkedIn(w.ownerCookie))).toEqual(new Set([w.mine, w.theirs]))
    await archive(w, w.theirs)
    await archive(w, w.mine, w.coachCookie)
    expect(await checkedIn(w.ownerCookie)).toEqual([])
    expect(await checkedIn(w.coachCookie)).toEqual([])
  })

  test('FR-MEMBER-05 a scope whose members are all archived has no members on Today', async () => {
    const w = await world()
    const hasMembers = async (cookie: string) =>
      TodayResponse.parse((await call(w.app, 'GET', '/api/today', { cookie })).body).hasMembers
    // Past the first 90 days, so the board can't answer it.
    const old = await addMember(w, { first: 'Old', coachId: w.coach.id, daysSinceJoin: 200 })
    await archive(w, w.mine, w.coachCookie)
    expect(await hasMembers(w.coachCookie)).toBe(true)
    await archive(w, old, w.coachCookie)
    expect(await hasMembers(w.coachCookie)).toBe(false)
    expect(await hasMembers(w.ownerCookie)).toBe(true)
    await archive(w, w.theirs)
    await archive(w, w.owners)
    expect(await hasMembers(w.ownerCookie)).toBe(false)
  })

  test('FR-MEMBER-06 restoring clears the archive, with the same permissions, and brings the member back', async () => {
    const w = await world()
    await archive(w, w.mine)
    await archive(w, w.theirs)
    w.events.length = 0
    const other = await restore(w, w.theirs, w.coachCookie)
    expect([other.status, other.body]).toEqual([404, error('memberNotFound')])
    const back = await restore(w, w.mine, w.coachCookie)
    expect(MemberDetailResponse.parse(back.body).member.archivedAt).toBeNull()
    expect((await restore(w, w.theirs)).status).toBe(200)
    expect(new Set(await ids(w, w.ownerCookie))).toEqual(new Set([w.mine, w.theirs, w.owners]))
    // A repeat answers the member as they are, and publishes nothing more.
    expect((await restore(w, w.mine)).status).toBe(200)
    const updated = (memberId: number, coachId: number) => ({ type: 'member.updated', gymId: w.gym.id, memberId, coachId })
    expect(w.events).toEqual([updated(w.mine, w.coach.id), updated(w.theirs, w.coach2.id)])
  })
})

describe('permanent delete', () => {
  test('FR-MEMBER-07 only an archived member is deleted', async () => {
    const w = await world()
    const r = await remove(w, w.mine)
    expect([r.status, r.body]).toEqual([409, error('memberNotArchived')])
    expect((await rowOf(w, w.mine))?.id).toBe(w.mine)
    expect(w.events).toEqual([])
  })

  test("FR-PRIV-03 deleting an archived member takes their check-ins and nudges too, and publishes the coach they had", async () => {
    const w = await world()
    await w.ctx.repos.nudges.record({ gymId: w.gym.id, memberId: w.mine, userId: w.coach.id, templateId: null, body: 'Hi', sentAt: w.ctx.clock().toISOString() })
    await w.ctx.repos.nudges.record({ gymId: w.gym.id, memberId: w.theirs, userId: w.coach2.id, templateId: null, body: 'Hi', sentAt: w.ctx.clock().toISOString() })
    await archive(w, w.mine)
    w.events.length = 0
    const r = await remove(w, w.mine)
    expect([r.status, r.body]).toEqual([200, { ok: true }])
    expect(w.events).toEqual([{ type: 'member.deleted', gymId: w.gym.id, memberId: w.mine, coachId: w.coach.id }])
    expect((await call(w.app, 'GET', `/api/members/${w.mine}`, { cookie: w.ownerCookie })).status).toBe(404)
    expect(await ids(w, w.ownerCookie, 'archived')).toEqual([])
  })

  test('NFR-PRIV-02 a deleted member leaves the live database, with their visits and nudges; others keep theirs', async () => {
    const w = await world()
    await w.ctx.repos.nudges.record({ gymId: w.gym.id, memberId: w.mine, userId: w.coach.id, templateId: null, body: 'Hi', sentAt: w.ctx.clock().toISOString() })
    const checkinsBefore = await w.ctx.repos.checkins.listByGym(w.gym.id)
    await archive(w, w.mine)
    await remove(w, w.mine)
    expect(await rowOf(w, w.mine)).toBeUndefined()
    expect(await w.ctx.repos.checkins.listByGym(w.gym.id)).toEqual(checkinsBefore.filter((c) => c.memberId !== w.mine))
    expect(await w.ctx.repos.nudges.listByGym(w.gym.id)).toEqual([])
  })
})

describe("another gym's members", () => {
  test("FR-PRIV-02 another gym's owner finds none of this gym's members: every read and write is not found", async () => {
    const w = await world()
    const eve = await otherGym(w)
    await archive(w, w.theirs)
    expect(await ids(w, eve)).toEqual([])
    expect(await ids(w, eve, 'everyone')).toEqual([])
    expect(await ids(w, eve, 'archived')).toEqual([])
    w.events.length = 0
    const tries = [
      await call(w.app, 'GET', `/api/members/${w.mine}`, { cookie: eve }),
      await patch(w, w.mine, { phone: '312 555 0191' }, eve),
      await archive(w, w.mine, eve),
      await restore(w, w.theirs, eve),
      await remove(w, w.theirs, eve),
    ]
    for (const r of tries) expect([r.status, r.body]).toEqual([404, error('memberNotFound')])
    expect(w.events).toEqual([])
    expect((await rowOf(w, w.theirs))?.archivedAt).not.toBeNull()
  })

  test("FR-PRIV-02 a coach chosen from another gym's staff is refused", async () => {
    const w = await world()
    await otherGym(w)
    const eve = await w.ctx.repos.users.findByEmail('eve@eastside.test')
    expect((await patch(w, w.mine, { coachId: eve?.id })).status).toBe(400)
    expect((await post(w, '/api/members', { firstName: 'Leo', joinedOn: TODAY, coachId: eve?.id })).status).toBe(400)
  })
})

test('NFR-SEC-04 signed-out requests to the members routes get 401', async () => {
  const w = await world()
  const tries: [string, string][] = [
    ['GET', '/api/members'],
    ['POST', '/api/members'],
    ['GET', `/api/members/${w.mine}`],
    ['PATCH', `/api/members/${w.mine}`],
    ['DELETE', `/api/members/${w.mine}`],
    ['POST', `/api/members/${w.mine}/archive`],
    ['POST', `/api/members/${w.mine}/restore`],
  ]
  for (const [method, path] of tries) {
    const r = await call(w.app, method, path, method === 'GET' ? {} : { body: {} })
    expect([r.status, r.body], `${method} ${path}`).toEqual([401, error('signIn')])
  }
})
