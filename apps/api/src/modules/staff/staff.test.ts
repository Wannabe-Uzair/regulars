import { CoachesResponse, CoachPatchResponse, type ErrorCode, type LiveEvent } from '@tenure/contracts'
import type { UserRole } from '@tenure/db'
import { describe, expect, test } from 'vitest'
import { errorBody } from '../../platform/http/errors.ts'
import { sha256 } from '../../platform/auth/token.ts'
import { call, cookieOf } from '../../test/http.ts'
import { addMember } from '../../test/members.ts'
import { openStream, readToEnd } from '../../test/sse.ts'
import { makeWorld, PASSWORD, type World } from '../../test/world.ts'

const err = (code: ErrorCode) => errorBody(code)
const patch = (w: World, cookie: string, id: number | string, body: unknown) =>
  call(w.app, 'PATCH', `/api/coaches/${id}`, { cookie, body })
const login = (w: World, email: string) =>
  call(w.app, 'POST', '/api/auth/login', { body: { email, password: PASSWORD } })

/** The live events the world's bus carries from now on. */
function heard(w: World): LiveEvent[] {
  const events: LiveEvent[] = []
  w.ctx.bus.subscribe((e) => events.push(e))
  return events
}

/** Someone new on the world's staff, with PASSWORD, through an invite as the app makes them. */
async function addStaff(w: World, role: UserRole, name: string, email: string) {
  const createdAt = w.ctx.clock().toISOString()
  const tokenHash = sha256(`staff-${email}`)
  await w.ctx.repos.invites.create({ tokenHash, gymId: w.gym.id, role, name: email, createdBy: w.owner.id, createdAt })
  const user = await w.ctx.repos.invites.accept({
    tokenHash,
    liveSince: '1970-01-01T00:00:00.000Z',
    acceptedAt: createdAt,
    user: { email, name, passwordHash: w.owner.passwordHash },
  })
  if (!user) throw new Error(`could not add ${email}`)
  return user
}

describe('GET /api/coaches', () => {
  test('FR-STAFF-02 GET /api/coaches lists staff with member and slipping counts, owner included', async () => {
    const w = await makeWorld()
    await addMember(w, { first: 'A', coachId: w.coach.id, daysSinceJoin: 20, weeks: [1, 1] })
    await addMember(w, { first: 'B', coachId: w.coach.id, daysSinceJoin: 20, weeks: [3, 3] })
    await addMember(w, { first: 'C', coachId: w.owner.id, daysSinceJoin: 5 })
    const r = await call(w.app, 'GET', '/api/coaches', { cookie: await w.login(w.owner.email) })
    expect(r.status).toBe(200)
    const { staff } = CoachesResponse.strict().parse(r.body)
    expect(staff.map((c) => [c.name, c.role, c.active, c.members, c.slipping])).toEqual([
      ['Mike R.', 'owner', true, 1, 0],
      ['Jordan T.', 'coach', true, 0, 0],
      ['Priya S.', 'coach', true, 2, 1],
    ])
    expect(staff[2]).toEqual({ id: w.coach.id, name: 'Priya S.', email: 'priya@northside.test', role: 'coach', active: true, members: 2, slipping: 1 })
  })

  test('FR-STAFF-02 counts only members in the 90-day window and not archived; inactive staff are listed, marked', async () => {
    const w = await makeWorld()
    await addMember(w, { first: 'In', coachId: w.coach.id, daysSinceJoin: 89, weeks: Array<number>(12).fill(3) })
    await addMember(w, { first: 'Past', coachId: w.coach.id, daysSinceJoin: 90 })
    const archived = await addMember(w, { first: 'Gone', coachId: w.coach.id, daysSinceJoin: 30, weeks: [1, 1] })
    // No repository archives a member yet (API-MEMBERS adds it), so the read is the one an archive leaves behind.
    const real = w.ctx.repos.members
    w.ctx.repos.members = {
      ...real,
      summaryInputs: async (scope, filter) => {
        const inputs = await real.summaryInputs(scope, filter)
        const members = inputs.members.map((m) => (m.id === archived ? { ...m, archivedAt: w.ctx.clock().toISOString() } : m))
        return { ...inputs, members }
      },
    }
    await w.ctx.repos.users.setActive(w.gym.id, w.coach2.id, false)
    const r = await call(w.app, 'GET', '/api/coaches', { cookie: await w.login(w.owner.email) })
    const { staff } = CoachesResponse.parse(r.body)
    expect(staff.map((c) => [c.name, c.active, c.members, c.slipping])).toEqual([
      ['Mike R.', true, 0, 0],
      ['Jordan T.', false, 0, 0],
      ['Priya S.', true, 1, 0],
    ])
  })

  test('FR-STAFF-06 is owner only: a coach gets 403, signed out 401', async () => {
    const w = await makeWorld()
    expect(await call(w.app, 'GET', '/api/coaches', { cookie: await w.login(w.coach.email) })).toMatchObject({ status: 403, body: err('role') })
    expect(await call(w.app, 'GET', '/api/coaches')).toMatchObject({ status: 401, body: err('signIn') })
  })
})

