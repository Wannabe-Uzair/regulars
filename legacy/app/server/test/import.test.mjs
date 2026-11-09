import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeWorld, call } from './fixtures.mjs'
import { MSG } from '../messages.mjs'

const sample = (name) => readFileSync(new URL(`../import/samples/${name}`, import.meta.url), 'utf8')
const count = (w, table) => w.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n

test('the sample CSVs preview with a full mapping and commit 12 members and their check-ins, once', async () => {
  const w = await makeWorld()
  const cookie = await w.login(w.owner.email)
  const seen = []
  w.app.deps.events.subscribe(w.gymId, (type) => seen.push(type))

  const pm = await call(w.app, 'POST', '/api/import/preview', { cookie, body: { kind: 'members', csv: sample('members.csv') } })
  assert.equal(pm.status, 200)
  assert.equal(pm.body.rowCount, 12)
  assert.deepEqual(pm.body.problems, [])
  assert.ok(pm.body.sample.length === 10 && pm.body.columns.length === 7)
  for (const [field, col] of Object.entries(pm.body.mapping)) assert.equal(typeof col, 'number', field)

  const pc = await call(w.app, 'POST', '/api/import/preview', { cookie, body: { kind: 'checkins', csv: sample('checkins.csv') } })
  assert.equal(pc.status, 200)
  assert.deepEqual(pc.body.problems, [])
  assert.equal(typeof pc.body.mapping.external_id, 'number')
  assert.equal(typeof pc.body.mapping.checked_in_at, 'number')

  const commit = (kind, mapping) => call(w.app, 'POST', '/api/import/commit', { cookie, body: { kind, csv: sample(`${kind}.csv`), mapping } })
  const cm = await commit('members', pm.body.mapping)
  assert.equal(cm.status, 200)
  assert.equal(cm.body.created, 12)
  assert.equal(count(w, "members WHERE source = 'csv'"), 12)
  assert.equal(w.db.prepare("SELECT COUNT(*) AS n FROM members WHERE coach_id IS NOT NULL AND phone LIKE '+1773555%'").get().n, 12)
  const cc = await commit('checkins', pc.body.mapping)
  assert.equal(cc.status, 200)
  assert.equal(cc.body.created, pc.body.rowCount - cc.body.skipped)
  assert.ok(cc.body.created > 100)
  assert.equal(count(w, "checkins WHERE source = 'csv'"), cc.body.created)
  assert.equal(seen.filter((t) => t === 'member').length, 12)
  assert.equal(seen.filter((t) => t === 'checkin').length, cc.body.created)

  // The same files again: nothing new. Column names work as a mapping too.
  const names = Object.fromEntries(Object.entries(pm.body.mapping).map(([f, i]) => [f, pm.body.columns[i]]))
  const again = await commit('members', names)
  assert.equal(again.status, 200)
  assert.deepEqual([again.body.created, again.body.updated, again.body.skipped], [0, 0, 12])
  const againC = await commit('checkins', pc.body.mapping)
  assert.equal(againC.body.created, 0)
  assert.equal(count(w, 'members'), 12)
  assert.equal(count(w, "checkins WHERE source = 'csv'"), cc.body.created)
})

test('import is owner only, and a CSV over 2 MB is refused with a sentence', async () => {
  const w = await makeWorld()
  const coach = await w.login(w.coach.email)
  const csv = sample('members.csv')
  assert.equal((await call(w.app, 'POST', '/api/import/preview', { cookie: coach, body: { kind: 'members', csv } })).status, 403)
  assert.equal((await call(w.app, 'POST', '/api/import/commit', { cookie: coach, body: { kind: 'members', csv, mapping: {} } })).status, 403)
  const owner = await w.login(w.owner.email)
  const big = await call(w.app, 'POST', '/api/import/preview', { cookie: owner, body: { kind: 'members', csv: 'a'.repeat(2 * 1024 * 1024 + 1) } })
  assert.deepEqual([big.status, big.body], [400, { error: MSG.importTooBig }])
  assert.equal((await call(w.app, 'POST', '/api/import/preview', { cookie: owner, body: { kind: 'nope', csv } })).status, 400)
  assert.equal(count(w, 'members'), 0)
})
