import { test } from 'node:test'
import assert from 'node:assert/strict'
import { progress, statusOf, paceOf, kpis, localDate, daysBetween, addDays, cameBack, renderTemplate } from '../metrics.mjs'
import { makeWorld, call, KIT, TODAY, TZ, localNoon } from './fixtures.mjs'

/** progress() for a member built like the fixture does it, without a DB. */
function pattern({ weeks, daysSinceJoin, current = 0, extra = [] }) {
  const joinedOn = addDays(TODAY, -daysSinceJoin)
  const days = []
  weeks.forEach((k, w) => { for (let i = 0; i < k; i++) days.push(w * 7 + i) })
  for (let i = 0; i < current; i++) days.push(Math.floor(daysSinceJoin / 7) * 7 + i)
  const checkinAts = [...days, ...extra].map((d) => localNoon(addDays(joinedOn, d)))
  return progress({ joinedOn, checkinAts, today: TODAY, timeZone: TZ })
}

test('kit samples: Maya on, Chris below, Hana and Sam slipping', () => {
  const expect = { maya: 'on', chris: 'below', hana: 'slipping', sam: 'slipping' }
  for (const [key, status] of Object.entries(expect)) {
    const k = KIT[key]
    const p = pattern(k)
    assert.equal(p.status, status, key)
    assert.deepEqual(p.weeks, [...k.weeks, k.current], `${key} weeks[]`)
    assert.equal(p.week, k.weeks.length, `${key} current week`)
  }
})

test('kit samples through the API: statuses, slipping order and the board order', async () => {
  const w = await makeWorld()
  const ids = Object.fromEntries(Object.entries(KIT).map(([k, m]) => [k, w.addMember(m)]))
  const cookie = await w.login(w.owner.email)
  const r = await call(w.app, 'GET', '/api/today', { cookie })
  assert.equal(r.status, 200)
  const byId = Object.fromEntries(r.body.board.map((s) => [s.id, s]))
  assert.equal(byId[ids.maya].status, 'on')
  assert.equal(byId[ids.chris].status, 'below')
  assert.equal(byId[ids.hana].status, 'slipping')
  assert.equal(byId[ids.sam].status, 'slipping')
  assert.equal(byId[ids.sam].name, 'Sam O.')
  assert.equal(byId[ids.maya].pace, 3.3)
  // Slipping first (most days since last visit first), then joinedOn desc.
  assert.deepEqual(r.body.slipping.map((s) => s.id), [ids.hana, ids.sam].sort((a, b) => byId[b].daysSinceLastVisit - byId[a].daysSinceLastVisit))
  assert.deepEqual(r.body.board.slice(2).map((s) => s.id), [ids.maya, ids.chris])
  assert.deepEqual(new Set(r.body.board.slice(0, 2).map((s) => s.id)), new Set([ids.hana, ids.sam]))
})

test("SLIPPING NOW: the viewer's own members first, each group most days since last visit first", async () => {
  const w = await makeWorld()
  // weeks [2, 1, 0]: visits on days 0, 1 and 7, so days since last visit = daysSinceJoin - 7; all slipping.
  const add = (first, coachId, daysSinceJoin) => w.addMember({ first, coachId, daysSinceJoin, weeks: [2, 1, 0] })
  const p20 = add('Pat', w.coach.id, 27)
  const m15 = add('Mo', w.owner.id, 22)
  const p18 = add('Pia', w.coach.id, 25)
  const m19 = add('Max', w.owner.id, 26)
  const order = async (email) => (await call(w.app, 'GET', '/api/today', { cookie: await w.login(email) })).body.slipping.map((s) => s.id)
  assert.deepEqual(await order(w.owner.email), [m19, m15, p20, p18])
  assert.deepEqual(await order(w.coach.email), [p20, p18])
})

test('a member with 1 finished week is new; with 0 finished weeks pace is null', () => {
  const one = pattern({ weeks: [0], daysSinceJoin: 10 })
  assert.equal(one.status, 'new')
  assert.equal(one.pace, 0)
  const zero = pattern({ weeks: [], daysSinceJoin: 3, current: 2 })
  assert.equal(zero.status, 'new')
  assert.equal(zero.pace, null)
  assert.deepEqual(zero.weeks, [2])
})

test('status rules, first match wins', () => {
  assert.equal(statusOf([1, 1]), 'slipping')
  assert.equal(statusOf([4, 1, 0]), 'slipping')
  assert.equal(statusOf([1, 2]), 'below')
  assert.equal(statusOf([0, 3]), 'on')
  assert.equal(statusOf([1]), 'new')
  assert.equal(paceOf([3, 4, 3, 3]), 3.3)
  assert.equal(paceOf([2, 1]), 1.5)
})

