import { asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { checkins, gyms, invites, members, nudges, sessions, templates, users } from '../schema/index.ts'
import { buildNorthside, DEMO_PASSWORD, oracle, resetNorthside, seedNorthside, summarizeNorthside } from './index.ts'

const TODAY = '2026-11-06'
const TZ = 'America/Chicago'
const NOW = new Date('2026-11-06T18:00:00.000Z')
// The domain's DEFAULT_TEMPLATES, copied: db may not import domain. The API's agreement test keeps the two in step.
const TEMPLATES = [
  { name: 'We missed you', body: "Hey {first}, we missed you this week. Want me to save you a spot in Thursday's 6 pm class? - Coach {coach}" },
  { name: 'First weeks', body: "Hi {first}, it's {coach} from {gym}. How are your first few weeks going? Tell me if I can help with anything." },
  { name: 'One visit', body: "Hi {first}, it's been {days} days since we saw you. One visit this week is a good restart. Want me to save you a spot? - {coach}" },
]
const build = (today = TODAY) => buildNorthside({ today, timezone: TZ, templates: TEMPLATES })

const wall = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' })
const localWall = (at: string) => `${oracle.localDate(at, TZ)} ${wall.format(new Date(at))}`
const shiftWall = (at: string, days: number) => {
  const [d, hm] = localWall(at).split(' ')
  return `${oracle.addDays(d!, days)} ${hm}`
}

describe('buildNorthside', () => {
  test('has the old seed counts for 2026-11-06', () => {
    const d = build()
    const res = [...oracle.analyze(d, TODAY).values()]
    expect(d.members).toHaveLength(85)
    expect(res.filter((x) => x.inWindow)).toHaveLength(60)
    expect(res.filter((x) => x.daysSinceJoin >= 90 && x.daysSinceJoin <= 150)).toHaveLength(25)
    expect(d.users.map((u) => [u.key, u.role])).toEqual([['mike', 'owner'], ['priya', 'coach'], ['jordan', 'coach']])
    expect(d.templates).toEqual(TEMPLATES.map((t, i) => ({ ...t, sort: i })))
    expect(d.nudges).toHaveLength(20)
    expect(d.checkins).toHaveLength(1920)
    expect(d.gym).toEqual({ name: 'Northside Strength', slug: 'northside', timezone: TZ, country: 'US', isDemo: true, pilotStartedOn: '2026-10-14' })
  })

  test('the same day gives identical data', () => {
    expect(build()).toStrictEqual(build())
  })

  test('a later day shifts every date and keeps everything else', () => {
    const a = build(), b = build('2026-11-13')
    expect(b.gym.pilotStartedOn).toBe(oracle.addDays(a.gym.pilotStartedOn, 7))
    expect(b.members).toEqual(a.members.map((m) => ({ ...m, joinedOn: oracle.addDays(m.joinedOn, 7) })))
    expect(b.checkins.map((c) => [c.memberKey, localWall(c.at)])).toEqual(a.checkins.map((c) => [c.memberKey, shiftWall(c.at, 7)]))
    expect(b.nudges.map((n) => ({ ...n, sentAt: localWall(n.sentAt) }))).toEqual(
      a.nudges.map((n) => ({ ...n, sentAt: shiftWall(n.sentAt, 7) })),
    )
    expect(b.checkins.some((c, i) => c.at !== a.checkins[i]!.at)).toBe(true)
  })
})

describe('buildNorthside: the country and the channels', () => {
  test('FR-GLOBAL-05 the gym takes the country it is given, and the +1 sample phones stay', () => {
    const us = build(), pk = buildNorthside({ today: TODAY, timezone: TZ, country: 'PK', templates: TEMPLATES })
    expect(us.gym.country).toBe('US')
    expect(pk.gym.country).toBe('PK')
    expect(pk).toStrictEqual({ ...us, gym: { ...us.gym, country: 'PK' } })
  })

  test('FR-NUDGE-06 the nudges carry the four channels, mostly texts, never own-phone, in send order', () => {
    const d = build()
    const counts = Object.fromEntries(['text', 'whatsapp', 'copy', 'in-person'].map((c) => [c, d.nudges.filter((n) => n.channel === c).length]))
    expect(counts).toEqual({ text: 10, whatsapp: 4, copy: 4, 'in-person': 2 })
    expect(d.nudges.map((n) => n.channel).slice(0, 10)).toEqual(['text', 'whatsapp', 'text', 'copy', 'text', 'in-person', 'whatsapp', 'text', 'copy', 'text'])
    expect(build('2026-11-13').nudges.map((n) => n.channel)).toEqual(d.nudges.map((n) => n.channel))
  })
})

// Ported from legacy/app/server/seed/test/northside.test.mjs.
describe('buildNorthside: the old seed checks', () => {
  const TODAYS = ['2026-11-06', '2026-11-02', '2027-03-15']
  const KIT = { 'Maya R.': 'on', 'Jo W.': 'on', 'Dev P.': 'on', 'Chris L.': 'below', 'Hana L.': 'slipping', 'Sam O.': 'slipping' }
  const KIT_WEEKS: Record<string, number[]> = {
    'Maya R.': [3, 4, 3, 3, 4, 3, 3, 4, 3, 2], 'Jo W.': [3, 3, 2, 3, 3, 4, 3, 3, 3, 2, 3, 3, 1],
    'Dev P.': [2, 3, 3, 4, 3, 3, 2], 'Chris L.': [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2, 1],
    'Hana L.': [3, 2, 2, 1, 1, 0, 0], 'Sam O.': [2, 1, 0, 0],
  }
  const nm = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`

  for (const today of TODAYS) {
    test(`FR-OPS-03 the rules hold for ${today}`, () => {
      const d = build(today)
      const all = [...oracle.analyze(d, today).values()]
      const win = all.filter((x) => x.inWindow)
      expect(win).toHaveLength(60)
      expect(all.filter((x) => x.daysSinceJoin >= 90 && x.daysSinceJoin <= 150)).toHaveLength(25)
      const slipping = win.filter((x) => x.status === 'slipping')
      expect(slipping.length).toBeGreaterThanOrEqual(10)
      expect(slipping.length).toBeLessThanOrEqual(14)
      for (const u of d.users) expect(slipping.filter((x) => x.member.coachKey === u.key).length, u.key).toBeGreaterThanOrEqual(2)
      for (const [n, st] of Object.entries(KIT)) {
        const x = all.find((r) => nm(r.member) === n)
        expect(x?.status, n).toBe(st)
        expect(x?.weeks, n).toEqual(KIT_WEEKS[n])
        if (n === 'Hana L.' || n === 'Sam O.') expect(x?.member.coachKey, n).toBe('mike')
      }
      expect(d.gym.pilotStartedOn).toBe(oracle.addDays(today, -23))
    })

    test(`FR-OPS-03 the check-ins are valid for ${today}`, () => {
      const d = build(today)
      const tz = d.gym.timezone, now = oracle.zonedToUtcISO(today, 12, 0, tz)
      const join = new Map(d.members.map((m) => [m.key, m.joinedOn]))
      const hour = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' })
      const seen = new Set<string>()
      for (const c of d.checkins) {
        const ld = oracle.localDate(c.at, tz)
        expect(ld >= join.get(c.memberKey)!, 'before join').toBe(true)
        expect(c.at <= now, 'in the future').toBe(true)
        const k = `${c.memberKey}|${ld}`
        expect(seen.has(k), 'two check-ins one day').toBe(false)
        seen.add(k)
        const h = +hour.format(new Date(c.at))
        if (ld === today) expect(h >= 5 && h <= 6, `today's check-ins end by 07:00 (FR-KIOSK-03), hour ${h}`).toBe(true)
        else expect((h >= 6 && h <= 8) || h === 12 || (h >= 17 && h <= 19), `hour ${h}`).toBe(true)
      }
    })

    test(`FR-OPS-03 the nudges are valid for ${today}`, () => {
      const d = build(today)
      const tz = d.gym.timezone
      expect(d.nudges.length).toBeGreaterThanOrEqual(18)
      expect(d.nudges.length).toBeLessThanOrEqual(22)
      const byKey = new Map(d.members.map((m) => [m.key, m]))
      let back = 0
      for (const n of d.nudges) {
        const m = byKey.get(n.memberKey)!
        expect(n.userKey).toBe(m.coachKey)
        expect(n.body).not.toMatch(/[{}]/)
        const sentDay = oracle.localDate(n.sentAt, tz)
        expect(oracle.diffDays(today, sentDay)).toBeGreaterThanOrEqual(1)
        expect(oracle.diffDays(today, sentDay)).toBeLessThanOrEqual(42)
        const res = oracle.analyze({ ...d, checkins: d.checkins.filter((c) => oracle.localDate(c.at, tz) < sentDay) }, sentDay).get(n.memberKey)
        expect(['below', 'slipping'], `${nm(m)} was ${res?.status}`).toContain(res?.status)
        const end = new Date(new Date(n.sentAt).getTime() + 7 * 86400000).toISOString()
        if (d.checkins.some((c) => c.memberKey === n.memberKey && c.at > n.sentAt && c.at <= end)) back++
      }
      expect(back, `came back ${back}`).toBeGreaterThanOrEqual(5)
    })
  }

  test('FR-GLOBAL-05 the phones are unique and in the 555-01xx range, and the emails are well formed', () => {
    const d = build()
    const phones = d.members.map((m) => m.phone)
    expect(new Set(phones).size).toBe(phones.length)
    for (const p of phones) expect(p).toMatch(/^\+13125550(1\d\d)$/)
    for (const m of d.members) expect(['', `${m.firstName.toLowerCase()}.${m.lastName[0]!.toLowerCase()}@example.com`]).toContain(m.email)
    expect(new Set(d.members.map((m) => m.externalId)).size).toBe(d.members.length)
  })

  test('FR-WEB-04 the three demo users, three templates and a demo password of at least 12 characters', () => {
    const d = build()
    expect(d.users.map((u) => u.email)).toEqual(['mike@northside.test', 'priya@northside.test', 'jordan@northside.test'])
    expect(d.templates).toHaveLength(3)
    expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(12)
    expect(d.gym.isDemo).toBe(true)
  })

  test('FR-REPORT-01 about 65% of the nudges past their 7 days came back, by the domain\'s cameBack rule', () => {
    const d = build()
    const WEEK = 7 * 86_400_000
    const endOfToday = Date.parse(oracle.zonedToUtcISO(oracle.addDays(TODAY, 1), 0, 0, TZ))
    const past = d.nudges.filter((n) => Date.parse(n.sentAt) + WEEK <= endOfToday)
    const cameBack = past.filter((n) =>
      d.checkins.some((c) => c.memberKey === n.memberKey && c.at > n.sentAt && Date.parse(c.at) <= Date.parse(n.sentAt) + WEEK),
    )
    expect(past).toHaveLength(12)
    expect(cameBack.length / past.length).toBeGreaterThanOrEqual(0.6)
    expect(cameBack.length / past.length).toBeLessThanOrEqual(0.7)
  })
})

