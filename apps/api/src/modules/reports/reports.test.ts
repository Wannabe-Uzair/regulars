import { ReportsResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { createDb, createRepositories } from '@tenure/db'
import { DEMO_PASSWORD, SEED_TIMEZONE, seedNorthside } from '@tenure/db/seed'
import { buildReports, DEFAULT_TEMPLATES } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { hashPassword } from '../../platform/auth/password.ts'
import { createTestContext, TEST_NOW } from '../../platform/context.ts'
import { call, cookieOf } from '../../test/http.ts'
import { addMember } from '../../test/members.ts'
import { makeWorld, TODAY } from '../../test/world.ts'

/** The app over a fresh database holding the Northside demo, seeded for TEST_NOW's day, with its owner's and a coach's cookies. */
async function seededWorld() {
  const { db } = createDb(':memory:')
  const seed = await seedNorthside(db, {
    timezone: SEED_TIMEZONE,
    now: TEST_NOW,
    hashPassword,
    newToken: () => 'kiosk-token-demo',
    templates: DEFAULT_TEMPLATES,
  })
  const app = createApp(createTestContext({ repos: createRepositories(db) }))
  const login = async (role: 'owner' | 'coach') => {
    const user = seed.users.find((u) => u.role === role)
    if (!user) throw new Error(`seed: no ${role}`)
    const r = await call(app, 'POST', '/api/auth/login', { body: { email: user.email, password: DEMO_PASSWORD } })
    if (r.status !== 200) throw new Error(`login failed: ${r.status}`)
    return cookieOf(r.res)
  }
  return { app, seed, login }
}

describe('the Northside demo', () => {
  // Ported from legacy/app/server/test/reports.test.mjs.
  test('FR-REPORT-01 GET /api/reports equals buildReports on the seed data; owner only', async () => {
    const w = await seededWorld()
    const r = await call(w.app, 'GET', '/api/reports', { cookie: await w.login('owner') })
    expect(r.status).toBe(200)
    const { data, ids } = w.seed
    const id = (key: string) => ids.get(key) ?? -1
    const expected = buildReports({
      today: TODAY,
      now: TEST_NOW.toISOString(),
      timeZone: data.gym.timezone,
      pilotStartedOn: data.gym.pilotStartedOn,
      members: data.members.map((m) => ({ id: id(m.key), joinedOn: m.joinedOn })),
      checkins: data.checkins.map((c) => ({ memberId: id(c.memberKey), at: c.at })),
      nudges: data.nudges.map((n) => ({ memberId: id(n.memberKey), sentAt: n.sentAt })),
    })
    expect(ReportsResponse.strict().parse(r.body)).toEqual(expected)
    expect(expected.cohorts).toHaveLength(4)
    expect(expected.nudges.sent).toBeGreaterThan(0)
    const coach = await call(w.app, 'GET', '/api/reports', { cookie: await w.login('coach') })
    expect([coach.status, coach.body]).toEqual([403, { error: { code: 'role', message: t('api.role') } }])
    const out = await call(w.app, 'GET', '/api/reports')
    expect([out.status, out.body]).toEqual([401, { error: { code: 'signIn', message: t('api.signIn') } }])
  })

  test("FR-REPORT-01 archived members are members still: archiving them through the API leaves Reports as it was", async () => {
    const w = await seededWorld()
    const cookie = await w.login('owner')
    const before = await call(w.app, 'GET', '/api/reports', { cookie })
    const ids = [...w.seed.ids.values()].slice(0, 3)
    for (const id of ids) {
      expect((await call(w.app, 'POST', `/api/members/${id}/archive`, { cookie })).status).toBe(200)
    }
    const after = await call(w.app, 'GET', '/api/reports', { cookie })
    expect(after.status).toBe(200)
    expect(after.body).toEqual(before.body)
  })

  // Ported from legacy/app/server/reports/test/reports.test.mjs ("smoke: Northside demo gym"), through the API.
  test('FR-REPORT-01 smoke: Northside demo gym', async () => {
    const w = await seededWorld()
    const r = ReportsResponse.parse((await call(w.app, 'GET', '/api/reports', { cookie: await w.login('owner') })).body)
    expect(r.cohorts).toHaveLength(4)
    expect(r.cohorts[3]?.month).toBe('2026-11')
    expect(r.visitsByWeek).toHaveLength(13)
    for (const wk of r.visitsByWeek.slice(3, 9)) {
      if (wk.stillComing !== null && wk.slipped !== null)
        expect(wk.stillComing, `week ${wk.week}`).toBeGreaterThan(wk.slipped)
    }
    expect(r.nudges.cameBack, `cameBack ${r.nudges.cameBack}`).toBeGreaterThanOrEqual(5)
    expect(r.nudges.rate).toBeGreaterThanOrEqual(0)
    expect(r.nudges.rate).toBeLessThanOrEqual(100)
  })
})

test("FR-REPORT-03 a gym far east of UTC: months, join days and nudges follow Auckland's day, a day ahead of UTC's", async () => {
  // 12:00Z on 30 Nov is 01:00 on 1 Dec in Auckland (NZDT, +13), while Chicago and UTC are still in November.
  const now = '2026-11-30T12:00:00.000Z'
  const w = await makeWorld({ clock: () => new Date(now) })
  const { repos } = w.ctx
  await repos.gyms.updateSettings(w.gym.id, { name: w.gym.name, timezone: 'Pacific/Auckland' })
  const { created } = await repos.members.applyImport({
    gymId: w.gym.id,
    at: now,
    creates: [
      {
        firstName: 'Aroha',
        lastName: 'Ngata',
        phone: null,
        email: null,
        joinedOn: '2026-12-01',
        coachId: w.owner.id,
        externalId: null,
      },
    ],
    updates: [],
    checkins: [],
  })
  const memberId = created[0]?.id ?? -1
  // 00:30 on 1 Dec there: nudged; 00:45: came back.
  await repos.nudges.record({
    gymId: w.gym.id,
    memberId,
    userId: w.owner.id,
    templateId: null,
    body: 'Hi',
    sentAt: '2026-11-30T11:30:00.000Z',
  })
  await repos.members.applyImport({
    gymId: w.gym.id,
    at: now,
    creates: [],
    updates: [],
    checkins: [{ memberId, at: '2026-11-30T11:45:00.000Z' }],
  })
  const r = await call(w.app, 'GET', '/api/reports', { cookie: await w.login(w.owner.email) })
  const body = ReportsResponse.parse(r.body)
  // The world's pilot started on 14 Oct, so the rows begin in October, not three months back.
  expect(body.cohorts.map((c) => [c.month, c.joined])).toEqual([
    ['2026-10', 0],
    ['2026-11', 0],
    ['2026-12', 1],
  ])
  expect(body.nudges).toEqual({ sent: 1, cameBack: 1, waiting: 0, rate: 100 })
})

test("FR-PRIV-02 a gym's reports count only its own members, check-ins and nudges", async () => {
  const w = await makeWorld()
  const { repos } = w.ctx
  const mine = await addMember(w, { first: 'Pat', daysSinceJoin: 40, weeks: [3, 3, 3, 3, 3] })
  await repos.nudges.record({
    gymId: w.gym.id,
    memberId: mine,
    userId: w.owner.id,
    templateId: null,
    body: 'Hi',
    sentAt: '2026-11-01T18:00:00.000Z',
  })
  const before = (await call(w.app, 'GET', '/api/reports', { cookie: await w.login(w.owner.email) })).body

  // Another gym in the same database, with a member who joined the same day, their visits and a nudge.
  const other = await repos.gyms.createWithOwner({
    gym: {
      name: 'Eastside Barbell',
      slug: 'eastside',
      timezone: 'America/Chicago',
      pilotStartedOn: TODAY,
      kioskToken: 'kiosk-token-2',
    },
    owner: { email: 'ana@eastside.test', name: 'Ana E.', passwordHash: 'unused' },
    templates: DEFAULT_TEMPLATES,
    createdAt: TEST_NOW.toISOString(),
  })
  const { created } = await repos.members.applyImport({
    gymId: other.gym.id,
    at: TEST_NOW.toISOString(),
    creates: [
      {
        firstName: 'Lee',
        lastName: null,
        phone: null,
        email: null,
        joinedOn: '2026-09-27',
        coachId: other.owner.id,
        externalId: null,
      },
    ],
    updates: [],
    checkins: [],
  })
  const theirs = created[0]?.id ?? -1
  await repos.members.applyImport({
    gymId: other.gym.id,
    at: TEST_NOW.toISOString(),
    creates: [],
    updates: [],
    checkins: [{ memberId: theirs, at: '2026-10-28T18:00:00.000Z' }],
  })
  await repos.nudges.record({
    gymId: other.gym.id,
    memberId: theirs,
    userId: other.owner.id,
    templateId: null,
    body: 'Hi',
    sentAt: '2026-11-02T18:00:00.000Z',
  })

  const after = (await call(w.app, 'GET', '/api/reports', { cookie: await w.login(w.owner.email) })).body
  expect(after).toEqual(before)
  const r = ReportsResponse.parse(after)
  expect(r.cohorts.find((c) => c.month === '2026-09')?.joined).toBe(1)
  expect(r.nudges.sent).toBe(1)
})
