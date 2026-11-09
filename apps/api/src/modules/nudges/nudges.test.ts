import { type LiveEvent, NudgesResponse, RecordNudgeResponse, TodayResponse } from '@tenure/contracts'
import type { Nudge } from '@tenure/db'
import { type StoredNudgeChannel, whatsappUrl } from '@tenure/domain'
import { describe, expect, expectTypeOf, test, vi } from 'vitest'
import { TEST_NOW } from '../../platform/context.ts'
import { errorBody } from '../../platform/http/errors.ts'
import { call } from '../../test/http.ts'
import { addMember, KIT } from '../../test/members.ts'
import { otherGym } from '../../test/nudges.ts'
import { openStream, readToEnd, readUntil } from '../../test/sse.ts'
import { makeWorld, type World } from '../../test/world.ts'

const DAY = 86_400_000
const ago = (ms: number) => new Date(TEST_NOW.getTime() - ms).toISOString()

const send = (w: World, cookie: string, body: unknown) => call(w.app, 'POST', '/api/nudges', { cookie, body })
const log = async (w: World, cookie: string, query = '') => {
  const r = await call(w.app, 'GET', `/api/nudges${query}`, { cookie })
  expect(r.status).toBe(200)
  return NudgesResponse.parse(r.body)
}
const stored = (w: World) => w.ctx.repos.nudges.listByGym(w.gym.id)
/** A nudge written straight through the repository, as the old tests' SQL did. */
const oldNudge = (w: World, memberId: number, userId: number, body: string, sentAt: string) =>
  w.ctx.repos.nudges.record({ gymId: w.gym.id, memberId, userId, templateId: null, body, channel: 'own-phone', sentAt })
const checkIn = (w: World, memberId: number, at: string) =>
  w.ctx.repos.members.applyImport({ gymId: w.gym.id, at: TEST_NOW.toISOString(), creates: [], updates: [], checkins: [{ memberId, at }] })
const listen = (w: World) => {
  const seen: LiveEvent[] = []
  w.ctx.bus.subscribe((e) => seen.push(e))
  return seen
}

