// The permissions sweep (NFR-SEC-04, FR-STAFF-06, FR-STAFF-07): every route the app registers, called as each kind
// of user, against its module's declaration. Data-driven: a route a module adds is swept with no change here.
//   - a public path answers without a session;
//   - any other path is 401 signIn when signed out;
//   - an owner path is 403 role for a coach;
//   - a signed-in path that takes a member id in its path is 404 for a coach given another coach's member, or an
//     unknown id;
//   - so is each of BODY_MEMBER_ROUTES, which take the member id in their body, once it is registered.
// Each request carries an empty JSON object as its body (on anything but GET), and 1 for every path parameter but a
// member id. The guards and the scope check come before the body, so these are what each route answers first.
// That each declared public and owner path is registered by its module is platform/module.test.ts's check.
import type { ErrorCode } from '@tenure/contracts'
import { Hono } from 'hono'
import { beforeAll, describe, expect, test } from 'vitest'
import { createApp } from './app.ts'
import { defaultModules } from './modules/index.ts'
import { requireActor } from './platform/auth/guards.ts'
import { createTestContext } from './platform/context.ts'
import type { ApiModule, AppEnv, RouteKey } from './platform/module.ts'
import { HOST } from './test/http.ts'
import { addMember } from './test/members.ts'
import { makeWorld } from './test/world.ts'

type Access = 'public' | 'owner' | 'staff'
type Route = { key: RouteKey; method: string; path: string; module: string; access: Access }

/** The routes `app` registers, as the client calls them; middleware (`ALL`) and the catch-all left out. */
const appRoutes = (app: Hono<AppEnv>): Set<string> =>
  new Set(app.routes.filter((r) => r.method !== 'ALL').map((r) => `${r.method} ${r.path}`))

/** Every route of an app built from `modules`, with the module that registers it and what that module declares. */
function sweepRoutes(modules: readonly ApiModule[]): Route[] {
  const ctx = createTestContext()
  const owners = new Map<string, ApiModule>()
  for (const module of modules) {
    const router = new Hono<AppEnv>()
    module.register(router, ctx)
    for (const key of appRoutes(router)) owners.set(key.replace(' ', ' /api'), module)
  }
  return [...appRoutes(createApp(ctx, modules))].map((key) => {
    const module = owners.get(key)
    if (!module) throw new Error(`${key} is registered by no module`)
    const routeKey = key as RouteKey
    const access: Access = module.publicPaths?.includes(routeKey)
      ? 'public'
      : module.ownerPaths?.includes(routeKey)
        ? 'owner'
        : 'staff'
    const [method = '', path = ''] = key.split(' ')
    return { key: routeKey, method, path, module: module.name, access }
  })
}

/** A route path takes a member id: a `:memberId`, or the `:id` right after `/members/`. */
const memberParam = (path: string) => /\/:memberId\b/.test(path) || /\/members\/:id\b/.test(path)

/** The path with each parameter filled: a member id with `memberId`, every other with 1. */
const fill = (path: string, memberId?: number) =>
  path.replace(/:(\w+)(\{[^}]*\})?\??/g, (_, name: string) =>
    memberId !== undefined && (name === 'memberId' || (name === 'id' && /\/members\/:id\b/.test(path))) ? String(memberId) : '1',
  )

/** One request into the app; the status and the error code, if the answer has one. A stream is not read. */
async function hit(app: Hono<AppEnv>, method: string, path: string, cookie?: string, json: object = {}) {
  const headers: Record<string, string> = { host: HOST }
  if (cookie) headers.cookie = cookie
  if (method !== 'GET') headers['content-type'] = 'application/json'
  const res = await app.request(`http://${HOST}${path}`, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(json),
  })
  if (!(res.headers.get('content-type') ?? '').includes('json')) {
    await res.body?.cancel()
    return { status: res.status, code: undefined }
  }
  const body = (await res.json()) as { error?: { code?: ErrorCode } }
  return { status: res.status, code: body.error?.code }
}

