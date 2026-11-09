// The stall demo (FR-WEB-04, FR-OPS-03, TC-87): "Try the demo", and the demo reset as `npm run demo:reset` runs it and
// as the stall-mode button's route does, on a seeded database file the app has open.
import { DemoStatus, LiveEvent, MeResponse, ResetDemoResponse } from '@tenure/contracts'
import { checkins, createDb, createRepositories, gyms, invites, members, nudges, sessions, templates, users, type Db } from '@tenure/db'
import { SEED_TIMEZONE, seedNorthside } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES } from '@tenure/domain'
import { asc, eq } from 'drizzle-orm'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { hashPassword } from '../../platform/auth/password.ts'
import { newToken } from '../../platform/auth/token.ts'
import { loadConfig } from '../../platform/config.ts'
import { createTestContext, TEST_NOW } from '../../platform/context.ts'
import { demoResetCommand } from '../../seed.ts'
import { call, cookieOf } from '../../test/http.ts'
import { scratchDir } from '../../test/scratch.ts'
import { defaultModules } from '../index.ts'
import { createDemoModule } from './index.ts'

const dir = scratchDir('demo')
const ENV = { TENURE_TZ: SEED_TIMEZONE }
const closers: (() => void)[] = []
afterEach(() => {
  for (const close of closers.splice(0)) close()
})

let files = 0
/** A seeded database file for TEST_NOW's day, and the app over it, in stall mode unless told otherwise. */
async function stallWorld({ stall = true } = {}) {
  const file = path.join(dir, `demo-${++files}.db`)
  const { db, close } = createDb(file)
  closers.push(close)
  const seeded = await seedNorthside(db, { timezone: SEED_TIMEZONE, now: TEST_NOW, hashPassword, newToken, templates: DEFAULT_TEMPLATES })
  const ctx = createTestContext({
    config: loadConfig({ TENURE_DB: file, TENURE_SERVE_CLIENT: stall ? '1' : '0' }),
    repos: createRepositories(db),
  })
  const modules = defaultModules.map((m) => (m.name === 'demo' ? createDemoModule(ENV) : m))
  const app = createApp(ctx, modules, { webDist: path.join(dir, 'no-web-build') })
  return { file, db, ctx, app, seeded }
}

/** The demo gym's rows with every id swapped for its row's place, so a reset compares equal to the seed it repeats. */
function snapshot(db: Db) {
  const gym = db.select().from(gyms).where(eq(gyms.isDemo, true)).get()!
  const userRows = db.select().from(users).where(eq(users.gymId, gym.id)).orderBy(asc(users.id)).all()
  const memberRows = db.select().from(members).where(eq(members.gymId, gym.id)).orderBy(asc(members.id)).all()
  const place = (rows: readonly { id: number }[]) => (id: number | null) => (id === null ? null : rows.findIndex((r) => r.id === id))
  const [user, member] = [place(userRows), place(memberRows)]
  // Ids change with a reset, and each password hash has its own salt.
  const bare = (row: object) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id' && k !== 'passwordHash'))
  return {
    gym,
    users: userRows.map(bare),
    templates: db.select({ name: templates.name, body: templates.body, sort: templates.sort }).from(templates).where(eq(templates.gymId, gym.id)).orderBy(asc(templates.id)).all(),
    members: memberRows.map((m) => ({ ...bare(m), coach: user(m.coachId) })),
    checkins: db.select().from(checkins).where(eq(checkins.gymId, gym.id)).orderBy(asc(checkins.id)).all().map((c) => [member(c.memberId), c.at]),
    nudges: db.select().from(nudges).where(eq(nudges.gymId, gym.id)).orderBy(asc(nudges.id)).all().map((n) => [member(n.memberId), user(n.userId), n.sentAt]),
    invites: db.select().from(invites).where(eq(invites.gymId, gym.id)).all(),
    sessions: db.select().from(sessions).all(),
  }
}

