import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeWorld, call, KIT } from './fixtures.mjs'
import { MSG } from '../messages.mjs'
import { planMembers } from '../import/plan.mjs'
import { DEFAULT_TEMPLATES } from '../templates.mjs'

const K = '/api/kiosk/kiosk-token-1'

test('PATCH member phone: a number another member of the gym has is a 409; own number and a free one are fine', async () => {
  const w = await makeWorld()
  const a = w.addMember({ first: 'Ann', daysSinceJoin: 10, phone: '+13125550001' })
  const b = w.addMember({ first: 'Bo', daysSinceJoin: 10, phone: '+13125550002' })
  const cookie = await w.login(w.owner.email)
  const dup = await call(w.app, 'PATCH', `/api/members/${b}`, { cookie, body: { phone: '(312) 555-0001' } })
  assert.deepEqual([dup.status, dup.body], [409, { error: MSG.duplicate }])
  assert.equal(w.db.prepare('SELECT phone FROM members WHERE id = ?').get(b).phone, '+13125550002')
  assert.equal((await call(w.app, 'PATCH', `/api/members/${a}`, { cookie, body: { phone: '3125550001' } })).status, 200)
  assert.equal((await call(w.app, 'PATCH', `/api/members/${b}`, { cookie, body: { phone: '3125550003' } })).status, 200)
})

test('PATCH member: a refused phone leaves the coach change unsaved too (nothing is half-saved)', async () => {
  const w = await makeWorld()
  w.addMember({ first: 'Ann', daysSinceJoin: 10, phone: '+13125550001' })
  const b = w.addMember({ first: 'Bo', daysSinceJoin: 10, phone: '+13125550002' })
  const cookie = await w.login(w.owner.email)
  const res = await call(w.app, 'PATCH', `/api/members/${b}`, { cookie, body: { coachId: w.coach.id, phone: '3125550001' } })
  assert.equal(res.status, 409)
  const after = w.db.prepare('SELECT coach_id, phone FROM members WHERE id = ?').get(b)
  assert.deepEqual([after.coach_id, after.phone], [w.owner.id, '+13125550002'])
})

test('import: a row cannot give an existing member an ID an earlier row already planned', () => {
  const M = { external_id: 0, first_name: 1, last_name: 2, phone: 3, email: 4, joined_on: 5 }
  const r = planMembers({
    rows: [['X1', 'New', '', '', '', '2026-09-01'], ['X1', 'Kiosk', '', '(312) 555-0142', '', '2026-09-01']],
    mapping: M,
    existing: [{ id: 5, externalId: null, phone: '+13125550142', firstName: 'Kiosk', lastName: '', email: null, joinedOn: '2026-09-01', coachId: null }],
    coaches: [],
  })
  assert.equal(r.creates.length, 1)
  assert.equal(r.updates.length, 0)
  assert.deepEqual(r.skipped.map((s) => s.row), [3])
  assert.match(r.skipped[0].reason, /^Row 3: .*"X1".*earlier in the file/)
})

test('kiosk join: a last name of only spaces is treated as none', async () => {
  const w = await makeWorld()
  const r = await call(w.app, 'POST', `${K}/join`, { body: { firstName: 'Zed', lastName: '   ', phone: null } })
  assert.equal(r.status, 200)
  assert.equal(w.db.prepare('SELECT last_name FROM members WHERE first_name = ?').get('Zed').last_name, null)
  const padded = await call(w.app, 'POST', `${K}/join`, { body: { firstName: 'Yan', lastName: ' Lee ', phone: null } })
  assert.equal(padded.status, 200)
  assert.equal(w.db.prepare('SELECT last_name FROM members WHERE first_name = ?').get('Yan').last_name, 'Lee')
})

test('nudge history: a coach no longer sees nudges to a member who moved to another coach', async () => {
  const w = await makeWorld()
  const sam = w.addMember({ ...KIT.sam, coachId: w.coach.id })
  const cookie = await w.login(w.coach.email)
  const sent = await call(w.app, 'POST', '/api/nudges', { cookie, body: { memberId: sam, body: 'Hi Sam' } })
  assert.equal(sent.status, 200)
  assert.equal((await call(w.app, 'GET', '/api/nudges', { cookie })).body.length, 1)
  w.db.prepare('UPDATE members SET coach_id = ? WHERE id = ?').run(w.coach2.id, sam)
  assert.equal((await call(w.app, 'GET', '/api/nudges', { cookie })).body.length, 0)
  const owner = await w.login(w.owner.email)
  assert.equal((await call(w.app, 'GET', '/api/nudges', { cookie: owner })).body.length, 1)
})

test('invite accept checks the link before hashing the password', async () => {
  const w = await makeWorld()
  const auth = await import('../auth.mjs')
  const src = (await import('node:fs')).readFileSync(new URL('../routes/auth.mjs', import.meta.url), 'utf8')
  // Behaviour: a bad token is a 404 and no user is made; timing is pinned by call order below.
  const bad = await call(w.app, 'POST', '/api/invites/nope/accept', { body: { name: 'Eve', email: 'eve@x.test', password: 'long-enough-pw' } })
  assert.deepEqual([bad.status, bad.body], [404, { error: MSG.linkInvalid }])
  const accept = src.slice(src.indexOf("'/invites/:token/accept'"))
  assert.ok(accept.indexOf('liveInvite(') < accept.indexOf('hashPassword('), 'liveInvite must run before hashPassword')
  assert.equal(typeof auth.hashPassword, 'function')
})

test('default templates match the demo seed names and stay GSM-7 (no em dash)', () => {
  assert.deepEqual(DEFAULT_TEMPLATES.map((t) => t.name), ['We missed you', 'First weeks', 'One visit'])
  for (const t of DEFAULT_TEMPLATES) assert.doesNotMatch(t.body, /[—–’]/)
})