describe('POST /api/nudges', () => {
  test('FR-NUDGE-03 POST /api/nudges records the nudge and returns smsUrl (null without a phone)', async () => {
    const w = await makeWorld()
    const hana = await addMember(w, { ...KIT.hana, phone: '+13125550042' })
    const nophone = await addMember(w, { first: 'Nophone', daysSinceJoin: 20, weeks: [1, 0], phone: null })
    const cookie = await w.login(w.owner.email)
    const seen = listen(w)
    const [first] = await w.ctx.repos.templates.list(w.gym.id)
    const body = "Hey Hana, we missed you & it's 6 pm?"
    const r = await send(w, cookie, { memberId: hana, templateId: first?.id, body, channel: 'text' })
    expect(r.status).toBe(200)
    const res = RecordNudgeResponse.strict().parse(r.body)
    expect(res.smsUrl).toBe(`sms:+13125550042?&body=${encodeURIComponent(body)}`)
    expect(res.smsUrl).toBe("sms:+13125550042?&body=Hey%20Hana%2C%20we%20missed%20you%20%26%20it's%206%20pm%3F")
    expect(res.whatsappUrl).toBe(whatsappUrl('+13125550042', body))
    expect(res.nudge).toEqual({ id: res.nudge.id, memberId: hana, templateId: first?.id, at: TEST_NOW.toISOString(), body, channel: 'text' })
    expect(seen).toEqual([{ type: 'nudge.recorded', gymId: w.gym.id, memberId: hana, coachId: w.owner.id }])
    const p = await send(w, cookie, { memberId: nophone, body: 'In person', channel: 'in-person' })
    expect(p.status).toBe(200)
    expect(RecordNudgeResponse.parse(p.body)).toMatchObject({ smsUrl: null, whatsappUrl: null })
    const empty = await send(w, cookie, { memberId: hana, body: '  ', channel: 'text' })
    expect([empty.status, empty.body]).toEqual([400, errorBody('messageBody')])
    const today = TodayResponse.parse((await call(w.app, 'GET', '/api/today', { cookie })).body)
    expect(today.kpis.nudgedThisWeek).toBe(2)
    expect(today.board.find((s) => s.id === hana)?.lastNudgeAt).toBe(TEST_NOW.toISOString())
  })

  test.each(['text', 'whatsapp', 'copy', 'in-person'] as const)(
    'FR-NUDGE-02 the contact choice %s is stored and comes back in the log',
    async (channel) => {
      const w = await makeWorld()
      const sam = await addMember(w, KIT.sam)
      const cookie = await w.login(w.owner.email)
      const r = await send(w, cookie, { memberId: sam, body: 'Hi Sam', channel })
      expect(RecordNudgeResponse.parse(r.body).nudge.channel).toBe(channel)
      expect((await stored(w)).map((n) => n.channel)).toEqual([channel])
      expect((await log(w, cookie)).map((n) => n.channel)).toEqual([channel])
    },
  )

  test("FR-NUDGE-02 a channel that isn't a contact choice is 400 generic, and nothing is recorded", async () => {
    const w = await makeWorld()
    const sam = await addMember(w, KIT.sam)
    const cookie = await w.login(w.owner.email)
    for (const channel of ['fax', 'own-phone', undefined]) {
      const r = await send(w, cookie, { memberId: sam, body: 'Hi', channel })
      expect([r.status, r.body]).toEqual([400, errorBody('generic')])
    }
    expect(await stored(w)).toEqual([])
  })

  test('FR-NUDGE-03 the links and the record carry the trimmed message', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { ...KIT.sam, phone: '+447700900123' })
    const r = await send(w, await w.login(w.owner.email), { memberId: sam, body: '  Hi Sam\n', channel: 'whatsapp' })
    expect(RecordNudgeResponse.parse(r.body)).toMatchObject({
      nudge: { body: 'Hi Sam' },
      smsUrl: 'sms:+447700900123?&body=Hi%20Sam',
      whatsappUrl: 'https://wa.me/447700900123?text=Hi%20Sam',
    })
    expect((await stored(w)).map((n) => n.body)).toEqual(['Hi Sam'])
  })

  test('FR-NUDGE-05 Tenure records the nudge and sends nothing itself', async () => {
    const w = await makeWorld()
    const sms = vi.spyOn(w.ctx.adapters.sms, 'send')
    const email = vi.spyOn(w.ctx.adapters.email, 'send')
    const sam = await addMember(w, KIT.sam)
    expect((await send(w, await w.login(w.owner.email), { memberId: sam, body: 'Hi', channel: 'text' })).status).toBe(200)
    expect(sms).not.toHaveBeenCalled()
    expect(email).not.toHaveBeenCalled()
  })

  test('FR-NUDGE-08 a malformed member id is 404 notFound', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    for (const memberId of ['12', 0, -1, 1.5, undefined]) {
      const r = await send(w, cookie, { memberId, body: 'Hi', channel: 'text' })
      expect([r.status, r.body]).toEqual([404, errorBody('notFound')])
    }
  })

  test("FR-PRIV-02 another gym's member is 404 memberNotFound, and nothing is recorded or published", async () => {
    const w = await makeWorld()
    const other = await otherGym(w)
    const seen = listen(w)
    const r = await send(w, await w.login(w.owner.email), { memberId: other.member.id, body: 'Hi', channel: 'text' })
    expect([r.status, r.body]).toEqual([404, errorBody('memberNotFound')])
    expect(await w.ctx.repos.nudges.listByGym(other.gym.id)).toEqual([])
    expect(seen).toEqual([])
  })

  test("FR-STAFF-07 a coach gets 404 nudging another coach's member, and nothing is recorded", async () => {
    const w = await makeWorld()
    const theirs = await addMember(w, { ...KIT.sam, coachId: w.coach2.id })
    const mine = await addMember(w, { ...KIT.hana, coachId: w.coach.id })
    const cookie = await w.login(w.coach.email)
    const r = await send(w, cookie, { memberId: theirs, body: 'hi', channel: 'text' })
    expect([r.status, r.body]).toEqual([404, errorBody('memberNotFound')])
    expect(await stored(w)).toEqual([])
    expect((await send(w, cookie, { memberId: mine, body: 'hi', channel: 'text' })).status).toBe(200)
  })

  test("FR-STAFF-07 the body is read before the member: a blank body for another coach's member is 400", async () => {
    const w = await makeWorld()
    const theirs = await addMember(w, { ...KIT.sam, coachId: w.coach2.id })
    const r = await send(w, await w.login(w.coach.email), { memberId: theirs, body: ' ', channel: 'text' })
    expect([r.status, r.body]).toEqual([400, errorBody('messageBody')])
  })

  test("FR-NUDGE-08 a template that isn't the gym's is 404 templateNotFound; the gym's own is stored", async () => {
    const w = await makeWorld()
    const other = await otherGym(w)
    const sam = await addMember(w, KIT.sam)
    const cookie = await w.login(w.owner.email)
    const seen = listen(w)
    for (const templateId of [other.template.id, 9999, 'abc', -1]) {
      const r = await send(w, cookie, { memberId: sam, templateId, body: 'Hi', channel: 'text' })
      expect([r.status, r.body]).toEqual([404, errorBody('templateNotFound')])
    }
    expect(await stored(w)).toEqual([])
    expect(seen).toEqual([])
    const [own] = await w.ctx.repos.templates.list(w.gym.id)
    expect((await send(w, cookie, { memberId: sam, templateId: own?.id, body: 'Hi', channel: 'text' })).status).toBe(200)
    expect((await stored(w)).map((n) => n.templateId)).toEqual([own?.id])
  })

  test("FR-LIVE-02 the member's coach and the owners hear the nudge; another coach doesn't", async () => {
    const w = await makeWorld()
    const mine = await addMember(w, { ...KIT.hana, coachId: w.coach.id })
    const priya = await w.login(w.coach.email)
    const owner = await openStream(w.app, await w.login(w.owner.email))
    const coach = await openStream(w.app, priya)
    const other = await openStream(w.app, await w.login(w.coach2.email))
    expect((await send(w, priya, { memberId: mine, body: 'Hi', channel: 'copy' })).status).toBe(200)
    const event = `"type":"nudge.recorded","gymId":${w.gym.id},"memberId":${mine},"coachId":${w.coach.id}`
    expect(await readUntil(owner, (t) => t.includes('nudge.recorded'))).toContain(event)
    expect(await readUntil(coach, (t) => t.includes('nudge.recorded'))).toContain(event)
    expect((await readToEnd(other, 300)).text).not.toContain('nudge.recorded')
    await owner.cancel()
    await coach.cancel()
  })

  test('NFR-SEC-04 signed out, the nudges are 401', async () => {
    const w = await makeWorld()
    for (const [method, body] of [['GET', undefined], ['POST', { memberId: 1, body: 'Hi', channel: 'text' }]] as const) {
      const r = await call(w.app, method, '/api/nudges', { body })
      expect([r.status, r.body]).toEqual([401, errorBody('signIn')])
    }
  })
})

