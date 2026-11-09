import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { checkins, members, nudges, templates } from '../schema/index.ts'
import { createRepositories, DuplicateError, type ImportedMember, type Repositories, type Scope } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'
const WEEK_AGO = '2026-10-30T15:00:00.000Z'

let db: Db
let close: () => void
let repos: Repositories

beforeEach(() => {
  ;({ db, close } = createDb(':memory:'))
  repos = createRepositories(db)
})
afterEach(() => close())

let gyms = 0
async function gymWithStaff() {
  gyms++
  const { gym, owner } = await repos.gyms.createWithOwner({
    gym: { name: 'Northside', slug: 'northside', timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: `k${gyms}` },
    owner: { email: `owner${gyms}@example.com`, name: 'Mike Ross', passwordHash: 'h' },
    templates: [{ name: 'Missed you', body: 'Hey {first}' }],
    createdAt: T,
  })
  const coach = async (name: string) => {
    const email = `${name.toLowerCase()}${gyms}@example.com`
    await repos.invites.create({ tokenHash: email, gymId: gym.id, name, createdBy: owner.id, createdAt: T })
    const user = await repos.invites.accept({ tokenHash: email, liveSince: WEEK_AGO, acceptedAt: T, user: { email, name, passwordHash: 'h' } })
    if (!user) throw new Error('invite was not live')
    return user
  }
  const ana = await coach('Ana')
  const ben = await coach('Ben')
  const owners: Scope = { gymId: gym.id }
  return { gym, owner, ana, ben, owners, anas: { gymId: gym.id, coachId: ana.id }, bens: { gymId: gym.id, coachId: ben.id } }
}

const person = (over: Partial<ImportedMember> = {}): ImportedMember => ({
  firstName: 'Sam',
  lastName: 'Ortiz',
  phone: null,
  email: null,
  joinedOn: '2026-11-01',
  coachId: null,
  externalId: null,
  ...over,
})

/** Members created through the CSV import, with nothing else. */
async function addMembers(gymId: number, list: ImportedMember[]) {
  return (await repos.members.applyImport({ gymId, at: T, creates: list, updates: [], checkins: [] })).created
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (err) {
    return err
  }
  throw new Error('expected the promise to reject')
}
async function expectDuplicate(promise: Promise<unknown>, field: string) {
  const err = await rejection(promise)
  expect(err).toBeInstanceOf(DuplicateError)
  expect(err).toMatchObject({ field })
}

/** Every row of the four tables, to show a failed write left nothing behind. */
const snapshot = () => ({
  members: db.select().from(members).all(),
  checkins: db.select().from(checkins).all(),
  templates: db.select().from(templates).all(),
  nudges: db.select().from(nudges).all(),
})

/** Make every `op` on `table` fail, so a transaction's later statement throws. */
function breakWrites(op: 'INSERT' | 'DELETE', table: 'checkins' | 'templates') {
  db.run(sql.raw(`CREATE TRIGGER broken BEFORE ${op} ON ${table} BEGIN SELECT RAISE(ABORT, 'broken'); END`))
}