describe('summarizeNorthside', () => {
  test('matches what the old check script printed for 2026-11-06', () => {
    const s = summarizeNorthside(build(), TODAY)
    expect(s.byCoach).toEqual({
      mike: { on: 7, below: 6, slipping: 5, new: 2 },
      priya: { on: 11, below: 4, slipping: 4, new: 3 },
      jordan: { on: 7, below: 5, slipping: 3, new: 3 },
    })
    expect(s.kpis).toEqual({ newMembers: 60, onTheLinePct: 46, slipping: 12, nudgedThisWeek: 8 })
    expect(s.lines.join('\n')).toBe(`Northside seed for 2026-11-06: 85 members, 1920 check-ins, 20 nudges
in window: 60, older: 25

Status by coach (first 90 days):
  mike    on=7 below=6 slipping=5 new=2
  priya   on=11 below=4 slipping=4 new=3
  jordan  on=7 below=5 slipping=3 new=3

KPIs: {"newMembers":60,"onTheLinePct":46,"slipping":12,"nudgedThisWeek":8}

Kit members:
  Maya R.   on        pace=3.3 weeks=[3,4,3,3,4,3,3,4,3,2] coach=jordan
  Jo W.     on        pace=2.7 weeks=[3,3,2,3,3,4,3,3,3,2,3,3,1] coach=priya
  Dev P.    on        pace=3.3 weeks=[2,3,3,4,3,3,2] coach=mike
  Chris L.  below     pace=1.7 weeks=[3,3,3,2,2,3,2,2,2,1,2,1] coach=jordan
  Hana L.   slipping  pace=0.7 weeks=[3,2,2,1,1,0,0] coach=mike
  Sam O.    slipping  pace=1 weeks=[2,1,0,0] coach=mike`)
  })

  test('the six kit members have their kit statuses', () => {
    expect(summarizeNorthside(build(), TODAY).kit.map((k) => [k.name, k.status, k.coachKey])).toEqual([
      ['Maya R.', 'on', 'jordan'],
      ['Jo W.', 'on', 'priya'],
      ['Dev P.', 'on', 'mike'],
      ['Chris L.', 'below', 'jordan'],
      ['Hana L.', 'slipping', 'mike'],
      ['Sam O.', 'slipping', 'mike'],
    ])
  })
})