describe('GET /api/nudges', () => {
  test('FR-NUDGE-07 came back is true when a check-in follows within 7 days', async () => {
    const w = await makeWorld()
    const hana = await addMember(w, { ...KIT.hana, coachId: w.coach.id })
    const sam = await addMember(w, { ...KIT.sam, coachId: w.coach.id })
    await oldNudge(w, hana, w.coach.id, 'Hana nudge', ago(10 * DAY))
    await oldNudge(w, sam, w.coach.id, 'Sam nudge', ago(12 * DAY)) // day 12; Sam's next visit is day 21
    await oldNudge(w, sam, w.owner.id, 'Owner nudge', ago(2 * DAY))
    await checkIn(w, hana, ago(5 * DAY)) // 5 days after Hana's nudge
    await checkIn(w, sam, ago(1 * DAY)) // 1 day after the owner's nudge
    const coach = await log(w, await w.login(w.coach.email), '?days=30')
    expect(coach.map((n) => [n.memberName, n.by, n.outcome]).sort()).toEqual([
      ['Hana L.', 'Priya S.', 'cameBack'],
      ['Sam O.', 'Priya S.', 'noVisit'],
    ])
    const ownerCookie = await w.login(w.owner.email)
    const all = await log(w, ownerCookie)
    expect(all).toHaveLength(3)
    expect(all[0]).toEqual({
      id: all[0]?.id,
      at: ago(2 * DAY),
      memberId: sam,
      memberName: 'Sam O.',
      by: 'Mike R.',
      body: 'Owner nudge',
      channel: null, // recorded before the first version
      outcome: 'cameBack',
    })
    expect(await log(w, ownerCookie, '?days=5')).toHaveLength(1)
  })

  test('FR-NUDGE-06 nudge history: a coach no longer sees nudges to a member who moved to another coach', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, { ...KIT.sam, coachId: w.coach.id })
    const cookie = await w.login(w.coach.email)
    expect((await send(w, cookie, { memberId: sam, body: 'Hi Sam', channel: 'text' })).status).toBe(200)
    expect(await log(w, cookie)).toHaveLength(1)
    await w.ctx.repos.members.update({ gymId: w.gym.id }, sam, { coachId: w.coach2.id })
    expect(await log(w, cookie)).toHaveLength(0)
    expect(await log(w, await w.login(w.coach2.email))).toHaveLength(0)
    expect(await log(w, await w.login(w.owner.email))).toHaveLength(1)
  })

  test("FR-NUDGE-06 each row: the member's id and plain name, the message, when, who sent it, the channel, newest first", async () => {
    const w = await makeWorld()
    const leo = await addMember(w, { first: 'Leo', last: null, daysSinceJoin: 20 })
    const cookie = await w.login(w.owner.email)
    await oldNudge(w, leo, w.coach.id, 'Before', ago(3 * DAY))
    expect((await send(w, cookie, { memberId: leo, body: 'After', channel: 'whatsapp' })).status).toBe(200)
    expect((await log(w, cookie)).map(({ memberId, memberName, body, at, by, channel }) => ({ memberId, memberName, body, at, by, channel }))).toEqual([
      { memberId: leo, memberName: 'Leo', body: 'After', at: TEST_NOW.toISOString(), by: 'Mike R.', channel: 'whatsapp' },
      { memberId: leo, memberName: 'Leo', body: 'Before', at: ago(3 * DAY), by: 'Priya S.', channel: null },
    ])
  })

  test("FR-NUDGE-06 the outcome is decided at the server's clock: waiting under 7 days, then no visit", async () => {
    const w = await makeWorld()
    // Members with no visits but the ones written here.
    const [a, b, c] = [
      await addMember(w, { first: 'Ann', daysSinceJoin: 20 }),
      await addMember(w, { first: 'Bea', daysSinceJoin: 20 }),
      await addMember(w, { first: 'Cal', daysSinceJoin: 20 }),
    ]
    const HOUR = 3_600_000
    await oldNudge(w, a, w.owner.id, 'almost a week', ago(7 * DAY - HOUR))
    await oldNudge(w, b, w.owner.id, 'a week', ago(7 * DAY))
    await oldNudge(w, c, w.owner.id, 'back on the dot', ago(8 * DAY))
    await checkIn(w, c, ago(DAY)) // exactly 7 days after
    const byBody = new Map((await log(w, await w.login(w.owner.email))).map((n) => [n.body, n.outcome]))
    expect(Object.fromEntries(byBody)).toEqual({ 'almost a week': 'waiting', 'a week': 'noVisit', 'back on the dot': 'cameBack' })
  })

  test('FR-NUDGE-06 the log is the last 30 days; ?days is rounded and held to 1 to 365', async () => {
    const w = await makeWorld()
    const sam = await addMember(w, KIT.sam)
    for (const days of [0.5, 2, 29, 31, 364, 400]) await oldNudge(w, sam, w.owner.id, `${days}`, ago(days * DAY))
    const cookie = await w.login(w.owner.email)
    const bodies = async (query: string) => (await log(w, cookie, query)).map((n) => n.body)
    expect(await bodies('')).toEqual(['0.5', '2', '29'])
    expect(await bodies('?days=abc')).toEqual(['0.5', '2', '29'])
    expect(await bodies('?days=0')).toEqual(['0.5'])
    expect(await bodies('?days=1000')).toEqual(['0.5', '2', '29', '31', '364'])
  })

  test('FR-NUDGE-02 the stored channel types agree: db holds what domain names', () => {
    expectTypeOf<Nudge['channel']>().toEqualTypeOf<StoredNudgeChannel>()
  })
})