describe('members', () => {
  test('finds a member only within the scope: owners see the gym, coaches their own', async () => {
    const { gym, ana, owners, anas, bens } = await gymWithStaff()
    const other = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person({ coachId: ana.id })])
    if (!sam) throw new Error('no member')
    expect(await repos.members.findInScope(owners, sam.id)).toEqual(sam)
    expect(await repos.members.findInScope(anas, sam.id)).toEqual(sam)
    expect(await repos.members.findInScope(bens, sam.id)).toBeUndefined()
    expect(await repos.members.findInScope(other.owners, sam.id)).toBeUndefined()
  })

  test('finds a member by phone in their gym only', async () => {
    const { gym } = await gymWithStaff()
    const other = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person({ phone: '+13125550101' })])
    expect(await repos.members.findByPhone(gym.id, '+13125550101')).toEqual(sam)
    expect(await repos.members.findByPhone(other.gym.id, '+13125550101')).toBeUndefined()
  })

  test('lists by id, and by first name, last name (none first), then id', async () => {
    const { gym } = await gymWithStaff()
    const made = await addMembers(gym.id, [
      person({ firstName: 'Zoe', lastName: 'Ames' }),
      person({ firstName: 'Ann', lastName: 'Zed' }),
      person({ firstName: 'Ann', lastName: null }),
      person({ firstName: 'Ann', lastName: 'Bell' }),
      person({ firstName: 'Ann', lastName: 'Bell' }),
    ])
    const ids = made.map((m) => m.id)
    expect((await repos.members.listByGym(gym.id)).map((m) => m.id)).toEqual(ids)
    expect((await repos.members.listByName(gym.id)).map((m) => m.id)).toEqual([ids[2], ids[3], ids[4], ids[1], ids[0]])
  })

  test('summary inputs follow the scope, the join window and the ids', async () => {
    const { gym, owner, ana, ben, owners, anas, bens } = await gymWithStaff()
    const [a, b, old] = await addMembers(gym.id, [
      person({ firstName: 'A', coachId: ana.id, joinedOn: '2026-11-01' }),
      person({ firstName: 'B', coachId: ben.id, joinedOn: '2026-11-02' }),
      person({ firstName: 'Old', coachId: ana.id, joinedOn: '2026-01-01' }),
    ])
    if (!a || !b || !old) throw new Error('no members')
    await repos.members.applyImport({
      gymId: gym.id,
      at: T,
      creates: [],
      updates: [],
      checkins: [
        { memberId: a.id, at: '2026-11-03T12:00:00.000Z' },
        { memberId: b.id, at: '2026-11-02T12:00:00.000Z' },
        { memberId: a.id, at: '2026-11-02T09:00:00.000Z' },
      ],
    })
    const nudge = (memberId: number, userId: number, sentAt: string) =>
      repos.nudges.record({ gymId: gym.id, memberId, userId, templateId: null, body: 'Hi', sentAt })
    await nudge(a.id, owner.id, '2026-11-04T10:00:00.000Z')
    await nudge(a.id, ana.id, '2026-11-03T10:00:00.000Z')
    await nudge(b.id, ben.id, '2026-11-05T10:00:00.000Z')

    const all = await repos.members.summaryInputs(owners)
    expect(all.members.map((m) => m.id)).toEqual([a.id, b.id, old.id])
    expect(all.checkins).toEqual([
      { memberId: a.id, at: '2026-11-02T09:00:00.000Z' },
      { memberId: b.id, at: '2026-11-02T12:00:00.000Z' },
      { memberId: a.id, at: '2026-11-03T12:00:00.000Z' },
    ])
    expect(all.users).toEqual([owner, ana, ben].map((u) => ({ id: u.id, name: u.name })))
    expect(all.lastNudges).toEqual([
      { memberId: a.id, sentAt: '2026-11-04T10:00:00.000Z' },
      { memberId: b.id, sentAt: '2026-11-05T10:00:00.000Z' },
    ])

    const window = { joinedOn: { from: '2026-08-09', to: '2026-11-06' } }
    expect((await repos.members.summaryInputs(owners, window)).members.map((m) => m.id)).toEqual([a.id, b.id])
    const anasView = await repos.members.summaryInputs(anas, window)
    expect(anasView.members.map((m) => m.id)).toEqual([a.id])
    expect(anasView.checkins.map((c) => c.memberId)).toEqual([a.id, a.id])
    expect(anasView.lastNudges).toEqual([{ memberId: a.id, sentAt: '2026-11-04T10:00:00.000Z' }])
    expect(anasView.users).toHaveLength(3)
    const bensView = await repos.members.summaryInputs(bens)
    expect(bensView.members.map((m) => m.id)).toEqual([b.id])
    expect(bensView.lastNudges).toEqual([{ memberId: b.id, sentAt: '2026-11-05T10:00:00.000Z' }])

    expect((await repos.members.summaryInputs(owners, { ids: [old.id] })).members.map((m) => m.id)).toEqual([old.id])
    expect((await repos.members.summaryInputs(bens, { ids: [a.id] })).members).toEqual([])
    expect(await repos.members.summaryInputs(owners, { ids: [] })).toEqual({ members: [], checkins: [], users: [], lastNudges: [] })
  })

  test('update sets the coach and the phone, within the scope', async () => {
    const { gym, ana, ben, owners, bens } = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person({ coachId: ana.id, phone: '+13125550101' })])
    if (!sam) throw new Error('no member')
    const moved = await repos.members.update(owners, sam.id, { coachId: ben.id, phone: '+13125550199' })
    expect(moved).toEqual({ ...sam, coachId: ben.id, phone: '+13125550199' })
    expect(await repos.members.update(owners, sam.id, { phone: '', coachId: null })).toEqual({ ...sam, coachId: null, phone: null })
    expect(await repos.members.update(owners, sam.id, {})).toEqual({ ...sam, coachId: null, phone: null })
    expect(await repos.members.update(bens, sam.id, { phone: null })).toBeUndefined()
  })

  test('an update whose phone clashes throws DuplicateError and changes neither field', async () => {
    const { gym, ana, ben, owners } = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person({ coachId: ana.id }), person({ firstName: 'Kim', phone: '+13125550102' })])
    if (!sam) throw new Error('no member')
    const before = snapshot()
    await expectDuplicate(repos.members.update(owners, sam.id, { coachId: ben.id, phone: '+13125550102' }), 'phone')
    expect(snapshot()).toEqual(before)
  })

  test('kiosk join creates the member, assigns coaches round-robin over active staff by id, and checks them in', async () => {
    const { gym, owner, ana, ben } = await gymWithStaff()
    const join = (firstName: string, phone: string | null = null) =>
      repos.members.joinAtKiosk({ gymId: gym.id, firstName, lastName: '', phone, joinedOn: '2026-11-06', at: T })
    const first = await join('Al', '+13125550101')
    expect(first.member).toEqual({
      id: first.member.id,
      gymId: gym.id,
      firstName: 'Al',
      lastName: null,
      phone: '+13125550101',
      email: null,
      joinedOn: '2026-11-06',
      coachId: owner.id,
      externalId: null,
      source: 'kiosk',
      createdAt: T,
      archivedAt: null,
    })
    expect(first.checkin).toEqual({ id: first.checkin.id, gymId: gym.id, memberId: first.member.id, at: T, source: 'kiosk' })
    const coaches = [(await join('Bo')).member.coachId, (await join('Cy')).member.coachId, (await join('Di')).member.coachId]
    expect(coaches).toEqual([ana.id, ben.id, owner.id])
    await repos.users.setActive(gym.id, owner.id, false)
    expect((await join('Ed')).member.coachId).toBe(ana.id) // the newest member's coach is gone: the first active one
    expect((await join('Fy')).member.coachId).toBe(ben.id)
    await repos.users.setActive(gym.id, ana.id, false)
    await repos.users.setActive(gym.id, ben.id, false)
    expect((await join('Gu')).member.coachId).toBeNull()
  })

  test('kiosk join with a taken phone throws DuplicateError and leaves nothing behind', async () => {
    const { gym } = await gymWithStaff()
    await addMembers(gym.id, [person({ phone: '+13125550101' })])
    const before = snapshot()
    await expectDuplicate(
      repos.members.joinAtKiosk({ gymId: gym.id, firstName: 'Al', lastName: null, phone: '+13125550101', joinedOn: '2026-11-06', at: T }),
      'phone',
    )
    expect(snapshot()).toEqual(before)
  })

  test('kiosk join rolls the member back when the check-in fails', async () => {
    const { gym } = await gymWithStaff()
    const before = snapshot()
    breakWrites('INSERT', 'checkins')
    await expect(
      repos.members.joinAtKiosk({ gymId: gym.id, firstName: 'Al', lastName: null, phone: null, joinedOn: '2026-11-06', at: T }),
    ).rejects.toThrow()
    expect(snapshot()).toEqual(before)
  })

  test('the import writes creates, updates and check-ins, storing blanks as null', async () => {
    const { gym, ana } = await gymWithStaff()
    const other = await gymWithStaff()
    const [kim] = await addMembers(gym.id, [person({ firstName: 'Kim', externalId: 'E1' })])
    const [stranger] = await addMembers(other.gym.id, [person({ firstName: 'Stranger' })])
    if (!kim || !stranger) throw new Error('no members')
    const result = await repos.members.applyImport({
      gymId: gym.id,
      at: T,
      creates: [person({ lastName: '', phone: '+13125550101', email: '', externalId: '' })],
      updates: [
        { id: kim.id, changes: { coachId: ana.id, phone: '+13125550102', lastName: 'Lee' } },
        { id: stranger.id, changes: { firstName: 'Taken over' } },
        { id: kim.id, changes: {} },
      ],
      checkins: [{ memberId: kim.id, at: '2026-11-05T12:00:00.000Z' }],
    })
    expect(result.created).toEqual([
      expect.objectContaining({ firstName: 'Sam', lastName: null, phone: '+13125550101', email: null, externalId: null, source: 'csv', createdAt: T }),
    ])
    expect(result.updated).toEqual([{ ...kim, coachId: ana.id, phone: '+13125550102', lastName: 'Lee' }])
    expect(result.checkins).toEqual([
      { id: result.checkins[0]?.id, gymId: gym.id, memberId: kim.id, at: '2026-11-05T12:00:00.000Z', source: 'csv' },
    ])
    expect(await repos.members.findInScope(other.owners, stranger.id)).toEqual(stranger)
  })

  test('an import that clashes on phone or external id throws DuplicateError and writes nothing', async () => {
    const { gym } = await gymWithStaff()
    const [kim] = await addMembers(gym.id, [person({ firstName: 'Kim', phone: '+13125550101', externalId: 'E1' })])
    if (!kim) throw new Error('no member')
    const before = snapshot()
    const commit = (over: { creates?: ImportedMember[]; updates?: { id: number; changes: { phone?: string } }[] }) =>
      repos.members.applyImport({ gymId: gym.id, at: T, creates: over.creates ?? [], updates: over.updates ?? [], checkins: [{ memberId: kim.id, at: T }] })
    await expectDuplicate(commit({ creates: [person({ firstName: 'New' }), person({ externalId: 'E1' })] }), 'externalId')
    await expectDuplicate(commit({ creates: [person({ phone: '+13125550101' })] }), 'phone')
    const [late] = await addMembers(gym.id, [person({ firstName: 'Late' })])
    if (!late) throw new Error('no member')
    const withLate = snapshot()
    await expectDuplicate(commit({ creates: [person({ firstName: 'New' })], updates: [{ id: late.id, changes: { phone: '+13125550101' } }] }), 'phone')
    expect(snapshot()).toEqual(withLate)
    expect(withLate.members).toHaveLength(before.members.length + 1)
  })

  test('an import whose check-ins fail writes no members either', async () => {
    const { gym } = await gymWithStaff()
    const [kim] = await addMembers(gym.id, [person({ firstName: 'Kim' })])
    if (!kim) throw new Error('no member')
    const before = snapshot()
    const commit = repos.members.applyImport({
      gymId: gym.id,
      at: T,
      creates: [person({ firstName: 'New' })],
      updates: [{ id: kim.id, changes: { firstName: 'Kimberly' } }],
      checkins: [{ memberId: kim.id + 999, at: T }],
    })
    await expect(commit).rejects.toThrow()
    expect(snapshot()).toEqual(before)
  })
})