describe('PATCH /api/coaches/:id', () => {
  test('FR-STAFF-05 deactivating keeps their history, drops them from kiosk walk-ins, and publishes staff.updated', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { first: 'Sam', coachId: w.coach.id, daysSinceJoin: 20, weeks: [2, 2] })
    const owner = await w.login(w.owner.email)
    const events = heard(w)
    const r = await patch(w, owner, w.coach.id, { active: false })
    expect(r.status).toBe(200)
    expect(CoachPatchResponse.strict().parse(r.body)).toEqual({
      id: w.coach.id,
      name: 'Priya S.',
      email: 'priya@northside.test',
      role: 'coach',
      active: false,
    })
    expect(events).toEqual([{ type: 'staff.updated', gymId: w.gym.id }])
    // History stays: the member keeps their coach and visits, and the staff row its counts.
    expect(await w.ctx.repos.members.findInScope({ gymId: w.gym.id }, sam)).toMatchObject({ coachId: w.coach.id })
    expect((await w.ctx.repos.members.summaryInputs({ gymId: w.gym.id }, { ids: [sam] })).checkins).toHaveLength(4)
    const list = CoachesResponse.parse((await call(w.app, 'GET', '/api/coaches', { cookie: owner })).body)
    expect(list.staff.find((c) => c.id === w.coach.id)).toMatchObject({ active: false, members: 1 })
    // The kiosk's round-robin reads the active staff.
    expect((await w.ctx.repos.users.listActiveByGym(w.gym.id)).map((u) => u.id)).toEqual([w.owner.id, w.coach2.id])
  })

  test('FR-AUTH-06 a deactivated coach cannot log in and loses their sessions', async () => {
    const w = await makeWorld()
    const coachCookie = await w.login(w.coach.email)
    const owner = await w.login(w.owner.email)
    expect((await patch(w, owner, w.coach.id, { active: false })).status).toBe(200)
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: coachCookie })).status).toBe(401)
    expect(await login(w, w.coach.email)).toMatchObject({ status: 401, body: err('loginMismatch') })
  })

  test('FR-AUTH-06 deactivating a coach ends their open stream at once, before they hear anything', async () => {
    const w = await makeWorld()
    const reader = await openStream(w.app, await w.login(w.coach.email))
    const owner = await w.login(w.owner.email)
    expect((await patch(w, owner, w.coach.id, { active: false })).status).toBe(200)
    // The PATCH's own staff.updated finds the session gone: no heartbeat is waited for.
    const { text, ended } = await readToEnd(reader, 500)
    expect(text).not.toContain('staff.updated')
    expect(ended).toBe(true)
  })

  test('FR-STAFF-05 reactivating lets them log in again, and publishes staff.updated', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    await patch(w, owner, w.coach.id, { active: false })
    const events = heard(w)
    const r = await patch(w, owner, w.coach.id, { active: true })
    expect(r).toMatchObject({ status: 200, body: { id: w.coach.id, active: true } })
    expect(events).toEqual([{ type: 'staff.updated', gymId: w.gym.id }])
    expect((await login(w, w.coach.email)).status).toBe(200)
  })

  test("FR-STAFF-05 the last active owner can't be deactivated; one of two owners can", async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const events = heard(w)
    expect(await patch(w, owner, w.owner.id, { active: false })).toMatchObject({ status: 400, body: err('ownerActive') })
    expect(events).toEqual([])
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: owner })).status).toBe(200)

    const sara = await addStaff(w, 'owner', 'Sara K.', 'sara@northside.test')
    expect(await patch(w, owner, sara.id, { active: false })).toMatchObject({ status: 200, body: { role: 'owner', active: false } })
    expect(await patch(w, owner, w.owner.id, { active: false })).toMatchObject({ status: 400, body: err('ownerActive') })
    expect((await patch(w, owner, sara.id, { active: true })).status).toBe(200)
    expect(await patch(w, owner, w.owner.id, { active: false })).toMatchObject({ status: 200, body: { active: false } })
  })

  test('FR-STAFF-05 two owners deactivating each other at once leave one active', async () => {
    const w = await makeWorld()
    const sara = await addStaff(w, 'owner', 'Sara K.', 'sara@northside.test')
    const [mike, saraCookie] = [await w.login(w.owner.email), await w.login(sara.email)]
    const results = await Promise.all([patch(w, mike, sara.id, { active: false }), patch(w, saraCookie, w.owner.id, { active: false })])
    expect(results.map((r) => r.status).sort()).toEqual([200, 400])
    expect((await w.ctx.repos.users.listActiveByGym(w.gym.id)).filter((u) => u.role === 'owner')).toHaveLength(1)
  })

  test('FR-PRIV-02 an unknown id, one that is not an id, and another gym\'s user are coachNotFound, checked before the body', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const other = await call(w.app, 'POST', '/api/auth/signup', {
      body: { gymName: 'Southside', name: 'Ana Ruiz', email: 'ana@southside.test', password: 'longenough', country: 'US' },
    })
    const ana = (other.body as { user: { id: number } }).user.id
    for (const id of [999_999, 'abc', ana]) {
      expect(await patch(w, owner, id, { active: false }), String(id)).toMatchObject({ status: 404, body: err('coachNotFound') })
      expect((await patch(w, owner, id, 'not json')).status, String(id)).toBe(404)
    }
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: cookieOf(other.res) })).status).toBe(200)
  })

  test('FR-STAFF-05 a missing or non-boolean flag is coachActive; a body that is not an object, generic', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    expect(await patch(w, owner, w.coach.id, {})).toMatchObject({ status: 400, body: err('coachActive') })
    expect(await patch(w, owner, w.coach.id, { active: 'false' })).toMatchObject({ status: 400, body: err('coachActive') })
    expect(await patch(w, owner, w.coach.id, [false])).toMatchObject({ status: 400, body: err('generic') })
    expect((await login(w, w.coach.email)).status).toBe(200)
  })

  test('FR-STAFF-06 is owner only: a coach gets 403 and changes nobody', async () => {
    const w = await makeWorld()
    const coach = await w.login(w.coach.email)
    expect(await patch(w, coach, w.coach2.id, { active: false })).toMatchObject({ status: 403, body: err('role') })
    expect((await login(w, w.coach2.email)).status).toBe(200)
  })
})
