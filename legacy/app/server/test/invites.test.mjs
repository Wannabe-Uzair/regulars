import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeWorld, call, cookieOf, HOST } from './fixtures.mjs'

test('an invite link works once; a second accept fails', async () => {
  const w = await makeWorld()
  const owner = await w.login(w.owner.email)
  const inv = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { name: 'Alex K.' } })
  assert.equal(inv.status, 200)
  assert.match(inv.body.link, new RegExp(`^http://192\\.168\\.137\\.1:5175/invite/[\\w-]{43}$`))
  assert.equal(Date.parse(inv.body.expiresAt) > Date.now() - 1e12, true)
  const token = inv.body.link.split('/').pop()

  const info = await call(w.app, 'GET', `/api/invites/${token}`)
  assert.deepEqual(info.body, { gymName: 'Northside Strength', name: 'Alex K.', role: 'coach' })

  const first = await call(w.app, 'POST', `/api/invites/${token}/accept`, { body: { name: 'Alex Kim', email: 'alex@northside.test', password: 'alex-password' } })
  assert.equal(first.status, 200)
  assert.equal(first.body.user.role, 'coach')
  assert.equal(first.body.gym.slug, 'northside')
  assert.equal((await call(w.app, 'GET', '/api/auth/me', { cookie: cookieOf(first.res) })).body.user.email, 'alex@northside.test')

  const second = await call(w.app, 'POST', `/api/invites/${token}/accept`, { body: { name: 'Eve', email: 'eve@northside.test', password: 'eve-password' } })
  assert.equal(second.status, 404)
  assert.ok(second.body.error)
  assert.equal((await call(w.app, 'GET', `/api/invites/${token}`)).status, 404)
  assert.equal(w.db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'eve@northside.test'").get().n, 0)
})

test('an unknown or expired invite is 404', async () => {
  const w = await makeWorld()
  assert.equal((await call(w.app, 'GET', '/api/invites/not-a-token')).status, 404)
  const owner = await w.login(w.owner.email)
  const inv = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { name: 'Late' } })
  w.db.prepare('UPDATE invites SET created_at = ?').run('2026-10-01T00:00:00.000Z')
  assert.equal((await call(w.app, 'GET', `/api/invites/${inv.body.link.split('/').pop()}`)).status, 404)
})

test('GET /api/coaches lists staff with member and slipping counts, owner included', async () => {
  const w = await makeWorld()
  w.addMember({ first: 'A', coachId: w.coach.id, daysSinceJoin: 20, weeks: [1, 1] })
  w.addMember({ first: 'B', coachId: w.coach.id, daysSinceJoin: 20, weeks: [3, 3] })
  w.addMember({ first: 'C', coachId: w.owner.id, daysSinceJoin: 5 })
  const r = await call(w.app, 'GET', '/api/coaches', { cookie: await w.login(w.owner.email) })
  assert.deepEqual(r.body.map((c) => [c.name, c.role, c.active, c.members, c.slipping]), [
    ['Mike R.', 'owner', true, 1, 0],
    ['Jordan T.', 'coach', true, 0, 0],
    ['Priya S.', 'coach', true, 2, 1],
  ])
})

test('an invite link uses the LAN address so a coach\'s phone can open it, and the request origin only with no LAN', async () => {
  const w = await makeWorld({ lan: () => ['10.0.0.7', '192.168.1.2'] })
  const owner = await w.login(w.owner.email)
  const inv = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { name: 'Alex K.' } })
  assert.match(inv.body.link, /^http:\/\/10\.0\.0\.7:5175\/invite\/[\w-]{43}$/)
  assert.doesNotMatch(inv.body.link, /tenure\.test|localhost/)
  const none = await makeWorld({ lan: () => [] })
  const o2 = await none.login(none.owner.email)
  const inv2 = await call(none.app, 'POST', '/api/invites', { cookie: o2, body: { name: 'Bo' } })
  assert.match(inv2.body.link, new RegExp(`^http://${HOST}/invite/`))
})
