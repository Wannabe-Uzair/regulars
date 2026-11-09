import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { call, HOST } from '../../test/http.ts'
import { createTestContext } from '../context.ts'
import type { ApiModule } from '../module.ts'

// A route that reads the body, and one under /api/import/, so a request that passes the guards answers 200.
const probe: ApiModule = {
  name: 'probe',
  register(router) {
    router.post('/probe', async (c) => c.json({ bytes: (await c.req.text()).length }))
    router.post('/import/preview', async (c) => c.json({ bytes: (await c.req.text()).length }))
  },
}
const app = createApp(createTestContext(), [probe])

const err = (code: 'json' | 'crossSite' | 'tooLarge' | 'importTooBig') => ({
  error: { code, message: t(`api.${code}`) },
})

describe('csrfGuard', () => {
  test('GET, HEAD and OPTIONS pass without a JSON content type', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const res = await app.request(`http://${HOST}/api/health`, { method, headers: { host: HOST } })
      expect(res.status, method).not.toBe(400)
    }
  })

  test.each([
    ['no content type', {}],
    ['a form', { 'content-type': 'application/x-www-form-urlencoded' }],
    ['plain text', { 'content-type': 'text/plain' }],
    ['multipart', { 'content-type': 'multipart/form-data; boundary=x' }],
  ])('a mutation with %s is 400 json', async (_, headers) => {
    const res = await app.request(`http://${HOST}/api/probe`, {
      method: 'POST',
      headers: { host: HOST, ...headers },
      body: '{}',
    })
    expect([res.status, await res.json()]).toEqual([400, err('json')])
  })

  test('application/json with parameters, in any case, passes', async () => {
    const res = await call(app, 'POST', '/api/probe', {
      body: {},
      headers: { 'content-type': 'Application/JSON; charset=utf-8' },
    })
    expect(res.status).toBe(200)
  })

  test.each(['PUT', 'PATCH', 'DELETE'])('%s is guarded too', async (method) => {
    const res = await call(app, method, '/api/probe', { headers: { 'content-type': 'text/plain' } })
    expect([res.status, res.body]).toEqual([400, err('json')])
  })

  test('an Origin matching Host passes; with no Origin it passes too', async () => {
    expect((await call(app, 'POST', '/api/probe', { body: {}, headers: { origin: `http://${HOST}` } })).status).toBe(200)
    expect((await call(app, 'POST', '/api/probe', { body: {} })).status).toBe(200)
  })

  test('an Origin matching X-Forwarded-Host passes', async () => {
    const res = await call(app, 'POST', '/api/probe', {
      body: {},
      headers: { origin: 'https://tenure.example.com', 'x-forwarded-host': 'tenure.example.com' },
    })
    expect(res.status).toBe(200)
  })

  test.each([
    ['another site', 'https://evil.example'],
    ['the same host on another port', 'http://tenure.test:9999'],
    ['an opaque origin', 'null'],
    ['garbage', 'not a url'],
  ])('an Origin from %s is 403 crossSite', async (_, origin) => {
    const res = await call(app, 'POST', '/api/probe', { body: {}, headers: { origin } })
    expect([res.status, res.body]).toEqual([403, err('crossSite')])
  })
})

/** A ReadableStream of `size` bytes (no content-length, so the limit has to count). */
const streamOf = (size: number, chunk = 16 * 1024) => {
  let sent = 0
  return new ReadableStream<Uint8Array>({
    pull(ctl) {
      if (sent >= size) return ctl.close()
      const n = Math.min(chunk, size - sent)
      sent += n
      ctl.enqueue(new TextEncoder().encode('x'.repeat(n)))
    },
  })
}

describe('body limits (security fix 2)', () => {
  test('API bodies over 64 KB get 413 before anything reads them, with or without content-length', async () => {
    const big = JSON.stringify({ email: 'mike@northside.test', password: 'x'.repeat(1024 * 1024) })
    const sized = await call(app, 'POST', '/api/probe', { body: big, headers: { 'content-length': String(big.length) } })
    expect([sized.status, sized.body]).toEqual([413, err('tooLarge')])
    const res = await app.request(`http://${HOST}/api/probe`, {
      method: 'POST',
      headers: { host: HOST, 'content-type': 'application/json' },
      body: streamOf(1024 * 1024),
      duplex: 'half',
    } as RequestInit)
    expect([res.status, await res.json()]).toEqual([413, err('tooLarge')])
    // Under the limit still works.
    const small = await call(app, 'POST', '/api/probe', { body: 'x'.repeat(64 * 1024) })
    expect([small.status, small.body]).toEqual([200, { bytes: 64 * 1024 }])
  })

  test('the limit comes before the CSRF check and the unknown-path answer', async () => {
    const big = 'x'.repeat(64 * 1024 + 1)
    const form = await call(app, 'POST', '/api/probe', { body: big, headers: { 'content-type': 'text/plain' } })
    expect([form.status, form.body]).toEqual([413, err('tooLarge')])
    const unknown = await call(app, 'POST', '/api/nope', { body: big })
    expect([unknown.status, unknown.body]).toEqual([413, err('tooLarge')])
  })

  test('an import may be up to 4 MB; over that is 413', async () => {
    const csv = `first_name,last_name,phone\n${'Ana,Ruiz,+13125550100\n'.repeat(5000)}` // ~110 KB
    const ok = await call(app, 'POST', '/api/import/preview', { body: { kind: 'members', csv } })
    expect(ok.status).toBe(200)
    const huge = JSON.stringify({ kind: 'members', csv: 'a'.repeat(4 * 1024 * 1024 + 1) })
    const over = await call(app, 'POST', '/api/import/preview', {
      body: huge,
      headers: { 'content-length': String(huge.length) },
    })
    expect([over.status, over.body]).toEqual([413, err('importTooBig')])
    const streamed = await app.request(`http://${HOST}/api/import/preview`, {
      method: 'POST',
      headers: { host: HOST, 'content-type': 'application/json' },
      body: streamOf(4 * 1024 * 1024 + 1, 256 * 1024),
      duplex: 'half',
    } as RequestInit)
    expect([streamed.status, await streamed.json()]).toEqual([413, err('importTooBig')])
  })

  test('only /api/import/ gets the larger limit', async () => {
    const body = 'x'.repeat(100 * 1024)
    expect((await call(app, 'POST', '/api/importer', { body })).status).toBe(413)
    expect((await call(app, 'POST', '/api/import', { body })).status).toBe(413)
  })
})
