import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeWorld, call, HOST, PASSWORD } from './fixtures.mjs'

test('CSRF: a POST with Content-Type text/plain is rejected', async () => {
  const w = await makeWorld()
  // A valid JSON payload sent as text/plain (what a cross-site form or no-preflight fetch can do) is still refused.
  const payload = JSON.stringify({ email: w.owner.email, password: PASSWORD })
  const r = await call(w.app, 'POST', '/api/auth/login', { body: payload, headers: { 'content-type': 'text/plain' } })
  assert.equal(r.status, 400)
  assert.deepEqual(r.body, { error: 'Send the request as JSON.' })
  assert.equal(r.res.headers.get('set-cookie'), null)
  const cookie = await w.login(w.owner.email)
  const form = await call(w.app, 'POST', '/api/templates', { cookie, body: 'name=x', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
  assert.equal(form.status, 400)
  assert.equal(w.db.prepare('SELECT COUNT(*) AS n FROM templates').get().n, 3)
})

test('CSRF: an Origin that does not match the host is rejected; a matching one passes', async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.owner.email)
  const evil = await call(w.app, 'POST', '/api/templates', { cookie, body: { name: 'x', body: 'y' }, headers: { origin: 'http://evil.example' } })
  assert.equal(evil.status, 403)
  const ok = await call(w.app, 'POST', '/api/templates', { cookie, body: { name: 'x', body: 'y' }, headers: { origin: `http://${HOST}` } })
  assert.equal(ok.status, 201)
})

test('billing: pilot day N of 90', async () => {
  const w = await makeWorld()
  const r = await call(w.app, 'GET', '/api/billing', { cookie: await w.login(w.owner.email) })
  assert.deepEqual(r.body, { plan: 'pilot', pilotStartedOn: '2026-10-14', pilotDay: 24, pilotDaysLeft: 66, priceMonthly: 99 })
})

test('settings: kiosk URL, phone URLs, and PATCH name and timezone', async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.owner.email)
  const r = await call(w.app, 'GET', '/api/settings', { cookie })
  // The kiosk link is for a tablet on the network: the LAN address, not the origin the laptop used.
  assert.equal(r.body.kioskUrl, 'http://192.168.137.1:5175/kiosk/kiosk-token-1')
  assert.deepEqual(r.body.kioskUrls, ['http://192.168.137.1:5175/kiosk/kiosk-token-1'])
  assert.deepEqual(r.body.phoneUrls, ['http://192.168.137.1:5175'])
  assert.equal(r.body.gym.name, 'Northside Strength')
  const p = await call(w.app, 'PATCH', '/api/settings', { cookie, body: { name: 'Northside Strength & Conditioning', timezone: 'America/New_York' } })
  assert.equal(p.status, 200)
  assert.equal(p.body.gym.name, 'Northside Strength & Conditioning')
  assert.equal(p.body.gym.timezone, 'America/New_York')
  assert.equal((await call(w.app, 'PATCH', '/api/settings', { cookie, body: { timezone: 'Mars/Olympus' } })).status, 400)
})

test('settings: one kiosk URL per LAN address, the first as kioskUrl; the request origin when there is none', async () => {
  const two = await makeWorld({ lan: () => ['192.168.137.1', '10.0.0.7'] })
  const r = await call(two.app, 'GET', '/api/settings', { cookie: await two.login(two.owner.email) })
  assert.equal(r.body.kioskUrl, 'http://192.168.137.1:5175/kiosk/kiosk-token-1')
  assert.deepEqual(r.body.kioskUrls, ['http://192.168.137.1:5175/kiosk/kiosk-token-1', 'http://10.0.0.7:5175/kiosk/kiosk-token-1'])
  const cookie = await two.login(two.coach.email)
  for (const u of r.body.kioskUrls) assert.equal((await call(two.app, 'GET', `/api/qr?text=${encodeURIComponent(u)}`, { cookie })).status, 200, u)
  const none = await makeWorld({ lan: () => [] })
  const n = await call(none.app, 'GET', '/api/settings', { cookie: await none.login(none.owner.email) })
  assert.equal(n.body.kioskUrl, `http://${HOST}/kiosk/kiosk-token-1`)
  assert.deepEqual(n.body.kioskUrls, [n.body.kioskUrl])
  assert.deepEqual(n.body.phoneUrls, [])
  const q = await call(none.app, 'GET', `/api/qr?text=${encodeURIComponent(n.body.kioskUrl)}`, { cookie: await none.login(none.coach.email) })
  assert.equal(q.status, 200)
})

test("qr: an SVG for this gym's phone and kiosk URLs only, for any signed-in user", async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.coach.email)
  const phone = await call(w.app, 'GET', `/api/qr?text=${encodeURIComponent('http://192.168.137.1:5175')}`, { cookie })
  assert.equal(phone.status, 200)
  assert.equal(phone.res.headers.get('content-type'), 'image/svg+xml')
  assert.match(phone.body, /^<svg/)
  const kiosk = await call(w.app, 'GET', `/api/qr?text=${encodeURIComponent('http://192.168.137.1:5175/kiosk/kiosk-token-1')}`, { cookie })
  assert.equal(kiosk.status, 200)
  const other = await call(w.app, 'GET', `/api/qr?text=${encodeURIComponent('https://evil.example')}`, { cookie })
  assert.equal(other.status, 400)
  assert.equal((await call(w.app, 'GET', '/api/qr?text=x')).status, 401)
})

test('unknown API paths are a JSON 404', async () => {
  const w = await makeWorld()
  const r = await call(w.app, 'GET', '/api/nope')
  assert.equal(r.status, 404)
  assert.ok(r.body.error)
})