async function tryTheDemo(w: Awaited<ReturnType<typeof stallWorld>>) {
  const r = await call(w.app, 'POST', '/api/demo/try', { body: {} })
  expect(r.status).toBe(200)
  return { me: MeResponse.parse(r.body), cookie: cookieOf(r.res) }
}

/**
 * A visitor's stay: a join and a check-in at the kiosk, then, as the demo owner, a member's phone, the gym's name and
 * country, an invite, a deactivated coach and a deleted template. Answers the visitor's cookie.
 */
async function visit(w: Awaited<ReturnType<typeof stallWorld>>) {
  const token = w.seeded.kioskToken
  const join = await call(w.app, 'POST', `/api/kiosk/${token}/join`, { body: { firstName: 'Visitor' } })
  expect(join.status).toBe(200)
  const { cookie } = await tryTheDemo(w)
  const [first] = w.db.select().from(members).orderBy(asc(members.id)).limit(1).all()
  const coach = w.seeded.users.find((u) => u.role === 'coach')!
  const template = w.db.select().from(templates).orderBy(asc(templates.id)).limit(1).get()!
  for (const [method, url, body] of [
    ['PATCH', `/api/members/${first!.id}`, { phone: '+13125550999' }],
    ['POST', '/api/members', { firstName: 'Walk', lastName: 'In', phone: '+13125550998', joinedOn: '2026-11-06' }],
    ['PATCH', '/api/settings', { name: 'Visitor Gym', country: 'GB', timezone: 'Europe/London' }],
    ['POST', '/api/invites', { email: 'friend@example.com', role: 'coach' }],
    ['PATCH', `/api/coaches/${coach.id}`, { active: false }],
    ['DELETE', `/api/templates/${template.id}`, undefined],
  ] as const) {
    const { res: r } = await call(w.app, method, url, { cookie, body: body ?? {} })
    expect([url, r.ok]).toEqual([url, true])
  }
  return cookie
}

describe('FR-WEB-04 Try the demo', () => {
  test('outside stall mode GET /api/demo says so, and Try the demo and Reset the demo answer 404', async () => {
    const w = await stallWorld({ stall: false })
    const before = snapshot(w.db)
    const status = await call(w.app, 'GET', '/api/demo')
    expect([status.status, DemoStatus.parse(status.body)]).toEqual([200, { stall: false }])
    for (const action of ['try', 'reset']) {
      const r = await call(w.app, 'POST', `/api/demo/${action}`, { body: {} })
      expect([r.status, (r.body as { error: { code: string } }).error.code]).toEqual([404, 'notFound'])
      expect(r.res.headers.get('set-cookie')).toBeNull()
    }
    expect(snapshot(w.db)).toEqual(before)
  })

  test("in stall mode one tap signs the visitor in as the demo gym's owner, with the owner's pages usable", async () => {
    const w = await stallWorld()
    const status = await call(w.app, 'GET', '/api/demo')
    expect(DemoStatus.parse(status.body)).toEqual({ stall: true })

    const { me, cookie } = await tryTheDemo(w)
    expect(me.user).toMatchObject({ email: 'mike@northside.test', role: 'owner' })
    expect(me.gym).toMatchObject({ id: w.seeded.gymId, isDemo: true })
    const again = await call(w.app, 'GET', '/api/auth/me', { cookie })
    expect(MeResponse.parse(again.body)).toEqual(me)
    for (const url of ['/api/settings', '/api/coaches', '/api/members', '/api/today']) {
      expect([url, (await call(w.app, 'GET', url, { cookie })).status]).toEqual([url, 200])
    }
  })

  test("signs in as the gym's first active owner when a visitor has deactivated the seed's", async () => {
    const w = await stallWorld()
    const mike = w.seeded.users.find((u) => u.role === 'owner')!
    const other = w.db.insert(users)
      .values({ gymId: w.seeded.gymId, email: 'co@example.com', name: 'Co Owner', role: 'owner', passwordHash: 'x', active: true, createdAt: TEST_NOW.toISOString() })
      .returning().get()
    w.db.update(users).set({ active: false }).where(eq(users.id, mike.id)).run()
    expect((await tryTheDemo(w)).me.user.id).toBe(other.id)
  })
})

