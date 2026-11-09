import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeWorld, call, TODAY } from './fixtures.mjs'
import { MSG } from '../messages.mjs'

const K = '/api/kiosk/kiosk-token-1'
const checkins = (w, id) => w.db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE member_id = ?').get(id).n

test('a bad kiosk token is a 404; the right one gives the gym name', async () => {
  const w = await makeWorld()
  const bad = await call(w.app, 'GET', '/api/kiosk/not-a-token')
  assert.deepEqual([bad.status, bad.body], [404, { error: MSG.linkInvalid }])
  assert.equal((await call(w.app, 'POST', '/api/kiosk/not-a-token/checkin', { body: { phone: '3125550100' } })).status, 404)
  assert.deepEqual((await call(w.app, 'GET', K)).body, { gymName: 'Northside Strength', isDemo: false })
})

test('join creates a week-0 member checked in today, coaches by round-robin among active staff', async () => {
  const w = await makeWorld()
  const types = []
  w.app.deps.events.subscribe(w.gymId, (type) => types.push(type))
  const coaches = []
  for (const firstName of ['Ana', 'Ben', 'Cy', 'Di']) {
    const r = await call(w.app, 'POST', `${K}/join`, { body: { firstName, lastName: 'Kiosk', phone: null } })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { firstName, week: 0, day: 0, visitsThisWeek: 1, status: 'new' })
    const m = w.db.prepare('SELECT * FROM members WHERE first_name = ?').get(firstName)
    assert.deepEqual([m.joined_on, m.source], [TODAY, 'kiosk'])
    assert.equal(checkins(w, m.id), 1)
    coaches.push(m.coach_id)
  }
  assert.deepEqual(coaches, [w.owner.id, w.coach.id, w.coach2.id, w.owner.id])
  assert.deepEqual(types, ['member', 'checkin', 'member', 'checkin', 'member', 'checkin', 'member', 'checkin'])
  // A turned-off coach is skipped: after the owner (Di) comes Jordan, not Priya.
  w.db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(w.coach.id)
  await call(w.app, 'POST', `${K}/join`, { body: { firstName: 'Ed' } })
  assert.equal(w.db.prepare("SELECT coach_id FROM members WHERE first_name = 'Ed'").get().coach_id, w.coach2.id)
  assert.equal((await call(w.app, 'POST', `${K}/join`, { body: { firstName: ' ' } })).body.error, MSG.kioskFirstName)
  const phone = await call(w.app, 'POST', `${K}/join`, { body: { firstName: 'Fi', phone: '(312) 555-0177' } })
  assert.equal(phone.status, 200)
  assert.equal((await call(w.app, 'POST', `${K}/join`, { body: { firstName: 'Fi', phone: '312.555.0177' } })).status, 409)
})

test('checkin by phone welcomes the member; a second one within the hour is not stored', async () => {
  const w = await makeWorld()
  const id = w.addMember({ first: 'Sam', last: 'Ortiz', phone: '+13125550142', daysSinceJoin: 24, weeks: [2, 1, 0], current: 1 })
  const seen = []
  w.app.deps.events.subscribe(w.gymId, (type, data) => seen.push([type, data]))
  const before = checkins(w, id)
  const r = await call(w.app, 'POST', `${K}/checkin`, { body: { phone: '(312) 555-0142' } })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { firstName: 'Sam', week: 3, day: 24, visitsThisWeek: 2, status: 'slipping' })
  assert.equal(checkins(w, id), before + 1)
  assert.deepEqual(seen.map(([t, d]) => [t, d.memberId, d.name]), [['checkin', id, 'Sam O.']])
  const again = await call(w.app, 'POST', `${K}/checkin`, { body: { memberId: id } })
  assert.deepEqual(again.body, r.body)
  assert.equal(checkins(w, id), before + 1)
  assert.equal(seen.length, 1)
  const none = await call(w.app, 'POST', `${K}/checkin`, { body: { phone: '312-555-0199' } })
  assert.deepEqual([none.status, none.body], [404, { error: MSG.kioskNotFound }])
})

test('search shows first name and last initial only, at most 6', async () => {
  const w = await makeWorld()
  for (let i = 0; i < 8; i++) w.addMember({ first: 'Sam', last: `Ortiz${i}`, daysSinceJoin: 3 })
  w.addMember({ first: 'Samira', last: 'Khan', daysSinceJoin: 3 })
  w.addMember({ first: 'Maya', last: 'Reyes', daysSinceJoin: 3 })
  const r = await call(w.app, 'GET', `${K}/search?q=SA`)
  assert.equal(r.status, 200)
  assert.equal(r.body.length, 6)
  for (const hit of r.body) assert.deepEqual(Object.keys(hit), ['memberId', 'name'])
  assert.ok(!JSON.stringify(r.body).includes('Ortiz'))
  assert.equal(r.body[0].name, 'Sam O.')
  assert.deepEqual((await call(w.app, 'GET', `${K}/search?q=maya%20r`)).body.map((h) => h.name), ['Maya R.'])
  assert.deepEqual((await call(w.app, 'GET', `${K}/search?q=`)).body, [])
})

test('the kiosk allows 30 requests a minute per IP, then 429', async () => {
  const w = await makeWorld()
  for (let i = 0; i < 30; i++) assert.equal((await call(w.app, 'GET', K)).status, 200, `request ${i + 1}`)
  const r = await call(w.app, 'GET', `${K}/search?q=a`)
  assert.deepEqual([r.status, r.body], [429, { error: MSG.kioskTooMany }])
})

test("the kiosk can't check in another gym's member", async () => {
  const w = await makeWorld()
  const other = Number(w.db.prepare(`INSERT INTO gyms (name, slug, kiosk_token) VALUES ('Other', 'other', 'other-token')`).run().lastInsertRowid)
  const id = Number(w.db.prepare(`INSERT INTO members (gym_id, first_name, joined_on) VALUES (?, 'Zed', ?)`).run(other, TODAY).lastInsertRowid)
  assert.equal((await call(w.app, 'POST', `${K}/checkin`, { body: { memberId: id } })).status, 404)
  assert.equal(checkins(w, id), 0)
})
