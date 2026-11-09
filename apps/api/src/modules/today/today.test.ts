import { TodayResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { expect, test } from 'vitest'
import { call } from '../../test/http.ts'
import { addMember, KIT } from '../../test/members.ts'
import { makeWorld, type World } from '../../test/world.ts'

const getToday = async (w: World, email: string) => {
  const r = await call(w.app, 'GET', '/api/today', { cookie: await w.login(email) })
  expect(r.status).toBe(200)
  return TodayResponse.strict().parse(r.body)
}
const addKit = async (w: World) => ({
  maya: await addMember(w, KIT.maya),
  chris: await addMember(w, KIT.chris),
  hana: await addMember(w, KIT.hana),
  sam: await addMember(w, KIT.sam),
})

test('kit samples through the API: statuses, slipping order and the board order', async () => {
  const w = await makeWorld()
  const ids = await addKit(w)
  const body = await getToday(w, w.owner.email)
  const byId = new Map(body.board.map((s) => [s.id, s]))
  expect(byId.get(ids.maya)?.status).toBe('on')
  expect(byId.get(ids.chris)?.status).toBe('below')
  expect(byId.get(ids.hana)?.status).toBe('slipping')
  expect(byId.get(ids.sam)?.status).toBe('slipping')
  expect(byId.get(ids.sam)?.name).toBe('Sam O.')
  expect(byId.get(ids.maya)?.pace).toBe(3.3)
  // Slipping first (most days since last visit first), then joinedOn desc.
  const since = (id: number) => byId.get(id)?.daysSinceLastVisit ?? 0
  expect(body.slipping.map((s) => s.id)).toEqual([ids.hana, ids.sam].sort((a, b) => since(b) - since(a)))
  expect(body.board.slice(2).map((s) => s.id)).toEqual([ids.maya, ids.chris])
  expect(new Set(body.board.slice(0, 2).map((s) => s.id))).toEqual(new Set([ids.hana, ids.sam]))
})

test("SLIPPING NOW: the viewer's own members first, each group most days since last visit first", async () => {
  const w = await makeWorld()
  // weeks [2, 1, 0]: visits on days 0, 1 and 7, so days since last visit = daysSinceJoin - 7; all slipping.
  const add = (first: string, coachId: number, daysSinceJoin: number) =>
    addMember(w, { first, coachId, daysSinceJoin, weeks: [2, 1, 0] })
  const p20 = await add('Pat', w.coach.id, 27)
  const m15 = await add('Mo', w.owner.id, 22)
  const p18 = await add('Pia', w.coach.id, 25)
  const m19 = await add('Max', w.owner.id, 26)
  const order = async (email: string) => (await getToday(w, email)).slipping.map((s) => s.id)
  expect(await order(w.owner.email)).toEqual([m19, m15, p20, p18])
  expect(await order(w.coach.email)).toEqual([p20, p18])
})

test('day 90 drops off Today; day 89 is still on it, in week 12 with 13 weeks', async () => {
  const w = await makeWorld()
  const d89 = await addMember(w, { first: 'Last', daysSinceJoin: 89, weeks: Array<number>(12).fill(3) })
  await addMember(w, { first: 'Gone', daysSinceJoin: 90, weeks: Array<number>(12).fill(3) })
  const body = await getToday(w, w.owner.email)
  expect(body.board.map((s) => s.id)).toEqual([d89])
  expect(body.kpis.newMembers).toBe(1)
  const last = body.board[0]
  expect(last?.week).toBe(12)
  expect(last?.weeks).toHaveLength(13)
})

test('Today KPIs through the API match the kit', async () => {
  const w = await makeWorld()
  await addKit(w)
  await addMember(w, { first: 'Fresh', daysSinceJoin: 2, current: 1 })
  const body = await getToday(w, w.owner.email)
  expect(body.kpis).toEqual({ newMembers: 5, onTheLinePct: 25, slipping: 2, nudgedThisWeek: 0 })
  expect(body.checkinsToday).toHaveLength(0)
})

test('401 signIn when signed out', async () => {
  const w = await makeWorld()
  const r = await call(w.app, 'GET', '/api/today')
  expect([r.status, r.body]).toEqual([401, { error: { code: 'signIn', message: t('api.signIn') } }])
})

test("a coach sees only their own members, today's check-ins of them and the nudges they sent; the owner sees the gym", async () => {
  const w = await makeWorld()
  const { repos } = w.ctx
  const mine = await addMember(w, { first: 'Pat', last: 'Kim', coachId: w.coach.id, daysSinceJoin: 20, weeks: [1, 1] })
  const theirs = await addMember(w, { first: 'Jo', last: 'Ray', coachId: w.coach2.id, daysSinceJoin: 20, weeks: [1, 1] })
  const owners = await addMember(w, { first: 'Max', coachId: w.owner.id, daysSinceJoin: 3 })
  // Now is 2026-11-06 12:00 in Chicago; 36 hours back is 2026-11-05 00:00.
  const checkins = [
    { memberId: mine, at: '2026-11-06T05:30:00.000Z' }, // 2026-11-05 23:30 local: yesterday
    { memberId: mine, at: '2026-11-06T06:30:00.000Z' }, // 00:30 local
    { memberId: theirs, at: '2026-11-06T15:00:00.000Z' }, // 09:00 local
    { memberId: mine, at: '2026-11-06T17:00:00.000Z' }, // 11:00 local
  ]
  await repos.members.applyImport({ gymId: w.gym.id, at: w.ctx.clock().toISOString(), creates: [], updates: [], checkins })
  const nudge = (memberId: number, userId: number, sentAt: string) =>
    repos.nudges.record({ gymId: w.gym.id, memberId, userId, templateId: null, body: 'Hi', sentAt })
  await nudge(mine, w.coach.id, '2026-11-03T18:00:00.000Z')
  await nudge(theirs, w.coach.id, '2026-11-04T18:00:00.000Z') // sent by Priya to Jordan's member: still Priya's count
  await nudge(mine, w.owner.id, '2026-11-05T18:00:00.000Z')
  await nudge(mine, w.coach.id, '2026-10-30T17:59:00.000Z') // a minute over 7 days ago

  const coach = await getToday(w, w.coach.email)
  expect(coach.board.map((s) => s.id)).toEqual([mine])
  expect(coach.slipping.map((s) => s.id)).toEqual([mine])
  expect(coach.checkinsToday).toEqual([
    { memberId: mine, name: 'Pat K.', at: '2026-11-06T17:00:00.000Z' },
    { memberId: mine, name: 'Pat K.', at: '2026-11-06T06:30:00.000Z' },
  ])
  expect(coach.kpis).toEqual({ newMembers: 1, onTheLinePct: 0, slipping: 1, nudgedThisWeek: 2 })

  const owner = await getToday(w, w.owner.email)
  expect(new Set(owner.board.map((s) => s.id))).toEqual(new Set([mine, theirs, owners]))
  expect(owner.checkinsToday.map((c) => [c.memberId, c.at])).toEqual([
    [mine, '2026-11-06T17:00:00.000Z'],
    [theirs, '2026-11-06T15:00:00.000Z'],
    [mine, '2026-11-06T06:30:00.000Z'],
  ])
  expect(owner.kpis).toEqual({ newMembers: 3, onTheLinePct: 0, slipping: 2, nudgedThisWeek: 3 })
})

test('hasMembers: true for a scope with members past day 90 and no one on the board; false for an empty scope', async () => {
  const w = await makeWorld()
  const has = async (email: string) => {
    const body = await getToday(w, email)
    return [body.board.length, body.hasMembers]
  }
  expect(await has(w.owner.email)).toEqual([0, false])
  expect(await has(w.coach.email)).toEqual([0, false])
  // One of Priya's members, long past the first 90 days: off the board, but the gym and Priya have a member.
  await addMember(w, { first: 'Old', coachId: w.coach.id, daysSinceJoin: 200 })
  expect(await has(w.owner.email)).toEqual([0, true])
  expect(await has(w.coach.email)).toEqual([0, true])
  // Jordan still has none of his own.
  expect(await has(w.coach2.email)).toEqual([0, false])
  // A member on the board answers it too.
  await addMember(w, { first: 'New', coachId: w.coach2.id, daysSinceJoin: 3 })
  expect(await has(w.coach2.email)).toEqual([1, true])
})