describe('checkins', () => {
  test('a kiosk check-in is stored unless the member checked in since the cut-off', async () => {
    const { gym } = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person()])
    if (!sam) throw new Error('no member')
    const visit = (at: string, unlessSince: string) => repos.checkins.recordAtKiosk({ gymId: gym.id, memberId: sam.id, at, unlessSince })
    const first = await visit('2026-11-06T10:00:00.000Z', '2026-11-06T09:00:00.000Z')
    expect(first).toEqual({ id: first?.id, gymId: gym.id, memberId: sam.id, at: '2026-11-06T10:00:00.000Z', source: 'kiosk' })
    expect(await visit('2026-11-06T10:59:59.999Z', '2026-11-06T09:59:59.999Z')).toBeUndefined()
    expect(await visit('2026-11-06T11:00:00.000Z', '2026-11-06T10:00:00.000Z')).toBeDefined() // the cut-off is exclusive
    expect(await visit('2026-11-06T09:30:00.000Z', '2026-11-06T08:30:00.000Z')).toBeDefined() // later ones do not count
    expect(await repos.checkins.listByMember({ gymId: gym.id }, sam.id)).toHaveLength(3)
  })

  test("lists a member's check-ins newest first, within the scope", async () => {
    const { gym, ana, owners, anas, bens } = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person({ coachId: ana.id })])
    if (!sam) throw new Error('no member')
    const ats = ['2026-11-02T10:00:00.000Z', '2026-11-04T10:00:00.000Z', '2026-11-03T10:00:00.000Z']
    await repos.members.applyImport({ gymId: gym.id, at: T, creates: [], updates: [], checkins: ats.map((at) => ({ memberId: sam.id, at })) })
    const newestFirst = ['2026-11-04T10:00:00.000Z', '2026-11-03T10:00:00.000Z', '2026-11-02T10:00:00.000Z']
    expect((await repos.checkins.listByMember(owners, sam.id)).map((c) => c.at)).toEqual(newestFirst)
    expect((await repos.checkins.listByMember(anas, sam.id)).map((c) => c.at)).toEqual(newestFirst)
    expect(await repos.checkins.listByMember(bens, sam.id)).toEqual([])
    expect((await repos.checkins.listByGym(gym.id)).map((c) => c.at)).toEqual([...newestFirst].reverse())
  })

  test("lists the scope's check-ins since a time, newest first, with names", async () => {
    const { gym, ana, ben, owners, anas, bens } = await gymWithStaff()
    const [a, b] = await addMembers(gym.id, [person({ firstName: 'A', lastName: null, coachId: ana.id }), person({ firstName: 'B', coachId: ben.id })])
    if (!a || !b) throw new Error('no members')
    await repos.members.applyImport({
      gymId: gym.id,
      at: T,
      creates: [],
      updates: [],
      checkins: [
        { memberId: a.id, at: '2026-11-04T10:00:00.000Z' },
        { memberId: a.id, at: '2026-11-06T10:00:00.000Z' },
        { memberId: b.id, at: '2026-11-06T12:00:00.000Z' },
      ],
    })
    const since = '2026-11-05T03:00:00.000Z'
    expect(await repos.checkins.listSince(owners, since)).toEqual([
      { memberId: b.id, at: '2026-11-06T12:00:00.000Z', firstName: 'B', lastName: 'Ortiz' },
      { memberId: a.id, at: '2026-11-06T10:00:00.000Z', firstName: 'A', lastName: null },
    ])
    expect((await repos.checkins.listSince(anas, since)).map((c) => c.memberId)).toEqual([a.id])
    expect((await repos.checkins.listSince(bens, since)).map((c) => c.memberId)).toEqual([b.id])
    expect(await repos.checkins.listSince(owners, '2026-11-06T12:00:00.000Z')).toHaveLength(1) // since is inclusive
  })
})

