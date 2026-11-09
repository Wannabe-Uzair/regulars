import { HealthResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { createApp } from './app.ts'
import { createTestContext, TEST_NOW, type AppContext } from './platform/context.ts'
import type { ApiModule } from './platform/module.ts'
import { call, HOST } from './test/http.ts'
import { readUntil } from './test/sse.ts'
import { makeWorld } from './test/world.ts'

const notApi = { error: { code: 'notApi', message: t('api.notApi') } }

describe('createApp', () => {
  const app = createApp(createTestContext())

  test('GET /api/health answers a HealthResponse', async () => {
    const res = await call(app, 'GET', '/api/health')
    expect(res.status).toBe(200)
    expect(HealthResponse.parse(res.body)).toEqual({ ok: true })
  })

  test.each([
    ['GET', '/api/nope'],
    ['GET', '/api/'],
    ['GET', '/api/health/extra'],
    ['POST', '/api/nope'],
    ['DELETE', '/api/health'],
  ])('%s %s is 404 notApi', async (method, path) => {
    const res = await call(app, method, path, method === 'GET' ? {} : { body: {} })
    expect([res.status, res.body]).toEqual([404, notApi])
  })

  test('a mutation of an unknown path meets the CSRF check first', async () => {
    const res = await call(app, 'POST', '/api/nope', { headers: { 'content-type': 'text/plain' } })
    expect(res.status).toBe(400)
  })

  test('mounts the modules it is given at /api, each with the context', async () => {
    let seen: AppContext | undefined
    const clockModule: ApiModule = {
      name: 'clock',
      register(router, ctx) {
        seen = ctx
        router.get('/now', (c) => c.json({ now: ctx.clock().toISOString() }))
      },
    }
    const ctx = createTestContext()
    const only = createApp(ctx, [clockModule])
    expect(seen).toBe(ctx)
    expect((await call(only, 'GET', '/api/now')).body).toEqual({ now: TEST_NOW.toISOString() })
    expect((await call(only, 'GET', '/api/health')).status).toBe(404)
  })

  test("calls each module's subscribe once, with the bus and the context, when the app is built", async () => {
    const calls: unknown[][] = []
    const listener: ApiModule = { name: 'listener', register() {}, subscribe: (...args) => void calls.push(args) }
    const ctx = createTestContext()
    const built = createApp(ctx, [listener, { name: 'quiet', register() {} }])
    expect(calls).toEqual([[ctx.bus, ctx]])
    await built.request('http://x/api/health')
    expect(calls).toHaveLength(1)
  })
})

describe('createTestContext', () => {
  test('has a fixed clock, an in-memory database and repositories', async () => {
    const ctx = createTestContext()
    expect(ctx.clock().toISOString()).toBe('2026-11-06T18:00:00.000Z')
    expect(ctx.config.dbFile).toBe(':memory:')
    expect(await ctx.repos.users.findByEmail('nobody@nowhere.test')).toBeUndefined()
  })

  test('has its own bus and dev adapters', () => {
    const a = createTestContext()
    const b = createTestContext()
    const heard: number[] = []
    a.bus.subscribe((e) => heard.push(e.gymId))
    b.bus.publish({ type: 'member.joined', gymId: 1, memberId: 1, coachId: null })
    expect(heard).toEqual([])
    expect(Object.keys(a.adapters).sort()).toEqual(['email', 'payments', 'sms'])
    expect(a.adapters).not.toBe(b.adapters)
  })
})

describe('response headers on the API', () => {
  const app = createApp(createTestContext())

  test.each([
    ['a JSON answer', 'GET', '/api/health', {}, 200],
    ['a 404 notApi', 'GET', '/api/nope', {}, 404],
    ['a 403 crossSite', 'POST', '/api/nope', { origin: 'http://evil.test' }, 403],
  ])('%s carries the security headers, and no HSTS over plain http', async (_, method, path, headers, status) => {
    const { res } = await call(app, method, path, method === 'GET' ? { headers } : { headers, body: {} })
    expect(res.status).toBe(status)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('referrer-policy')).toBe('same-origin')
    expect(res.headers.get('strict-transport-security')).toBeNull()
  })

  test('the signed-in event stream is never compressed, and its first frame arrives unbuffered', async () => {
    const w = await makeWorld()
    const res = await w.app.request(`http://${HOST}/api/events`, {
      headers: { host: HOST, cookie: await w.login(w.owner.email), 'accept-encoding': 'gzip, deflate, br' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/)
    expect(res.headers.get('content-encoding')).toBeNull()
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    if (!res.body) throw new Error('no body')
    const reader = res.body.getReader()
    expect(await readUntil(reader, (t) => t.includes(': connected'))).toBe(': connected\n\n')
    await reader.cancel()
  })
})
