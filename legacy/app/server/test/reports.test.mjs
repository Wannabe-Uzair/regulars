import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededWorld } from './seeded.mjs'
import { call, TODAY, NOW } from './fixtures.mjs'
import { buildReports } from '../reports/reports.mjs'

test('GET /api/reports equals buildReports on the seed data; owner only', async () => {
  const w = await seededWorld()
  const owner = await w.login('mike@northside.test')
  const r = await call(w.app, 'GET', '/api/reports', { cookie: owner.cookie })
  assert.equal(r.status, 200)
  const d = w.data
  const expected = buildReports({
    today: TODAY, now: NOW.toISOString(), timezone: d.gym.timezone,
    members: d.members.map((m) => ({ id: w.ids.get(m.key), joinedOn: m.joinedOn })),
    checkins: d.checkins.map((c) => ({ memberId: w.ids.get(c.memberKey), at: c.at })),
    nudges: d.nudges.map((n) => ({ memberId: w.ids.get(n.memberKey), sentAt: n.sentAt })),
  })
  assert.deepEqual(r.body, expected)
  assert.equal(r.body.cohorts.length, 4)
  assert.ok(r.body.nudges.sent > 0)
  const coach = await w.login('priya@northside.test')
  assert.equal((await call(w.app, 'GET', '/api/reports', { cookie: coach.cookie })).status, 403)
  assert.equal((await call(w.app, 'GET', '/api/reports')).status, 401)
})
