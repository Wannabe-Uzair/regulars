import { LoginRequest, withCode } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'
import { createApp } from '../../app.ts'
import { call } from '../../test/http.ts'
import { createTestContext } from '../context.ts'
import type { ApiModule } from '../module.ts'
import { readJson, readQuery } from './validate.ts'

const Probe = z.object({
  gymName: z.string(withCode('gymName')).trim().min(1, withCode('gymName')),
  count: z.number().int().optional(), // no code: a failure here answers generic
})

const echo: ApiModule = {
  name: 'echo',
  register(router) {
    router.post('/echo', async (c) => c.json(await readJson(c, Probe)))
    // Accepts anything, so only readJson's own checks can refuse a body.
    router.post('/anything', async (c) => c.json({ got: await readJson(c, z.unknown()) }))
    router.post('/login-probe', async (c) => c.json(await readJson(c, LoginRequest)))
  },
}
const app = createApp(createTestContext(), [echo])

const generic = { error: { code: 'generic', message: t('api.generic') } }

describe('readJson', () => {
  test('returns the parsed body', async () => {
    const res = await call(app, 'POST', '/api/echo', { body: { gymName: '  Northside  ', count: 3, extra: 1 } })
    expect([res.status, res.body]).toEqual([200, { gymName: 'Northside', count: 3 }])
  })

  test.each([
    ['no body', undefined],
    ['an empty body', ''],
    ['not JSON', '{"gymName":'],
    ['a JSON string', '"Northside"'],
    ['a JSON number', '42'],
    ['JSON null', 'null'],
    ['a JSON array', '[{"gymName":"Northside"}]'],
  ])('%s answers 400 generic, whatever the schema', async (_, body) => {
    for (const path of ['/api/echo', '/api/anything']) {
      const res = await call(app, 'POST', path, { body })
      expect([res.status, res.body], path).toEqual([400, generic])
    }
  })

  test("a schema failure answers the first issue's code", async () => {
    const res = await call(app, 'POST', '/api/echo', { body: { gymName: '   ' } })
    expect([res.status, res.body]).toEqual([400, { error: { code: 'gymName', message: t('api.gymName') } }])
  })

  test("a contract's code keeps its own status: a bad login field is 401 loginMismatch", async () => {
    const res = await call(app, 'POST', '/api/login-probe', { body: { email: 'not-an-email', password: 'x' } })
    expect([res.status, res.body]).toEqual([401, { error: { code: 'loginMismatch', message: t('api.loginMismatch') } }])
  })

  test('an issue whose message is not an ErrorCode answers generic', async () => {
    const res = await call(app, 'POST', '/api/echo', { body: { gymName: 'Northside', count: 1.5 } })
    expect([res.status, res.body]).toEqual([400, generic])
  })
})

const Filter = z.object({
  status: z.enum(['all', 'slipping'], withCode('statusFilter')).default('all'),
  q: z.string().optional(),
  page: z.coerce.number().int().optional(), // no code: a failure here answers generic
})

const query: ApiModule = {
  name: 'query',
  register(router) {
    router.get('/filter', (c) => c.json(readQuery(c, Filter)))
  },
}
const queryApp = createApp(createTestContext(), [query])

describe('readQuery', () => {
  test('FR-MEM-02 readQuery returns the parsed query, with defaults and without unknown names', async () => {
    expect((await call(queryApp, 'GET', '/api/filter')).body).toEqual({ status: 'all' })
    const res = await call(queryApp, 'GET', '/api/filter?status=slipping&q=sam&page=2&extra=1')
    expect([res.status, res.body]).toEqual([200, { status: 'slipping', q: 'sam', page: 2 }])
  })

  test("FR-MEM-02 readQuery answers the first issue's code, with its status", async () => {
    const res = await call(queryApp, 'GET', '/api/filter?status=gone')
    expect([res.status, res.body]).toEqual([400, { error: { code: 'statusFilter', message: t('api.statusFilter') } }])
  })

  test('FR-MEM-02 readQuery answers generic for an issue without a code', async () => {
    const res = await call(queryApp, 'GET', '/api/filter?page=two')
    expect([res.status, res.body]).toEqual([400, generic])
  })

  test('FR-MEM-02 readQuery reads one value per name: the first, when a name repeats', async () => {
    expect((await call(queryApp, 'GET', '/api/filter?q=a&q=b')).body).toEqual({ status: 'all', q: 'a' })
  })
})