/** Northside with a member of each coach, and the coach's cookie. */
async function world(modules: readonly ApiModule[] = defaultModules) {
  const base = await makeWorld()
  const w = { ...base, app: modules === defaultModules ? base.app : createApp(base.ctx, modules) }
  const mine = await addMember(w, { first: 'Mine', coachId: w.coach.id, daysSinceJoin: 20, weeks: [3, 3] })
  const theirs = await addMember(w, { first: 'Theirs', coachId: w.coach2.id, daysSinceJoin: 20, weeks: [1, 1] })
  return { ...w, mine, theirs, coachCookie: await w.login(w.coach.email) }
}

/** A member id no member has. */
const UNKNOWN_MEMBER = 999999

/** What a coach gets for another coach's member, for their own and for an unknown id, on a member route. */
async function coachOnMembers(w: Awaited<ReturnType<typeof world>>, route: Route) {
  const status = async (memberId: number) => (await hit(w.app, route.method, fill(route.path, memberId), w.coachCookie)).status
  return { theirs: await status(w.theirs), own: await status(w.mine), unknown: await status(UNKNOWN_MEMBER) }
}

/**
 * What a coach gets for another coach's member, then for their own, on a route that takes the member id in its body.
 * The body is one each such route takes, so the scope check is what answers: a nudge needs its channel (FR-NUDGE-02),
 * and render leaves the channel out.
 */
async function coachOnBodyMembers(w: Awaited<ReturnType<typeof world>>, route: Route) {
  const status = async (memberId: number) =>
    (await hit(w.app, route.method, fill(route.path), w.coachCookie, { memberId, body: 'hi', channel: 'copy' })).status
  return { theirs: await status(w.theirs), own: await status(w.mine) }
}

const ROUTES = sweepRoutes(defaultModules)
const of = (access: Access) => ROUTES.filter((r) => r.access === access).map((r) => [r.key, r] as const)
const MEMBER_ROUTES = ROUTES.filter((r) => r.access === 'staff' && memberParam(r.path)).map((r) => [r.key, r] as const)

/** permissions.test.mjs's routes that take a member id in their body, not their path; each is swept once registered. */
const BODY_MEMBER_ROUTES: readonly RouteKey[] = ['POST /api/nudges', 'POST /api/templates/render']
const BODY_ROUTES = ROUTES.filter((r) => BODY_MEMBER_ROUTES.includes(r.key)).map((r) => [r.key, r] as const)

/** permissions.test.mjs's owner routes (the coach's 403s) and its signed-out paths (the 401s). */
const LEGACY_OWNER_ROUTES = [
  'GET /api/coaches',
  'PATCH /api/coaches/:id',
  'POST /api/invites',
  'POST /api/templates',
  'PATCH /api/templates/:id',
  'DELETE /api/templates/:id',
  'GET /api/billing',
  'GET /api/settings',
  'PATCH /api/settings',
  'PATCH /api/members/:id',
]
const LEGACY_SIGNED_IN_ROUTES = [
  'GET /api/today',
  'GET /api/members',
  'GET /api/templates',
  'GET /api/nudges',
  'GET /api/billing',
  'GET /api/auth/me',
]