describe('templates', () => {
  test('creates at the end of the list, lists by sort then id, finds within the gym', async () => {
    const { gym } = await gymWithStaff()
    const other = await gymWithStaff()
    const made = await repos.templates.create({ gymId: gym.id, name: 'Two', body: 'B', updatedAt: T })
    expect(made).toEqual({ id: made.id, gymId: gym.id, name: 'Two', body: 'B', sort: 2, updatedAt: T })
    const third = await repos.templates.create({ gymId: gym.id, name: 'Three', body: 'C', updatedAt: T })
    expect(third.sort).toBe(3)
    expect((await repos.templates.list(gym.id)).map((t) => t.name)).toEqual(['Missed you', 'Two', 'Three'])
    expect(await repos.templates.findInGym(gym.id, made.id)).toEqual(made)
    expect(await repos.templates.findInGym(other.gym.id, made.id)).toBeUndefined()
    await repos.templates.delete(other.gym.id, (await repos.templates.list(other.gym.id))[0]?.id ?? 0)
    expect((await repos.templates.create({ gymId: other.gym.id, name: 'First', body: 'A', updatedAt: T })).sort).toBe(1)
  })

  test('edits the name, the body or both, within the gym', async () => {
    const { gym } = await gymWithStaff()
    const other = await gymWithStaff()
    const t = await repos.templates.create({ gymId: gym.id, name: 'N', body: 'B', updatedAt: T })
    const later = '2026-11-07T15:00:00.000Z'
    expect(await repos.templates.update(gym.id, t.id, { name: 'N2', updatedAt: later })).toEqual({ ...t, name: 'N2', updatedAt: later })
    expect(await repos.templates.update(gym.id, t.id, { body: 'B2', updatedAt: later })).toEqual({ ...t, name: 'N2', body: 'B2', updatedAt: later })
    expect(await repos.templates.update(other.gym.id, t.id, { name: 'X', updatedAt: later })).toBeUndefined()
  })

  test('delete keeps the nudges with their body and clears their template', async () => {
    const { gym, owner } = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person()])
    if (!sam) throw new Error('no member')
    const t = await repos.templates.create({ gymId: gym.id, name: 'N', body: 'B', updatedAt: T })
    const sent = await repos.nudges.record({ gymId: gym.id, memberId: sam.id, userId: owner.id, templateId: t.id, body: 'Hi Sam', sentAt: T })
    const other = await gymWithStaff()
    expect(await repos.templates.delete(other.gym.id, t.id)).toBeUndefined()
    expect(await repos.templates.delete(gym.id, t.id)).toEqual(t)
    expect(await repos.templates.findInGym(gym.id, t.id)).toBeUndefined()
    expect(await repos.nudges.listByGym(gym.id)).toEqual([{ ...sent, templateId: null }])
  })

  test('a delete that fails keeps the template and the nudges as they were', async () => {
    const { gym, owner } = await gymWithStaff()
    const [sam] = await addMembers(gym.id, [person()])
    if (!sam) throw new Error('no member')
    const t = await repos.templates.create({ gymId: gym.id, name: 'N', body: 'B', updatedAt: T })
    await repos.nudges.record({ gymId: gym.id, memberId: sam.id, userId: owner.id, templateId: t.id, body: 'Hi', sentAt: T })
    const before = snapshot()
    breakWrites('DELETE', 'templates')
    await expect(repos.templates.delete(gym.id, t.id)).rejects.toThrow()
    expect(snapshot()).toEqual(before)
  })
})

