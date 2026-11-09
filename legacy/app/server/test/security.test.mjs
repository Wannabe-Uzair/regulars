// Security review fixes: login and sign-up rate limits, request-size limits, the event stream ending with the
// session, and login timing for unknown emails.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Hono } from 'hono'
import { makeWorld, call, HOST, PASSWORD } from './fixtures.mjs'
import { createLoginLimiter, hashPassword, loadSession } from '../auth.mjs'
import { eventRoutes } from '../routes/events.mjs'
import { MSG } from '../messages.mjs'

const login = (w, email, password) => call(w.app, 'POST', '/api/auth/login', { body: { email, password } })

test('fix 1: 30 parallel wrong logins for one email get at most 10 real answers; the rest are refused', async () => {
  const w = await makeWorld()
  const all = await Promise.all(Array.from({ length: 30 }, () => login(w, w.owner.email, 'wrong-password')))
  const statuses = all.map((r) => r.status)
  assert.equal(statuses.filter((s) => s === 401).length, 10, statuses.join(' '))
  assert.equal(statuses.filter((s) => s === 429).length, 20, statuses.join(' '))
  assert.ok(all.filter((r) => r.status === 429).every((r) => r.body.error === MSG.loginTooMany))
  // Still blocked for the right password too, until the window passes.
  assert.equal((await login(w, w.owner.email, PASSWORD)).status, 429)
})

test('fix 1: a good login clears the count', async () => {
  const w = await makeWorld()
  for (let i = 0; i < 9; i++) assert.equal((await login(w, w.owner.email, 'wrong-password')).status, 401)
  assert.equal((await login(w, w.owner.email, PASSWORD)).status, 200)
  for (let i = 0; i < 10; i++) assert.equal((await login(w, w.owner.email, 'wrong-password')).status, 401)
  assert.equal((await login(w, w.owner.email, 'wrong-password')).status, 429)
})

/** A ReadableStream of `size` bytes (no content-length, so the limit has to count). */
const streamOf = (size, chunk = 16 * 1024) => {
  let sent = 0
  return new ReadableStream({
    pull(ctl) {
      if (sent >= size) return ctl.close()
      const n = Math.min(chunk, size - sent)
      sent += n
      ctl.enqueue(new TextEncoder().encode('x'.repeat(n)))
    },
  })
}

test('fix 2: API bodies over 64 KB get 413 before anything reads them, with or without content-length', async () => {
  const w = await makeWorld()
  const big = JSON.stringify({ email: w.owner.email, password: 'x'.repeat(1024 * 1024) })
  const sized = await call(w.app, 'POST', '/api/auth/login', { body: big, headers: { 'content-length': String(big.length) } })
  assert.deepEqual([sized.status, sized.body], [413, { error: MSG.tooLarge }])
  const res = await w.app.request(`http://${HOST}/api/auth/login`, {
    method: 'POST', headers: { host: HOST, 'content-type': 'application/json' }, body: streamOf(1024 * 1024), duplex: 'half',
  })
  assert.deepEqual([res.status, await res.json()], [413, { error: MSG.tooLarge }])
  // Under the limit still works.
  assert.equal((await login(w, w.owner.email, PASSWORD)).status, 200)
})

test('fix 2: an import may be up to 4 MB; over that is 413', async () => {
  const w = await makeWorld()
  const owner = await w.login(w.owner.email)
  const csv = `first_name,last_name,phone\n${'Ana,Ruiz,+13125550100\n'.repeat(5000)}` // ~110 KB
  const ok = await call(w.app, 'POST', '/api/import/preview', { cookie: owner, body: { kind: 'members', csv } })
  assert.equal(ok.status, 200, JSON.stringify(ok.body))
  const huge = JSON.stringify({ kind: 'members', csv: 'a'.repeat(4 * 1024 * 1024 + 1) })
  const over = await call(w.app, 'POST', '/api/import/preview', { cookie: owner, body: huge, headers: { 'content-length': String(huge.length) } })
  assert.deepEqual([over.status, over.body], [413, { error: MSG.importTooBig }])
})

/** Read an SSE body until it ends or `ms` pass; returns { text, ended }. */
async function readToEnd(reader, ms = 1500) {
  const dec = new TextDecoder()
  let text = ''
  const deadline = Date.now() + ms
  for (;;) {
    const left = deadline - Date.now()
    if (left <= 0) { await reader.cancel(); return { text, ended: false } }
    const { value, done } = await Promise.race([reader.read(), new Promise((r) => setTimeout(() => r({ timeout: true }), left))])
    if (done) return { text, ended: true }
    if (value) text += dec.decode(value, { stream: true })
  }
}

async function openStream(app, cookie) {
  const res = await app.request(`http://${HOST}/api/events`, { headers: { host: HOST, cookie } })
  assert.equal(res.status, 200)
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let text = ''
  while (!text.includes(': connected')) text += dec.decode((await reader.read()).value ?? new Uint8Array(), { stream: true })
  return reader
}

