import { Actor, ErrorBody } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { call } from '../../test/http.ts'
import { makeWorld, PASSWORD } from '../../test/world.ts'
import { loadConfig } from '../config.ts'
import { TEST_NOW } from '../context.ts'
import type { ApiModule } from '../module.ts'
import { requireActor, requireOwner } from './guards.ts'
import { sha256 } from './token.ts'

const login = (w: Awaited<ReturnType<typeof makeWorld>>, email: string) =>
  call(w.app, 'POST', '/api/auth/login', { body: { email, password: PASSWORD } })

describe('the session cookie', () => {
  test('httpOnly, SameSite=Lax, Path=/, 30 days, the token is 43 characters; not Secure by default', async () => {
    const w = await makeWorld()
    const set = (await login(w, w.owner.email)).res.headers.get('set-cookie') ?? ''
    expect(set).toMatch(/^tenure_session=[\w-]{43};/)
    expect(set).toMatch(/; HttpOnly/)
    expect(set).toMatch(/; SameSite=Lax/)
    expect(set).toMatch(/; Path=\//)
    expect(set).toMatch(/; Max-Age=2592000/)
    expect(set).not.toMatch(/Secure/)
  })

  test('Secure when secureCookies is on, on sign-in and on logout', async () => {
    const w = await makeWorld({ config: loadConfig({ TENURE_DB: ':memory:', TENURE_SECURE_COOKIES: '1' }) })
    const res = await login(w, w.owner.email)
    expect(res.res.headers.get('set-cookie')).toMatch(/; Secure/)
    const cookie = (res.res.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
    const out = await call(w.app, 'POST', '/api/auth/logout', { cookie, body: {} })
    expect(out.res.headers.get('set-cookie')).toMatch(/^tenure_session=; Max-Age=0; .*Secure/)
  })

  test('only the sha256 of the token is stored, and the session lasts 30 days', async () => {
    let now = TEST_NOW.getTime()
    const w = await makeWorld({ clock: () => new Date(now) })
    const token = (await w.login(w.owner.email)).split('=')[1] ?? ''
    const at = new Date(now).toISOString()
    expect(await w.ctx.repos.sessions.findLive(token, at)).toBeUndefined()
    const live = await w.ctx.repos.sessions.findLive(sha256(token), at)
    expect(live?.session).toEqual({
      tokenHash: sha256(token),
      userId: w.owner.id,
      createdAt: TEST_NOW.toISOString(),
      expiresAt: '2026-12-06T18:00:00.000Z',
    })
    now = Date.parse('2026-12-06T17:59:59.999Z')
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: `tenure_session=${token}` })).status).toBe(200)
    now += 1
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: `tenure_session=${token}` })).status).toBe(401)
  })
})

// Routes behind each guard, answering what they see.
const probe: ApiModule = {
  name: 'probe',
  register(router) {
    router.get('/whoami', (c) => c.json({ actor: c.var.actor ?? null, gymId: c.var.gym?.id ?? null }))
    router.get('/staff-only', requireActor, (c) => c.json({ actor: c.var.actor, gymId: c.var.gym.id }))
    router.get('/owner-only', requireOwner, (c) => c.json({ actor: c.var.actor }))
  },
}

const errorOf = (code: 'signIn' | 'role') => ({ error: { code, message: t(`api.${code}`) } })

describe('loadSession and the guards', () => {
  test('the actor is the typed { id, gymId, role, name, email }, never the row; the gym is the signed-in gym', async () => {
    const w = await makeWorld()
    const app = createApp(w.ctx, [probe])
    const cookie = await w.login(w.coach.email)
    const res = await call(app, 'GET', '/api/whoami', { cookie })
    expect(res.body).toEqual({
      actor: { id: w.coach.id, gymId: w.gym.id, role: 'coach', name: 'Priya S.', email: 'priya@northside.test' },
      gymId: w.gym.id,
    })
    expect(Actor.strict().parse((res.body as { actor: unknown }).actor)).toBeTruthy()
  })

  test('signed out, or with an unknown token, there is no actor; requireActor and requireOwner answer 401 signIn', async () => {
    const w = await makeWorld()
    const app = createApp(w.ctx, [probe])
    for (const cookie of [undefined, 'tenure_session=nope', 'other=1']) {
      expect((await call(app, 'GET', '/api/whoami', { cookie })).body).toEqual({ actor: null, gymId: null })
      for (const path of ['/api/staff-only', '/api/owner-only']) {
        const res = await call(app, 'GET', path, { cookie })
        expect([res.status, ErrorBody.parse(res.body)], path).toEqual([401, errorOf('signIn')])
      }
    }
  })

  test('requireOwner answers 403 role to a coach; both guards let the owner through', async () => {
    const w = await makeWorld()
    const app = createApp(w.ctx, [probe])
    const coach = await w.login(w.coach.email)
    expect((await call(app, 'GET', '/api/staff-only', { cookie: coach })).status).toBe(200)
    const denied = await call(app, 'GET', '/api/owner-only', { cookie: coach })
    expect([denied.status, denied.body]).toEqual([403, errorOf('role')])
    const owner = await w.login(w.owner.email)
    expect((await call(app, 'GET', '/api/staff-only', { cookie: owner })).status).toBe(200)
    expect((await call(app, 'GET', '/api/owner-only', { cookie: owner })).status).toBe(200)
  })

  test('a deactivated user has no actor', async () => {
    const w = await makeWorld()
    const app = createApp(w.ctx, [probe])
    const cookie = await w.login(w.coach.email)
    await w.ctx.repos.users.setActive(w.gym.id, w.coach.id, false)
    expect((await call(app, 'GET', '/api/whoami', { cookie })).body).toEqual({ actor: null, gymId: null })
  })
})
