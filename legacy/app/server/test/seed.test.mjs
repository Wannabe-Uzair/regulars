import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededWorld } from './seeded.mjs'
import { call, TODAY, NOW } from './fixtures.mjs'
import { loadSummaries } from '../queries.mjs'
import { analyze } from '../seed/rules.mjs'

test('the seed has 85 members (60 in their first 90 days), 3 staff, 3 templates and about 20 nudges', async () => {
  const w = await seededWorld()
  const count = (t) => w.db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n
  assert.equal(count('gyms'), 1)
  assert.equal(count('members'), 85)
  assert.equal(count('users'), 3)
  assert.equal(count('templates'), 3)
  assert.ok(count('nudges') >= 15 && count('nudges') <= 25, `nudges: ${count('nudges')}`)
  assert.ok(count('checkins') > 500)
  const gym = w.db.prepare('SELECT * FROM gyms').get()
  assert.equal(gym.is_demo, 1)
  assert.ok(gym.kiosk_token.length >= 32)
  assert.equal(w.db.prepare("SELECT COUNT(*) AS n FROM members WHERE source = 'seed'").get().n, 85)
  assert.equal(w.db.prepare("SELECT COUNT(*) AS n FROM nudges WHERE channel = 'own-phone' AND template_id IS NOT NULL").get().n, count('nudges'))
  const owner = w.db.prepare("SELECT * FROM users WHERE role = 'owner'").get()
  assert.equal(loadSummaries(w.db, gym, owner, { today: TODAY }).length, 60)
})

test('the three demo logins work and see the right scope', async () => {
  const w = await seededWorld()
  for (const email of ['mike@northside.test', 'priya@northside.test', 'jordan@northside.test']) {
    const { status, cookie } = await w.login(email)
    assert.equal(status, 200, email)
    const today = await call(w.app, 'GET', '/api/today', { cookie })
    assert.equal(today.status, 200)
    if (email.startsWith('mike')) {
      assert.equal(today.body.kpis.newMembers, 60)
      assert.ok(today.body.kpis.slipping >= 10 && today.body.kpis.slipping <= 14, `slipping ${today.body.kpis.slipping}`)
    } else assert.ok(today.body.kpis.newMembers > 10 && today.body.kpis.newMembers < 30)
  }
  assert.equal((await w.login('mike@northside.test', 'wrong-password')).status, 401)
})

for (const today of [TODAY, '2026-03-10', '2027-01-02']) {
  test(`metrics.mjs and seed/rules.mjs agree on every seeded member's status (today ${today})`, async () => {
    const now = new Date(`${today}T18:00:00.000Z`)
    const w = await seededWorld({ today, now })
    const gym = w.db.prepare('SELECT * FROM gyms').get()
    const owner = w.db.prepare("SELECT * FROM users WHERE role = 'owner'").get()
    const byId = new Map(loadSummaries(w.db, gym, owner, { today, all: true }).map((s) => [s.id, s]))
    let checked = 0
    for (const [key, r] of analyze(w.data, today)) {
      if (!r.inWindow) continue
      const s = byId.get(w.ids.get(key))
      assert.equal(s.status, r.status, `${r.member.firstName} ${r.member.lastName}`)
      assert.deepEqual(s.weeks, r.weeks, `${r.member.firstName} ${r.member.lastName}`)
      checked++
    }
    assert.equal(checked, 60)
  })
}
void NOW
