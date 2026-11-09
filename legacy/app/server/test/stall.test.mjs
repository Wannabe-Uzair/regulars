import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { openDb } from '../db.mjs'
import { createApp } from '../app.mjs'
import { clientMounter } from '../client.mjs'

test('stall mode serves the built client with an SPA fallback, and the API still answers JSON', async (t) => {
  const dist = mkdtempSync(path.join(tmpdir(), 'tenure-dist-'))
  t.after(() => rmSync(dist, { recursive: true, force: true }))
  mkdirSync(path.join(dist, 'assets'))
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Tenure</title><div id="root"></div>')
  writeFileSync(path.join(dist, 'assets', 'index-a1b2c3.js'), 'console.log(1)')
  writeFileSync(path.join(dist, 'manifest.webmanifest'), '{"name":"Tenure"}')
  const app = createApp({ db: openDb(':memory:'), mountClient: clientMounter(dist) })
  const get = (p) => app.request(`http://localhost${p}`)

  for (const p of ['/', '/board', '/members/12', '/kiosk/abc_DEF-123']) {
    const r = await get(p)
    assert.equal(r.status, 200, p)
    assert.match(r.headers.get('content-type'), /text\/html/, p)
    assert.match(await r.text(), /<title>Tenure<\/title>/, p)
    assert.equal(r.headers.get('cache-control'), 'no-cache', p)
  }
  const js = await get('/assets/index-a1b2c3.js')
  assert.match(js.headers.get('content-type'), /javascript/)
  assert.match(js.headers.get('cache-control'), /immutable/)
  assert.match((await get('/manifest.webmanifest')).headers.get('content-type'), /manifest\+json/)
  assert.equal((await get('/assets/missing-000.js')).status, 404)
  const api = await get('/api/nope')
  assert.equal(api.status, 404)
  assert.ok((await api.json()).error)
})

test('npm run stall on a database without a gym says "Run npm run seed first" and exits non-zero', async (t) => {
  const { spawnSync } = await import('node:child_process')
  const dir = mkdtempSync(path.join(tmpdir(), 'tenure-db-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, TENURE_DB: path.join(dir, 'empty.db'), TENURE_SERVE_CLIENT: '1', HOST: '127.0.0.1', PORT: '0' }
  const r = spawnSync(process.execPath, [new URL('../index.mjs', import.meta.url).pathname], { env, encoding: 'utf8', timeout: 10000 })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /Run npm run seed first/)
})

test('on 0.0.0.0 the startup lines give localhost for this computer and LAN URLs for phones and the kiosk', async (t) => {
  const { spawn } = await import('node:child_process')
  const net = await import('node:net')
  const dir = mkdtempSync(path.join(tmpdir(), 'tenure-db-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'gym.db')
  const db = openDb(file)
  db.prepare(`INSERT INTO gyms (name, slug, timezone, is_demo, pilot_started_on, plan, kiosk_token, created_at)
    VALUES ('Northside Strength', 'northside', 'America/Chicago', 1, '2026-10-14', 'pilot', 'kiosk-tok', '2026-11-06T00:00:00Z')`).run()
  db.close()
  const port = await new Promise((resolve) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, TENURE_DB: file, HOST: '0.0.0.0', PORT: String(port) }
  const child = spawn(process.execPath, [new URL('../index.mjs', import.meta.url).pathname], { env })
  t.after(() => child.kill())
  let out = ''
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no kiosk line in: ${out}`)), 10000)
    child.stdout.on('data', (b) => { out += b; if (/kiosk:/.test(out)) { clearTimeout(timer); resolve() } })
  })
  assert.match(out, new RegExp(`^Tenure on http://localhost:${port}\\b`))
  assert.doesNotMatch(out, /0\.0\.0\.0/)
  const { lanAddresses } = await import('../routes/gym.mjs')
  const ips = lanAddresses()
  for (const ip of ips) assert.ok(out.includes(`on a phone: http://${ip}:${port}\n`), ip)
  assert.ok(out.includes(`kiosk: http://${ips[0] ?? 'localhost'}:${port}/kiosk/kiosk-tok\n`))
})