describe('FR-OPS-03 Reset the demo', () => {
  test('TC-87 a visitor is gone after npm run demo:reset and again after the stall button, the demo as seeded each time, its kiosk link kept and every device signed out', async () => {
    const w = await stallWorld()
    const seeded = snapshot(w.db)
    const kiosk = `/api/kiosk/${w.seeded.kioskToken}`

    // npm run demo:reset, while the app has the database open: no need to stop the server.
    const first = await visit(w)
    expect(snapshot(w.db)).not.toEqual(seeded)
    const out: string[] = []
    expect(await demoResetCommand({ TENURE_DB: w.file, ...ENV }, { log: (l) => out.push(l) }, TEST_NOW)).toBe(0)
    expect(out.at(-1)).toBe(`Kiosk (kept): /kiosk/${w.seeded.kioskToken}`)
    expect(snapshot(w.db)).toEqual(seeded)
    expect(w.db.select().from(members).where(eq(members.firstName, 'Visitor')).all()).toEqual([])
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: first })).status).toBe(401)
    expect((await call(w.app, 'GET', kiosk)).status).toBe(200)

    // The stall-mode button's route, pressed from the visitor's own signed-in phone.
    const second = await visit(w)
    const events: LiveEvent[] = []
    w.ctx.bus.subscribe((e) => events.push(e))
    const r = await call(w.app, 'POST', '/api/demo/reset', { cookie: second, body: {} })
    expect([r.status, ResetDemoResponse.parse(r.body)]).toEqual([200, { ok: true }])
    expect(r.res.headers.get('set-cookie')).toMatch(/^tenure_session=;/)
    expect(events).toEqual([{ type: 'settings.updated', gymId: w.seeded.gymId }])
    expect(snapshot(w.db)).toEqual(seeded)
    expect(w.db.select().from(members).where(eq(members.phone, '+13125550999')).all()).toEqual([])
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: second })).status).toBe(401)
    expect((await call(w.app, 'GET', kiosk)).status).toBe(200)
    // Each device taps "Try the demo" again.
    expect((await tryTheDemo(w)).me.user.email).toBe('mike@northside.test')
  })

  test('the stall button works signed out too, and keeps a session at another gym', async () => {
    const w = await stallWorld()
    const signup = await call(w.app, 'POST', '/api/auth/signup', {
      body: { gymName: 'Iron Works', name: 'Ana', email: 'ana@example.com', password: 'a-long-password-1', country: 'US', timezone: 'America/Chicago' },
    })
    expect(signup.status).toBe(200)
    const ana = cookieOf(signup.res)
    const r = await call(w.app, 'POST', '/api/demo/reset', { cookie: ana, body: {} })
    expect(r.status).toBe(200)
    expect(r.res.headers.get('set-cookie')).toBeNull()
    expect(MeResponse.parse((await call(w.app, 'GET', '/api/auth/me', { cookie: ana })).body).user.email).toBe('ana@example.com')
    expect((await call(w.app, 'POST', '/api/demo/reset', { body: {} })).status).toBe(200)
  })

  test('npm run demo:reset refuses a missing database and one without the demo gym', async () => {
    const err: string[] = []
    const missing = path.join(dir, 'missing.db')
    expect(await demoResetCommand({ TENURE_DB: missing, ...ENV }, { log: () => {}, error: (l) => err.push(l) })).toBe(1)
    expect(err.at(-1)).toMatch(/Run npm run seed first/)

    const empty = path.join(dir, 'empty.db')
    createDb(empty).close()
    expect(await demoResetCommand({ TENURE_DB: empty, ...ENV }, { log: () => {}, error: (l) => err.push(l) })).toBe(1)
    expect(err.at(-1)).toMatch(/has no demo gym/)
  })
})
