import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeWorld, call, KIT, NOW } from './fixtures.mjs'
import { smsUrl } from '../routes/nudges.mjs'

test('render fills {first} {coach} {gym} {days} for that member and the current user', async () => {
  const w = await makeWorld()
  const sam = w.addMember({ ...KIT.sam, coachId: w.coach.id })
  const cookie = await w.login(w.coach.email)
  const tpls = (await call(w.app, 'GET', '/api/templates', { cookie })).body
  const back = tpls.find((t) => t.name === 'One visit')
  const r = await call(w.app, 'POST', '/api/templates/render', { cookie, body: { memberId: sam, templateId: back.id } })
  assert.equal(r.status, 200)
  // Sam's last visit is day 21 of 24: 3 days ago.
  assert.equal(r.body.body, 'Hi Sam, it\'s been 3 days since we saw you. One visit this week is a good restart. Want me to save you a spot? - Priya')
  const custom = await call(w.app, 'POST', '/api/templates/render', { cookie, body: { memberId: sam, body: '{first} at {gym}, from {coach}' } })
  assert.equal(custom.body.body, 'Sam at Northside Strength, from Priya')
  const none = await call(w.app, 'POST', '/api/templates/render', { cookie, body: { memberId: sam } })
  assert.equal(none.status, 400)
})

test('POST /api/nudges records the nudge and returns smsUrl (null without a phone)', async () => {
  const w = await makeWorld()
  const hana = w.addMember({ ...KIT.hana, phone: '+13125550142' })
  const nophone = w.addMember({ first: 'Nophone', daysSinceJoin: 20, weeks: [1, 0], phone: null })
  const cookie = await w.login(w.owner.email)
  const seen = []
  w.app.deps.events.subscribe(w.gymId, (type, data) => seen.push([type, data]))
  const body = "Hey Hana, we missed you & it's 6 pm?"
  const r = await call(w.app, 'POST', '/api/nudges', { cookie, body: { memberId: hana, templateId: 1, body } })
  assert.equal(r.status, 200)
  assert.equal(r.body.smsUrl, `sms:+13125550142?&body=${encodeURIComponent(body)}`)
  assert.equal(r.body.smsUrl, 'sms:+13125550142?&body=Hey%20Hana%2C%20we%20missed%20you%20%26%20it\'s%206%20pm%3F')
  assert.deepEqual(r.body.nudge, { id: r.body.nudge.id, at: NOW.toISOString(), body })
  assert.deepEqual(seen, [['nudge', { memberId: hana }]])
  const p = await call(w.app, 'POST', '/api/nudges', { cookie, body: { memberId: nophone, body: 'In person' } })
  assert.equal(p.status, 200)
  assert.equal(p.body.smsUrl, null)
  assert.equal(smsUrl(null, 'x'), null)
  const empty = await call(w.app, 'POST', '/api/nudges', { cookie, body: { memberId: hana, body: '  ' } })
  assert.equal(empty.status, 400)
  const today = await call(w.app, 'GET', '/api/today', { cookie })
  assert.equal(today.body.kpis.nudgedThisWeek, 2)
  assert.equal(today.body.board.find((s) => s.id === hana).lastNudgeAt, NOW.toISOString())
})

test('came back is true when a check-in follows within 7 days', async () => {
  const w = await makeWorld()
  const hana = w.addMember({ ...KIT.hana, coachId: w.coach.id })
  const sam = w.addMember({ ...KIT.sam, coachId: w.coach.id })
  const at = (d) => new Date(NOW.getTime() - d * 86400000).toISOString()
  const add = w.db.prepare(`INSERT INTO nudges (gym_id, member_id, user_id, body, channel, sent_at) VALUES (?, ?, ?, ?, 'own-phone', ?)`)
  add.run(w.gymId, hana, w.coach.id, 'Hana nudge', at(10))
  add.run(w.gymId, sam, w.coach.id, 'Sam nudge', at(12)) // day 12; Sam's next visit is day 21
  add.run(w.gymId, sam, w.owner.id, 'Owner nudge', at(2))
  w.addCheckin(hana, at(5)) // 5 days after Hana's nudge
  w.addCheckin(sam, at(1)) // 1 day after the owner's nudge
  const coach = await w.login(w.coach.email)
  const list = await call(w.app, 'GET', '/api/nudges?days=30', { cookie: coach })
  assert.deepEqual(list.body.map((n) => [n.memberName, n.by, n.cameBack]).sort(), [['Hana L.', 'Priya S.', true], ['Sam O.', 'Priya S.', false]])
  const owner = await w.login(w.owner.email)
  const all = await call(w.app, 'GET', '/api/nudges', { cookie: owner })
  assert.equal(all.body.length, 3)
  assert.deepEqual(all.body[0], { id: all.body[0].id, at: at(2), memberId: sam, memberName: 'Sam O.', by: 'Mike R.', body: 'Owner nudge', cameBack: true })
  const recent = await call(w.app, 'GET', '/api/nudges?days=5', { cookie: owner })
  assert.equal(recent.body.length, 1)
  const detail = await call(w.app, 'GET', `/api/members/${hana}`, { cookie: coach })
  assert.deepEqual(detail.body.nudges.map((n) => n.cameBack), [true])
})

test('the owner creates, edits and deletes templates', async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.owner.email)
  const made = await call(w.app, 'POST', '/api/templates', { cookie, body: { name: 'Welcome', body: 'Welcome to {gym}, {first}!' } })
  assert.equal(made.status, 201)
  assert.deepEqual(Object.keys(made.body), ['id', 'name', 'body'])
  const edited = await call(w.app, 'PATCH', `/api/templates/${made.body.id}`, { cookie, body: { body: 'Hi {first}' } })
  assert.deepEqual(edited.body, { id: made.body.id, name: 'Welcome', body: 'Hi {first}' })
  assert.equal((await call(w.app, 'GET', '/api/templates', { cookie })).body.at(-1).name, 'Welcome')
  assert.deepEqual((await call(w.app, 'DELETE', `/api/templates/${made.body.id}`, { cookie })).body, { ok: true })
  assert.equal((await call(w.app, 'GET', '/api/templates', { cookie })).body.length, 3)
  assert.equal((await call(w.app, 'PATCH', `/api/templates/${made.body.id}`, { cookie, body: { name: 'x' } })).status, 404)
})