test('fix 3: after logout the open stream gets no more events and ends', async () => {
  const w = await makeWorld()
  w.addMember({ first: 'Mine', coachId: w.coach.id, phone: '+13125550111', daysSinceJoin: 10 })
  const cookie = await w.login(w.coach.email)
  const reader = await openStream(w.app, cookie)
  assert.equal((await call(w.app, 'POST', '/api/auth/logout', { cookie })).status, 200)
  await call(w.app, 'POST', '/api/kiosk/kiosk-token-1/checkin', { body: { phone: '3125550111' } })
  const { text, ended } = await readToEnd(reader)
  assert.ok(!text.includes('checkin'), text)
  assert.ok(ended, 'the stream should end')
})

test('fix 3: deactivating a coach ends their open stream', async () => {
  const w = await makeWorld()
  w.addMember({ first: 'Mine', coachId: w.coach.id, phone: '+13125550111', daysSinceJoin: 10 })
  const reader = await openStream(w.app, await w.login(w.coach.email))
  const owner = await w.login(w.owner.email)
  assert.equal((await call(w.app, 'PATCH', `/api/coaches/${w.coach.id}`, { cookie: owner, body: { active: false } })).status, 200)
  await call(w.app, 'POST', '/api/kiosk/kiosk-token-1/checkin', { body: { phone: '3125550111' } })
  const { text, ended } = await readToEnd(reader)
  assert.ok(!text.includes('checkin'), text)
  assert.ok(ended, 'the stream should end')
})

test('fix 3: a ping finds the session gone and ends the stream', async () => {
  const w = await makeWorld()
  const app = new Hono()
  app.use('/api/*', loadSession(w.app.deps))
  app.route('/api', eventRoutes({ ...w.app.deps, pingMs: 20 }))
  const reader = await openStream(app, await w.login(w.owner.email))
  w.db.prepare('DELETE FROM sessions').run()
  const { ended } = await readToEnd(reader)
  assert.ok(ended, 'the stream should end')
})

const signup = (w, i, email = `owner${i}@example.com`) =>
  call(w.app, 'POST', '/api/auth/signup', { body: { gymName: `Gym ${i}`, name: 'Ana Ruiz', email, password: 'longenough' } })

test('fix 4: sign-up allows 5 per device per 10 minutes, then 429', async () => {
  const w = await makeWorld()
  for (let i = 1; i <= 5; i++) assert.equal((await signup(w, i)).status, 200)
  const sixth = await signup(w, 6)
  assert.deepEqual([sixth.status, sixth.body], [429, { error: MSG.signupTooMany }])
  assert.equal(w.db.prepare("SELECT COUNT(*) AS n FROM users WHERE email LIKE 'owner%'").get().n, 5)
})

test('fix 4: parallel sign-ups are counted before hashing', async () => {
  const w = await makeWorld()
  const all = await Promise.all(Array.from({ length: 12 }, (_, i) => signup(w, i)))
  assert.equal(all.filter((r) => r.status === 200).length, 5, all.map((r) => r.status).join(' '))
})

/** Fastest of `n` runs, in ms. */
async function fastest(n, fn) {
  let best = Infinity
  for (let i = 0; i < n; i++) {
    const t = performance.now()
    await fn(i)
    best = Math.min(best, performance.now() - t)
  }
  return best
}

test('fix 4: a duplicate email is refused before the password is hashed', async () => {
  const w = await makeWorld()
  const scrypt = await fastest(3, () => hashPassword('longenough'))
  const dup = await fastest(3, async () => assert.equal((await signup(w, 0, w.owner.email)).status, 409))
  assert.ok(dup < scrypt / 3, `duplicate took ${dup.toFixed(1)} ms; one scrypt takes ${scrypt.toFixed(1)} ms`)
})

test('fix 5: an unknown email takes as long as a wrong password (it is checked against a dummy hash)', async () => {
  const w = await makeWorld()
  await login(w, 'warmup@nowhere.test', 'wrong-password')
  const scrypt = await fastest(3, () => hashPassword('longenough'))
  const unknown = await fastest(3, async (i) => assert.equal((await login(w, `nobody${i}@nowhere.test`, 'wrong-password')).status, 401))
  assert.ok(unknown > scrypt / 3, `unknown email took ${unknown.toFixed(1)} ms; one scrypt takes ${scrypt.toFixed(1)} ms`)
})

test('fix 5: the limiter drops keys whose window has passed', () => {
  let t = Date.parse('2026-11-06T18:00:00Z')
  const limiter = createLoginLimiter({ now: () => new Date(t), limit: 2, windowMs: 1000 })
  limiter.fail('a')
  limiter.fail('b')
  assert.equal(limiter.size, 2)
  t += 1001
  limiter.fail('c')
  assert.equal(limiter.size, 1)
  assert.equal(limiter.blocked('a'), false)
})