describe('seedNorthside', () => {
  let db: Db
  let close: () => void
  const hashPassword = vi.fn((p: string) => Promise.resolve(`hashed(${p})`))
  const newToken = vi.fn(() => 'kiosk-token-1')
  const seed = () => seedNorthside(db, { timezone: TZ, now: NOW, today: TODAY, hashPassword, newToken, templates: TEMPLATES })
  const T = NOW.toISOString()
  const rows = () => ({
    gyms: db.select().from(gyms).orderBy(asc(gyms.id)).all(),
    users: db.select().from(users).orderBy(asc(users.id)).all(),
    templates: db.select().from(templates).orderBy(asc(templates.id)).all(),
    members: db.select().from(members).orderBy(asc(members.id)).all(),
    checkins: db.select().from(checkins).orderBy(asc(checkins.id)).all(),
    nudges: db.select().from(nudges).orderBy(asc(nudges.id)).all(),
  })

  beforeEach(() => {
    ;({ db, close } = createDb(':memory:'))
    hashPassword.mockClear()
    newToken.mockClear()
  })
  afterEach(() => close())

  test('writes every row with the fixed values', async () => {
    const out = await seed()
    const d = build()
    expect(out.data).toStrictEqual(d)
    expect(hashPassword.mock.calls).toEqual([[DEMO_PASSWORD], [DEMO_PASSWORD], [DEMO_PASSWORD]])
    expect(newToken).toHaveBeenCalledTimes(1)
    expect(out.kioskToken).toBe('kiosk-token-1')

    const r = rows()
    expect(r.gyms).toEqual([
      { id: out.gymId, name: 'Northside Strength', slug: 'northside', timezone: TZ, country: 'US', isDemo: true, pilotStartedOn: '2026-10-14', plan: 'pilot', kioskToken: 'kiosk-token-1', createdAt: T },
    ])
    const userId = new Map(out.users.map((u) => [u.key, u.id]))
    expect(out.users.map(({ id, ...u }) => [id, u])).toEqual(r.users.map((u, i) => [u.id, { key: d.users[i]!.key, email: u.email, name: u.name, role: u.role }]))
    expect(r.users).toEqual(
      d.users.map((u) => ({ id: userId.get(u.key), gymId: out.gymId, email: u.email, name: u.name, role: u.role, passwordHash: `hashed(${DEMO_PASSWORD})`, active: true, createdAt: T })),
    )
    expect(r.templates).toEqual(TEMPLATES.map((t, i) => ({ id: expect.any(Number), gymId: out.gymId, ...t, sort: i, updatedAt: T })))
    expect(out.ids.size).toBe(85)
    expect(r.members).toEqual(
      d.members.map((m) => ({
        id: out.ids.get(m.key), gymId: out.gymId, firstName: m.firstName, lastName: m.lastName, phone: m.phone, email: m.email || null,
        joinedOn: m.joinedOn, coachId: userId.get(m.coachKey), externalId: m.externalId, source: 'seed', createdAt: T, archivedAt: null,
      })),
    )
    expect(r.members.filter((m) => m.email === null)).toHaveLength(d.members.filter((m) => m.email === '').length)
    expect(r.checkins).toEqual(
      d.checkins.map((c) => ({ id: expect.any(Number), gymId: out.gymId, memberId: out.ids.get(c.memberKey), at: c.at, source: 'seed' })),
    )
    expect(r.nudges).toEqual(
      d.nudges.map((n) => ({
        id: expect.any(Number), gymId: out.gymId, memberId: out.ids.get(n.memberKey), userId: userId.get(n.userKey), templateId: r.templates[n.templateIndex]!.id,
        body: n.body, channel: n.channel, sentAt: n.sentAt,
      })),
    )
  })

  test('FR-GLOBAL-05 writes the country it is given, with the same people and phones', async () => {
    const out = await seedNorthside(db, { timezone: TZ, country: 'GB', now: NOW, today: TODAY, hashPassword, newToken, templates: TEMPLATES })
    expect(rows().gyms.map((g) => g.country)).toEqual(['GB'])
    expect(out.data.members).toStrictEqual(build().members)
  })

  test('a second call into a seeded database fails and writes nothing', async () => {
    await seed()
    const before = rows()
    await expect(seed()).rejects.toThrow()
    expect(rows()).toEqual(before)
  })
})

