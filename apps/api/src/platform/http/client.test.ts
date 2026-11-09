import { t } from '@tenure/copy'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { createTestContext } from '../context.ts'
import { scratchDir } from '../../test/scratch.ts'
import { loadConfig } from '../config.ts'
import { hasWebBuild } from './client.ts'

const dist = scratchDir('dist')
mkdirSync(path.join(dist, 'assets'))
writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Tenure</title><div id="root"></div>')
writeFileSync(path.join(dist, 'assets', 'index-a1b2c3.js'), 'console.log(1)')
writeFileSync(path.join(dist, 'assets', 'index-d4e5f6.css'), 'body{}')
writeFileSync(path.join(dist, 'manifest.webmanifest'), '{"name":"Tenure"}')
// Over hono's 1 KB compression threshold.
const vendor = path.join(dist, 'assets', 'vendor-9z8y7x.js')
writeFileSync(vendor, Array.from({ length: 200 }, (_, i) => `export const v${i} = ${i}`).join('\n'))

const stallConfig = { ...loadConfig({ TENURE_DB: ':memory:' }), stall: true }
const notApi = { error: { code: 'notApi', message: t('api.notApi') } }

describe('stall mode serves the built web app with an SPA fallback, and the API still answers JSON', () => {
  const app = createApp(createTestContext({ config: stallConfig }), undefined, { webDist: dist })
  const get = (p: string) => app.request(`http://localhost${p}`)

  test.each(['/', '/app', '/board', '/members/12', '/kiosk/abc_DEF-123'])('%s is index.html, no-cache', async (p) => {
    const r = await get(p)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/text\/html/)
    expect(r.headers.get('cache-control')).toBe('no-cache')
    expect(await r.text()).toMatch(/<title>Tenure<\/title>/)
  })

  test('a hashed asset gets its content type and a year of caching; other files their type', async () => {
    const js = await get('/assets/index-a1b2c3.js')
    expect(js.status).toBe(200)
    expect(js.headers.get('content-type')).toMatch(/javascript/)
    expect(js.headers.get('cache-control')).toMatch(/max-age=31536000.*immutable/)
    expect((await get('/assets/index-d4e5f6.css')).headers.get('content-type')).toMatch(/text\/css/)
    expect((await get('/manifest.webmanifest')).headers.get('content-type')).toMatch(/manifest\+json/)
  })

  test('a missing file is a 404, not the app', async () => {
    expect((await get('/assets/missing-000.js')).status).toBe(404)
  })

  test('a missing hashed file is no-cache, so a phone asking for an old build\'s chunk does not keep the 404', async () => {
    const r = await get('/assets/missing-000.js')
    expect(r.status).toBe(404)
    expect(r.headers.get('cache-control')).toBe('no-cache')
  })

  test.each(['/assets/', '/assets'])('%s itself is the index.html fallback, no-cache', async (p) => {
    const r = await get(p)
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/text\/html/)
    expect(r.headers.get('cache-control')).toBe('no-cache')
  })

  test('a JS asset asked for with gzip comes back gzip-encoded, and decodes to the file', async () => {
    const r = await app.request('http://localhost/assets/vendor-9z8y7x.js', { headers: { 'accept-encoding': 'gzip' } })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-encoding')).toBe('gzip')
    expect(r.headers.get('vary')).toMatch(/accept-encoding/i)
    expect(r.headers.get('cache-control')).toMatch(/max-age=31536000.*immutable/)
    expect(gunzipSync(Buffer.from(await r.arrayBuffer())).equals(readFileSync(vendor))).toBe(true)
  })

  test('without Accept-Encoding the asset goes out as it is', async () => {
    const r = await get('/assets/vendor-9z8y7x.js')
    expect(r.headers.get('content-encoding')).toBeNull()
    expect(await r.text()).toBe(readFileSync(vendor, 'utf8'))
  })

  test.each(['/', '/app', '/assets/index-a1b2c3.js', '/assets/missing-000.js'])(
    '%s carries the security headers, and no HSTS over plain http',
    async (p) => {
      const h = (await get(p)).headers
      expect(h.get('x-content-type-options')).toBe('nosniff')
      expect(h.get('x-frame-options')).toBe('DENY')
      expect(h.get('referrer-policy')).toBe('same-origin')
      expect(h.get('strict-transport-security')).toBeNull()
    },
  )

  test.each([
    ['GET', '/api/nope'],
    ['GET', '/api/'],
    ['GET', '/api'],
    ['GET', '/api/kiosk/abc/nope'],
  ])('%s %s is never the fallback: 404 notApi JSON', async (method, p) => {
    const r = await app.request(`http://localhost${p}`, { method })
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual(notApi)
  })

  // The files these paths point at, if the guard let them out: the repo's package.json and the API's source.
  test.each(['/%2e%2e/%2e%2e/api/src/main.ts', '/assets/..%2f..%2fpackage.json', '/..%5cpackage.json'])(
    '%s never returns a file outside the web build',
    async (p) => {
      const r = await get(p)
      const body = await r.text()
      expect(body).not.toMatch(/"name"|createDb|@tenure/)
      if (r.status === 200) expect(r.headers.get('content-type')).toMatch(/text\/html/)
      else expect(r.status).toBe(404)
    },
  )

  test('/api/health still answers', async () => {
    expect(await (await get('/api/health')).json()).toEqual({ ok: true })
  })
})

describe('outside stall mode, or without a build', () => {
  test('without stall mode the web app is not served', async () => {
    const app = createApp(createTestContext(), undefined, { webDist: dist })
    expect((await app.request('http://localhost/app')).status).toBe(404)
  })

  test('hasWebBuild is true only when the folder holds index.html', () => {
    expect(hasWebBuild(dist)).toBe(true)
    expect(hasWebBuild(path.join(dist, 'assets'))).toBe(false)
  })
})