describe('nudges', () => {
  async function nudged() {
    const staff = await gymWithStaff()
    const { gym, owner, ana, ben } = staff
    const [a, b] = await addMembers(gym.id, [person({ firstName: 'A', coachId: ana.id }), person({ firstName: 'B', lastName: null, coachId: ben.id })])
    if (!a || !b) throw new Error('no members')
    const send = (memberId: number, userId: number, sentAt: string) =>
      repos.nudges.record({ gymId: gym.id, memberId, userId, templateId: null, body: `to ${memberId}`, sentAt })
    const n1 = await send(a.id, ana.id, '2026-11-01T10:00:00.000Z')
    const n2 = await send(a.id, owner.id, '2026-11-03T10:00:00.000Z')
    const n3 = await send(b.id, ben.id, '2026-11-03T10:00:00.000Z')
    const n4 = await send(b.id, ana.id, '2026-11-05T10:00:00.000Z') // Ana nudged B while B was hers
    return { ...staff, a, b, n1, n2, n3, n4 }
  }

  test('records a nudge from the own phone', async () => {
    const { gym, owner, a } = await nudged()
    const n = await repos.nudges.record({ gymId: gym.id, memberId: a.id, userId: owner.id, templateId: null, body: 'Hey', sentAt: T })
    expect(n).toEqual({ id: n.id, gymId: gym.id, memberId: a.id, userId: owner.id, templateId: null, body: 'Hey', channel: 'own-phone', sentAt: T })
  })

  test("lists a member's nudges from anyone, newest first, with the sender, within the scope", async () => {
    const { owners, anas, bens, a, n1, n2 } = await nudged()
    const expected = [
      { ...n2, senderName: 'Mike Ross' },
      { ...n1, senderName: 'Ana' },
    ]
    expect(await repos.nudges.listByMember(owners, a.id)).toEqual(expected)
    expect(await repos.nudges.listByMember(anas, a.id)).toEqual(expected)
    expect(await repos.nudges.listByMember(bens, a.id)).toEqual([])
  })

  test('history: an owner sees the gym, a coach only what they sent to members still theirs, newest first', async () => {
    const { gym, owners, anas, bens, a, b, n1, n2, n3, n4 } = await nudged()
    await repos.members.applyImport({
      gymId: gym.id,
      at: T,
      creates: [],
      updates: [],
      checkins: [
        { memberId: a.id, at: '2026-10-20T10:00:00.000Z' },
        { memberId: a.id, at: '2026-11-04T10:00:00.000Z' },
        { memberId: b.id, at: '2026-11-06T10:00:00.000Z' },
      ],
    })
    const since = '2026-11-01T10:00:00.000Z'
    const owner = await repos.nudges.history(owners, since)
    expect(owner.nudges.map((n) => n.id)).toEqual([n4.id, n3.id, n2.id, n1.id]) // n3 and n2 tie on time: id decides
    expect(owner.nudges[0]).toEqual({ ...n4, senderName: 'Ana', memberFirstName: 'B', memberLastName: null })
    expect(owner.checkins).toEqual([
      { memberId: a.id, at: '2026-11-04T10:00:00.000Z' },
      { memberId: b.id, at: '2026-11-06T10:00:00.000Z' },
    ])
    expect((await repos.nudges.history(owners, '2026-11-01T10:00:00.001Z')).nudges.map((n) => n.id)).toEqual([n4.id, n3.id, n2.id])
    expect((await repos.nudges.history(anas, since)).nudges.map((n) => n.id)).toEqual([n1.id]) // not n4: B is Ben's
    expect((await repos.nudges.history(bens, since)).nudges.map((n) => n.id)).toEqual([n3.id])

    await repos.members.update(owners, a.id, { coachId: (await repos.members.findInScope(owners, b.id))?.coachId ?? null })
    expect((await repos.nudges.history(anas, since)).nudges).toEqual([]) // A moved to Ben: Ana no longer sees n1
    expect((await repos.nudges.history(bens, since)).nudges.map((n) => n.id)).toEqual([n3.id]) // Ben did not send n1
    expect(await repos.nudges.history(anas, since)).toEqual({ nudges: [], checkins: [] })
  })

  test('counts nudges sent since a time: the gym for an owner, the sender for a coach', async () => {
    const { owners, anas, bens } = await nudged()
    expect(await repos.nudges.countSentSince(owners, '2026-11-01T10:00:00.000Z')).toBe(4)
    expect(await repos.nudges.countSentSince(owners, '2026-11-03T10:00:00.000Z')).toBe(3)
    expect(await repos.nudges.countSentSince(anas, '2026-11-01T00:00:00.000Z')).toBe(2) // n4 counts though B is Ben's
    expect(await repos.nudges.countSentSince(bens, '2026-11-01T00:00:00.000Z')).toBe(1)
  })

  test("lists the gym's nudges oldest first", async () => {
    const { gym, n1, n2, n3, n4 } = await nudged()
    const other = await gymWithStaff()
    expect((await repos.nudges.listByGym(gym.id)).map((n) => n.id)).toEqual([n1.id, n2.id, n3.id, n4.id])
    expect(await repos.nudges.listByGym(other.gym.id)).toEqual([])
  })
})
