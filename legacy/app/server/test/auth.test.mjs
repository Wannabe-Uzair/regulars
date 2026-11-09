import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword, sha256 } from '../auth.mjs'
import { openDb } from '../db.mjs'
import { createApp } from '../app.mjs'
import { makeWorld, call, cookieOf, PASSWORD, NOW, TODAY } from './fixtures.mjs'

test('scrypt hash round trip in the scrypt$N$r$p$salt$hash format', async () => {
  const h = await hashPassword('hunter2-hunter2')
  assert.match(h, /^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/)
  assert.equal(await verifyPassword('hunter2-hunter2', h), true)
  assert.equal(await verifyPassword('hunter2-hunter3', h), false)
  assert.notEqual(await hashPassword('hunter2-hunter2'), h, 'salted')
  assert.equal(await verifyPassword('x', 'garbage'), false)
})

test('signup creates the gym, the owner and the three default templates, and logs in', async () => {
  const db = openDb(':memory:')
  const app = createApp({ db, now: () => NOW })
  const r = await call(app, 'POST', '/api/auth/signup', { body: { gymName: 'Iron & Oak Gym', name: 'Ana Ruiz', email: 'Ana@Example.com', password: 'longenough' } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.user, { id: r.body.user.id, name: 'Ana Ruiz', email: 'ana@example.com', role: 'owner' })
  assert.deepEqual(r.body.gym, { id: r.body.gym.id, name: 'Iron & Oak Gym', slug: 'iron-oak-gym', isDemo: false, timezone: 'America/Chicago', plan: 'pilot', pilotStartedOn: TODAY })
  const gym = db.prepare('SELECT * FROM gyms').get()
  assert.ok(gym.kiosk_token.length >= 32)
  const cookie = cookieOf(r.res)
  const tpl = await call(app, 'GET', '/api/templates', { cookie })
  assert.deepEqual(tpl.body.map((t) => t.name), ['We missed you', 'First weeks', 'One visit'])
  const me = await call(app, 'GET', '/api/auth/me', { cookie })
  assert.equal(me.status, 200)
  // Same gym name again gets a fresh slug; same email is a conflict; short password is refused.
  const again = await call(app, 'POST', '/api/auth/signup', { body: { gymName: 'Iron & Oak Gym', name: 'B', email: 'b@example.com', password: 'longenough' } })
  assert.equal(again.body.gym.slug, 'iron-oak-gym-2')
  const dup = await call(app, 'POST', '/api/auth/signup', { body: { gymName: 'X', name: 'C', email: 'ANA@example.com', password: 'longenough' } })
  assert.equal(dup.status, 409)
  const short = await call(app, 'POST', '/api/auth/signup', { body: { gymName: 'X', name: 'C', email: 'c@example.com', password: 'short' } })
  assert.equal(short.status, 400)
  assert.ok(short.body.error)
})

test('login: good password gives a session cookie; a bad one gives 401 with the spec message', async () => {
  const w = await makeWorld()
  const good = await call(w.app, 'POST', '/api/auth/login', { body: { email: 'MIKE@northside.test', password: PASSWORD } })
  assert.equal(good.status, 200)
  assert.equal(good.body.user.role, 'owner')
  assert.equal(good.body.gym.name, 'Northside Strength')
  const set = good.res.headers.get('set-cookie')
  assert.match(set, /^tenure_session=[\w-]{43};/)
  assert.match(set, /HttpOnly/)
  assert.match(set, /SameSite=Lax/)
  assert.match(set, /Path=\//)
  assert.match(set, /Max-Age=2592000/)
  const token = cookieOf(good.res).split('=')[1]
  assert.ok(w.db.prepare('SELECT 1 FROM sessions WHERE token_hash = ?').get(sha256(token)), 'only the hash is stored')
  assert.equal(w.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?').get(token).n, 0)
  const bad = await call(w.app, 'POST', '/api/auth/login', { body: { email: 'mike@northside.test', password: 'wrong-password' } })
  assert.equal(bad.status, 401)
  assert.deepEqual(bad.body, { error: "That email and password don't match." })
  const nobody = await call(w.app, 'POST', '/api/auth/login', { body: { email: 'nobody@northside.test', password: PASSWORD } })
  assert.equal(nobody.status, 401)
})

test('the login rate limit returns 429 on the 11th try', async () => {
  const w = await makeWorld()
  for (let i = 1; i <= 10; i++) {
    const r = await call(w.app, 'POST', '/api/auth/login', { body: { email: 'mike@northside.test', password: `nope-${i}` } })
    assert.equal(r.status, 401, `try ${i}`)
  }
  const eleventh = await call(w.app, 'POST', '/api/auth/login', { body: { email: 'mike@northside.test', password: PASSWORD } })
  assert.equal(eleventh.status, 429)
  assert.ok(eleventh.body.error)
  // Another email from the same place is not blocked.
  const other = await call(w.app, 'POST', '/api/auth/login', { body: { email: 'priya@northside.test', password: PASSWORD } })
  assert.equal(other.status, 200)
})

test('logout ends the session', async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.owner.email)
  assert.equal((await call(w.app, 'GET', '/api/auth/me', { cookie })).status, 200)
  const out = await call(w.app, 'POST', '/api/auth/logout', { cookie, body: {} })
  assert.deepEqual(out.body, { ok: true })
  assert.match(out.res.headers.get('set-cookie'), /tenure_session=;/)
  const me = await call(w.app, 'GET', '/api/auth/me', { cookie })
  assert.equal(me.status, 401)
  assert.ok(me.body.error)
})

test('a deactivated coach cannot log in and loses their sessions', async () => {
  const w = await makeWorld()
  const coachCookie = await w.login(w.coach.email)
  const owner = await w.login(w.owner.email)
  const off = await call(w.app, 'PATCH', `/api/coaches/${w.coach.id}`, { cookie: owner, body: { active: false } })
  assert.equal(off.status, 200)
  assert.equal((await call(w.app, 'GET', '/api/auth/me', { cookie: coachCookie })).status, 401)
  const r = await call(w.app, 'POST', '/api/auth/login', { body: { email: w.coach.email, password: PASSWORD } })
  assert.equal(r.status, 401)
})

test('an expired session is refused', async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.owner.email)
  w.db.prepare('UPDATE sessions SET expires_at = ?').run('2026-11-01T00:00:00.000Z')
  assert.equal((await call(w.app, 'GET', '/api/auth/me', { cookie })).status, 401)
})