describe('resetNorthside', () => {
  const hashPassword = (p: string) => `hashed(${p})`
  const options = { timezone: TZ, now: NOW, today: TODAY, hashPassword, templates: TEMPLATES }
  const opened: (() => void)[] = []
  const open = () => {
    const { db, close } = createDb(':memory:')
    opened.push(close)
    return db
  }
  afterEach(() => {
    for (const close of opened.splice(0)) close()
  })

  /** The gym's rows with every id swapped for its row's place, so two databases seeded alike compare equal. */
  function snapshot(db: Db, gymId: number) {
    const userRows = db.select().from(users).where(eq(users.gymId, gymId)).orderBy(asc(users.id)).all()
    const templateRows = db.select().from(templates).where(eq(templates.gymId, gymId)).orderBy(asc(templates.id)).all()
    const memberRows = db.select().from(members).where(eq(members.gymId, gymId)).orderBy(asc(members.id)).all()
    const place = (rows: readonly { id: number }[]) => (id: number | null) => (id === null ? null : rows.findIndex((r) => r.id === id))
    const [user, template, member] = [place(userRows), place(templateRows), place(memberRows)]
    /** A row without its own id and gym id. */
    const bare = (row: object) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id' && k !== 'gymId'))
    return {
      gym: bare(db.select().from(gyms).where(eq(gyms.id, gymId)).get()!),
      users: userRows.map(bare),
      templates: templateRows.map(bare),
      members: memberRows.map((m) => ({ ...bare(m), coach: user(m.coachId) })),
      checkins: db.select().from(checkins).where(eq(checkins.gymId, gymId)).orderBy(asc(checkins.id)).all()
        .map((c) => [member(c.memberId), c.at, c.source]),
      nudges: db.select().from(nudges).where(eq(nudges.gymId, gymId)).orderBy(asc(nudges.id)).all()
        .map((n) => ({ ...bare(n), member: member(n.memberId), user: user(n.userId), template: template(n.templateId) })),
      invites: db.select().from(invites).where(eq(invites.gymId, gymId)).all(),
    }
  }

  /** What a stall visitor leaves behind: a join with a phone and a visit, a nudge, Settings, Staff and Templates changes. */
  function visit(db: Db, gymId: number) {
    const owner = db.select().from(users).where(eq(users.email, 'mike@northside.test')).get()!
    const coach = db.select().from(users).where(eq(users.email, 'priya@northside.test')).get()!
    const visitor = db.insert(members)
      .values({ gymId, firstName: 'Visitor', lastName: null, phone: '+13125550999', joinedOn: TODAY, source: 'kiosk', createdAt: NOW.toISOString() })
      .returning().get()
    db.insert(checkins).values({ gymId, memberId: visitor.id, at: NOW.toISOString(), source: 'kiosk' }).run()
    db.insert(nudges).values({ gymId, memberId: visitor.id, userId: owner.id, body: 'Hi', channel: 'text', sentAt: NOW.toISOString() }).run()
    db.update(members).set({ phone: '+13125550998', archivedAt: NOW.toISOString() }).where(eq(members.externalId, 'NS-1001')).run()
    db.update(gyms).set({ name: 'Visitor Gym', timezone: 'Europe/London', country: 'GB' }).where(eq(gyms.id, gymId)).run()
    db.update(users).set({ active: false, name: 'Renamed' }).where(eq(users.id, coach.id)).run()
    db.delete(templates).where(eq(templates.sort, 0)).run()
    db.insert(invites).values({ tokenHash: 'invite-1', gymId, name: 'Alex', createdBy: owner.id, createdAt: NOW.toISOString() }).run()
    db.insert(sessions).values({ tokenHash: 'session-1', userId: owner.id, createdAt: NOW.toISOString(), expiresAt: '2026-12-06T18:00:00.000Z' }).run()
  }

  test('FR-OPS-03 puts the demo gym back as seeded, keeping the gym row and its kiosk token, and signs every demo session out', async () => {
    const db = open()
    const first = await seedNorthside(db, { ...options, newToken: () => 'kiosk-token-1' })
    const fresh = open()
    const expected = snapshot(fresh, (await seedNorthside(fresh, { ...options, newToken: () => 'kiosk-token-1' })).gymId)
    visit(db, first.gymId)
    expect(snapshot(db, first.gymId)).not.toEqual(expected)

    const out = await resetNorthside(db, options)
    expect(out).toMatchObject({ gymId: first.gymId, kioskToken: 'kiosk-token-1' })
    expect(snapshot(db, first.gymId)).toEqual(expected)
    expect(db.select().from(members).where(eq(members.phone, '+13125550999')).all()).toEqual([])
    expect(db.select().from(sessions).all()).toEqual([])
    expect(db.select().from(gyms).all().map((g) => g.id)).toEqual([first.gymId])
  })

  test('FR-OPS-03 lays the demo out for the day it runs, and leaves every other gym alone', async () => {
    const db = open()
    const first = await seedNorthside(db, { ...options, newToken: () => 'kiosk-token-1' })
    const other = db.insert(gyms)
      .values({ name: 'Other', slug: 'other', pilotStartedOn: TODAY, kioskToken: 'k-other', createdAt: NOW.toISOString() })
      .returning().get()
    db.insert(users).values({ gymId: other.id, email: 'o@other.test', name: 'O', role: 'owner', passwordHash: 'x', active: true, createdAt: NOW.toISOString() }).run()
    db.insert(members).values({ gymId: other.id, firstName: 'Kept', phone: '+13125550999', joinedOn: TODAY, source: 'kiosk', createdAt: NOW.toISOString() }).run()
    const before = snapshot(db, other.id)

    const later = await resetNorthside(db, { ...options, today: '2026-11-13', country: 'PK' })
    expect(later?.data).toStrictEqual(buildNorthside({ today: '2026-11-13', timezone: TZ, country: 'PK', templates: TEMPLATES }))
    expect(db.select().from(gyms).where(eq(gyms.id, first.gymId)).get()).toMatchObject({ country: 'PK', pilotStartedOn: '2026-10-21', kioskToken: 'kiosk-token-1' })
    expect(snapshot(db, other.id)).toEqual(before)
  })

  test('without a demo gym it writes nothing', async () => {
    const db = open()
    expect(await resetNorthside(db, options)).toBeUndefined()
    expect(db.select().from(gyms).all()).toEqual([])
  })
})
