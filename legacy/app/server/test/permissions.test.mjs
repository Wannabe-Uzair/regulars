import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeWorld, call } from './fixtures.mjs'

async function world() {
  const w = await makeWorld()
  const mine = w.addMember({ first: 'Mine', coachId: w.coach.id, daysSinceJoin: 20, weeks: [3, 3] })
  const theirs = w.addMember({ first: 'Theirs', coachId: w.coach2.id, daysSinceJoin: 20, weeks: [1, 1] })
  const owners = w.addMember({ first: 'Owners', coachId: w.owner.id, daysSinceJoin: 30, weeks: [2, 2, 2, 2] })
  return { ...w, mine, theirs, owners, coachCookie: await w.login(w.coach.email), ownerCookie: await w.login(w.owner.email) }
}

test("a coach gets 404 for another coach's member, 200 for their own", async () => {
  const w = await world()
  const other = await call(w.app, 'GET', `/api/members/${w.theirs}`, { cookie: w.coachCookie })
  assert.equal(other.status, 404)
  assert.ok(other.body.error)
  assert.equal((await call(w.app, 'GET', `/api/members/${w.mine}`, { cookie: w.coachCookie })).status, 200)
  assert.equal((await call(w.app, 'GET', '/api/members/999999', { cookie: w.coachCookie })).status, 404)
  // Nudging or rendering for someone else's member is a 404 too.
  assert.equal((await call(w.app, 'POST', '/api/nudges', { cookie: w.coachCookie, body: { memberId: w.theirs, body: 'hi' } })).status, 404)
  assert.equal((await call(w.app, 'POST', '/api/templates/render', { cookie: w.coachCookie, body: { memberId: w.theirs, body: 'hi' } })).status, 404)
})

test('a coach gets 403 on owner routes', async () => {
  const w = await world()
  const cookie = w.coachCookie
  const tries = [
    ['GET', '/api/coaches'],
    ['PATCH', `/api/coaches/${w.coach2.id}`, { active: false }],
    ['POST', '/api/invites', { name: 'X' }],
    ['POST', '/api/templates', { name: 'Mine', body: 'Hi {first}' }],
    ['PATCH', '/api/templates/1', { name: 'Renamed' }],
    ['DELETE', '/api/templates/1'],
    ['GET', '/api/billing'],
    ['GET', '/api/settings'],
    ['PATCH', '/api/settings', { name: 'Taken over' }],
    ['PATCH', `/api/members/${w.mine}`, { phone: '312 555 0199' }],
  ]
  for (const [method, path, body] of tries) {
    const r = await call(w.app, method, path, { cookie, body })
    assert.equal(r.status, 403, `${method} ${path}`)
  }
  // ...while the coach can still read templates.
  assert.equal((await call(w.app, 'GET', '/api/templates', { cookie })).body.length, 3)
})

test("a coach's /api/today and /api/members only contain their members; the owner sees all", async () => {
  const w = await world()
  const today = await call(w.app, 'GET', '/api/today', { cookie: w.coachCookie })
  assert.deepEqual(today.body.board.map((s) => s.id), [w.mine])
  assert.equal(today.body.kpis.newMembers, 1)
  assert.deepEqual(today.body.slipping, [])
  const list = await call(w.app, 'GET', '/api/members?all=1', { cookie: w.coachCookie })
  assert.deepEqual(list.body.map((s) => s.id), [w.mine])
  const sneaky = await call(w.app, 'GET', `/api/members?coach=${w.coach2.id}`, { cookie: w.coachCookie })
  assert.deepEqual(sneaky.body, [])
  const all = await call(w.app, 'GET', '/api/today', { cookie: w.ownerCookie })
  assert.equal(all.body.board.length, 3)
  assert.deepEqual(all.body.slipping.map((s) => s.id), [w.theirs])
  const filtered = await call(w.app, 'GET', `/api/members?coach=${w.coach2.id}&status=slipping`, { cookie: w.ownerCookie })
  assert.deepEqual(filtered.body.map((s) => s.id), [w.theirs])
  const q = await call(w.app, 'GET', '/api/members?q=own', { cookie: w.ownerCookie })
  assert.deepEqual(q.body.map((s) => s.id), [w.owners])
})

test('signed-out requests get 401', async () => {
  const w = await world()
  for (const path of ['/api/today', '/api/members', '/api/templates', '/api/nudges', '/api/billing', '/api/auth/me']) {
    assert.equal((await call(w.app, 'GET', path)).status, 401, path)
  }
})

test('the owner can change a member coach and phone (normalised to E.164)', async () => {
  const w = await world()
  const r = await call(w.app, 'PATCH', `/api/members/${w.mine}`, { cookie: w.ownerCookie, body: { coachId: w.coach2.id, phone: '(312) 555-0177' } })
  assert.equal(r.status, 200)
  assert.equal(r.body.member.coachId, w.coach2.id)
  assert.equal(r.body.member.coachName, 'Jordan T.')
  assert.equal(r.body.member.phone, '+13125550177')
  const bad = await call(w.app, 'PATCH', `/api/members/${w.mine}`, { cookie: w.ownerCookie, body: { phone: '12' } })
  assert.equal(bad.status, 400)
  const badCoach = await call(w.app, 'PATCH', `/api/members/${w.mine}`, { cookie: w.ownerCookie, body: { coachId: 424242 } })
  assert.equal(badCoach.status, 400)
})

test('member detail: days 0..89, check-ins and nudges', async () => {
  const w = await world()
  const r = await call(w.app, 'GET', `/api/members/${w.mine}`, { cookie: w.coachCookie })
  assert.equal(r.body.days.length, 90)
  assert.deepEqual(r.body.days[0], { date: r.body.member.joinedOn, day: 0, visited: true })
  assert.equal(r.body.days.filter((d) => d.visited).length, 6)
  assert.equal(r.body.checkins.length, 6)
  assert.equal(r.body.member.source, 'seed')
  assert.deepEqual(r.body.nudges, [])
})