describe('the permissions sweep', () => {
  let shared: Awaited<ReturnType<typeof world>>
  beforeAll(async () => {
    shared = await world()
  })

  test('NFR-SEC-04 it walks every route the app registers, each registered by one module', () => {
    const keys = ROUTES.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
    // Phase 0's and this phase's routes, so the sweep is never empty.
    for (const key of ['GET /api/health', 'GET /api/auth/me', 'GET /api/events', 'GET /api/today', 'PATCH /api/coaches/:id', 'GET /api/invites/:token']) {
      expect(keys).toContain(key)
    }
  })

  test.each(of('public'))('NFR-SEC-04 %s is public: it answers without a session', async (_, route) => {
    const r = await hit(shared.app, route.method, fill(route.path))
    expect(r.code, `${r.status} ${r.code}`).not.toBe('signIn')
    expect(r.code).not.toBe('role')
  })

  test.each([...of('staff'), ...of('owner')])('NFR-SEC-04 signed-out requests get 401: %s', async (_, route) => {
    expect(await hit(shared.app, route.method, fill(route.path))).toEqual({ status: 401, code: 'signIn' })
  })

  test.each(of('owner'))('FR-STAFF-06 a coach gets 403 on owner routes: %s', async (_, route) => {
    expect(await hit(shared.app, route.method, fill(route.path), shared.coachCookie)).toEqual({ status: 403, code: 'role' })
  })

  test.each(MEMBER_ROUTES)(
    "FR-STAFF-07 a coach gets 404 for another coach's member or an unknown id, and not for their own: %s",
    async (_, route) => {
      const r = await coachOnMembers(await world(), route)
      expect(r.theirs).toBe(404)
      expect(r.unknown).toBe(404)
      expect(r.own).not.toBe(404)
    },
  )

  test.each(BODY_ROUTES)(
    "FR-STAFF-07 a coach gets 404 for another coach's member in the body, and not for their own: %s",
    async (_, route) => {
      expect(route.access).toBe('staff')
      const r = await coachOnBodyMembers(await world(), route)
      expect(r.theirs).toBe(404)
      expect(r.own).not.toBe(404)
    },
  )

  test("FR-STAFF-06 permissions.test.mjs's owner routes are declared owner only, each one registered", () => {
    for (const key of LEGACY_OWNER_ROUTES) {
      const route = ROUTES.find((r) => r.key === key)
      if (route) expect(route.access, key).toBe('owner')
    }
  })

  test("NFR-SEC-04 permissions.test.mjs's signed-out paths need a session, each one registered", () => {
    for (const key of LEGACY_SIGNED_IN_ROUTES) {
      const route = ROUTES.find((r) => r.key === key)
      if (route) expect(route.access, key).not.toBe('public')
    }
  })
})

describe('the sweep itself', () => {
  // Routes that break each rule, declared as signed-in staff routes: the sweep's checks must see each break.
  const leaky: ApiModule = {
    name: 'leaky',
    register: (router) => {
      router.get('/leaky/open', (c) => c.json({ ok: true }))
      router.get('/leaky/members/:id', requireActor, (c) => c.json({ id: c.req.param('id') }))
      router.post('/leaky/nudges', requireActor, (c) => c.json({ ok: true }))
    },
    publicPaths: [],
    ownerPaths: [],
  }
  const modules = [...defaultModules, leaky]
  const routes = sweepRoutes(modules)
  const route = (key: string) => {
    const found = routes.find((r) => r.key === key)
    if (!found) throw new Error(`no ${key}`)
    return found
  }

  test('NFR-SEC-04 it sees a route that answers signed-out callers, and a coach reading any member', async () => {
    const w = await world(modules)
    expect(route('GET /api/leaky/open').access).toBe('staff')
    expect((await hit(w.app, 'GET', fill('/api/leaky/open'))).status).toBe(200)
    expect(memberParam(route('GET /api/leaky/members/:id').path)).toBe(true)
    expect(await coachOnMembers(w, route('GET /api/leaky/members/:id'))).toEqual({ theirs: 200, own: 200, unknown: 200 })
  })

  test('FR-STAFF-07 it sees a route that takes any member id in its body', async () => {
    expect(await coachOnBodyMembers(await world(modules), route('POST /api/leaky/nudges'))).toEqual({ theirs: 200, own: 200 })
  })

  test('NFR-SEC-04 it fills a member id only where the path takes one', () => {
    expect(fill('/api/members/:id/archive', 7)).toBe('/api/members/7/archive')
    expect(fill('/api/kiosk/:token/members/:memberId', 7)).toBe('/api/kiosk/1/members/7')
    expect(fill('/api/coaches/:id', 7)).toBe('/api/coaches/1')
    expect(memberParam('/api/coaches/:id')).toBe(false)
  })
})