test('several check-ins on one day count once', () => {
  const joinedOn = addDays(TODAY, -10)
  const d = addDays(joinedOn, 1)
  const p = progress({ joinedOn, checkinAts: [`${d}T13:00:00.000Z`, `${d}T18:00:00.000Z`, `${d}T23:00:00.000Z`], today: TODAY, timeZone: TZ })
  assert.deepEqual(p.weeks, [1, 0])
})

test('day index uses the gym timezone', () => {
  assert.equal(localDate('2026-11-06T03:00:00.000Z', TZ), '2026-11-05')
  assert.equal(localDate('2026-11-06T03:00:00.000Z', 'UTC'), '2026-11-06')
  const joinedOn = '2026-11-01'
  // 02:00Z on Nov 3 is the evening of Nov 2 in Chicago: day 1, not day 2.
  const p = progress({ joinedOn, checkinAts: ['2026-11-03T02:00:00.000Z'], today: TODAY, timeZone: TZ })
  assert.deepEqual([...p.visitedDays], [1])
  assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2)
})

test('day 90 drops off: off Today and the list, still in all=1; check-ins from day 90 do not count', async () => {
  const w = await makeWorld()
  const d89 = w.addMember({ first: 'Last', daysSinceJoin: 89, weeks: Array(12).fill(3) })
  const d90 = w.addMember({ first: 'Gone', daysSinceJoin: 90, weeks: Array(12).fill(3) })
  const cookie = await w.login(w.owner.email)
  const today = await call(w.app, 'GET', '/api/today', { cookie })
  assert.deepEqual(today.body.board.map((s) => s.id), [d89])
  assert.equal(today.body.kpis.newMembers, 1)
  const list = await call(w.app, 'GET', '/api/members', { cookie })
  assert.deepEqual(list.body.map((s) => s.id), [d89])
  const all = await call(w.app, 'GET', '/api/members?all=1', { cookie })
  assert.deepEqual(new Set(all.body.map((s) => s.id)), new Set([d89, d90]))
  const last = today.body.board[0]
  assert.equal(last.week, 12)
  assert.equal(last.weeks.length, 13)
  const late = pattern({ weeks: Array(12).fill(1), daysSinceJoin: 95, extra: [90, 91, 92] })
  assert.equal(late.weeks.reduce((a, b) => a + b, 0), 12)
})

test('days since last visit: null if never, else today minus the last visit', () => {
  assert.equal(pattern({ weeks: [], daysSinceJoin: 3 }).daysSinceLastVisit, null)
  const p = pattern({ weeks: [3, 2], daysSinceJoin: 16 })
  assert.equal(p.lastVisitOn, addDays(TODAY, -8)) // week 1 = days 7, 8
  assert.equal(p.daysSinceLastVisit, 8)
})

test('KPIs: newMembers, onTheLinePct over members with a finished week, slipping, nudgedThisWeek', () => {
  const s = (status, daysSinceJoin) => ({ status, daysSinceJoin, weeks: [] })
  const k = kpis([s('on', 30), s('on', 20), s('below', 40), s('slipping', 50), s('new', 3), s('new', 10)], 4)
  assert.deepEqual(k, { newMembers: 6, onTheLinePct: 40, slipping: 1, nudgedThisWeek: 4 })
  assert.deepEqual(kpis([s('new', 2)], 0), { newMembers: 1, onTheLinePct: null, slipping: 0, nudgedThisWeek: 0 })
})

test('Today KPIs through the API match the kit', async () => {
  const w = await makeWorld()
  for (const m of Object.values(KIT)) w.addMember(m)
  w.addMember({ first: 'Fresh', daysSinceJoin: 2, current: 1 })
  const r = await call(w.app, 'GET', '/api/today', { cookie: await w.login(w.owner.email) })
  assert.deepEqual(r.body.kpis, { newMembers: 5, onTheLinePct: 25, slipping: 2, nudgedThisWeek: 0 })
  assert.equal(r.body.checkinsToday.length, 0)
})

test('came back: a check-in within 7 days after the nudge', () => {
  const sent = '2026-11-01T18:00:00.000Z'
  assert.equal(cameBack(sent, ['2026-11-08T17:59:00.000Z']), true)
  assert.equal(cameBack(sent, ['2026-11-08T18:01:00.000Z']), false)
  assert.equal(cameBack(sent, ['2026-10-31T18:00:00.000Z']), false)
})

test('renderTemplate fills the four variables', () => {
  assert.equal(renderTemplate('{first}/{coach}/{gym}/{days}/{other}', { first: 'Sam', coach: 'Mike', gym: 'N', days: 6 }), 'Sam/Mike/N/6/{other}')
})
