// The members repository's writes for the member page and Members (API-MEMBERS): edits, add, archive, restore,
// permanent delete, and the summaries' archive filter and bounded check-in read.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { checkins, members, nudges } from '../schema/index.ts'
import { createRepositories, DuplicateError, type ImportedMember, type Repositories, type Scope } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'
const LATER = '2026-11-06T16:00:00.000Z'
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
    gym: { name: 'Northside', slug: `northside-${gyms}`, timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: `k${gyms}` },
    owner: { email: `owner${gyms}@example.com`, name: 'Mike Ross', passwordHash: 'h' },
    templates: [],
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

async function addMember(gymId: number, over: Partial<ImportedMember> = {}) {
  const [m] = (await repos.members.applyImport({ gymId, at: T, creates: [person(over)], updates: [], checkins: [] })).created
  if (!m) throw new Error('no member')
  return m
}

const addCheckins = (gymId: number, memberId: number, ats: string[]) =>
  repos.members.applyImport({ gymId, at: T, creates: [], updates: [], checkins: ats.map((at) => ({ memberId, at })) })

const snapshot = () => ({
  members: db.select().from(members).all(),
  checkins: db.select().from(checkins).all(),
  nudges: db.select().from(nudges).all(),
})

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (err) {
    return err
  }
  throw new Error('expected the promise to reject')
}

describe('edits', () => {
  test('FR-MEMBER-02 update changes only the fields given: one left out or undefined keeps its value', async () => {
    const { gym, ana, owners } = await gymWithStaff()
    const sam = await addMember(gym.id, { coachId: ana.id, phone: '+13125550101' })
    expect(await repos.members.update(owners, sam.id, { phone: undefined, coachId: undefined })).toEqual(sam)
    const renamed = await repos.members.update(owners, sam.id, { firstName: 'Samuel', lastName: undefined })
    expect(renamed).toEqual({ ...sam, firstName: 'Samuel' })
    expect(await repos.members.update(owners, sam.id, { lastName: '' })).toEqual({ ...sam, firstName: 'Samuel', lastName: null })
    expect(await repos.members.update(owners, sam.id, { lastName: 'Ortega' })).toEqual({ ...sam, firstName: 'Samuel', lastName: 'Ortega' })
  })

  test('FR-MEMBER-02 a name change with a clashing phone saves neither', async () => {
    const { gym, owners } = await gymWithStaff()
    const sam = await addMember(gym.id)
    await addMember(gym.id, { firstName: 'Kim', phone: '+13125550102' })
    const before = snapshot()
    const err = await rejection(repos.members.update(owners, sam.id, { firstName: 'Samuel', phone: '+13125550102' }))
    expect(err).toBeInstanceOf(DuplicateError)
    expect(snapshot()).toEqual(before)
  })
})

describe('add', () => {
  test("FR-MEM-05 create adds a member by hand (source 'app'), blank text stored as null", async () => {
    const { gym, ana, owners } = await gymWithStaff()
    const leo = await repos.members.create({ gymId: gym.id, firstName: 'Leo', lastName: '', phone: '', joinedOn: '2026-11-02', coachId: ana.id, createdAt: T })
    expect(leo).toMatchObject({ gymId: gym.id, firstName: 'Leo', lastName: null, phone: null, email: null, joinedOn: '2026-11-02', coachId: ana.id, source: 'app', createdAt: T, archivedAt: null })
    expect(await repos.members.findInScope(owners, leo.id)).toEqual(leo)
  })

  test('FR-MEM-05 create with a taken phone throws DuplicateError and adds nothing', async () => {
    const { gym } = await gymWithStaff()
    await addMember(gym.id, { phone: '+13125550102' })
    const before = snapshot()
    const err = await rejection(
      repos.members.create({ gymId: gym.id, firstName: 'Leo', lastName: null, phone: '+13125550102', joinedOn: '2026-11-02', coachId: null, createdAt: T }),
    )
    expect(err).toBeInstanceOf(DuplicateError)
    expect(err).toMatchObject({ field: 'phone' })
    expect(snapshot()).toEqual(before)
  })
})

describe('archive and restore', () => {
  test('FR-MEMBER-05 archiving sets archived_at once; a repeat keeps the first time and says nothing changed', async () => {
    const { gym, owners } = await gymWithStaff()
    const sam = await addMember(gym.id)
    expect(await repos.members.setArchived(owners, sam.id, T)).toEqual({ member: { ...sam, archivedAt: T }, changed: true })
    expect(await repos.members.setArchived(owners, sam.id, LATER)).toEqual({ member: { ...sam, archivedAt: T }, changed: false })
  })

  test('FR-MEMBER-06 restoring clears archived_at; restoring an active member changes nothing', async () => {
    const { gym, owners } = await gymWithStaff()
    const sam = await addMember(gym.id)
    expect(await repos.members.setArchived(owners, sam.id, null)).toEqual({ member: sam, changed: false })
    await repos.members.setArchived(owners, sam.id, T)
    expect(await repos.members.setArchived(owners, sam.id, null)).toEqual({ member: sam, changed: true })
  })

  test("FR-PRIV-02 archive and restore keep to the scope: another coach's or another gym's member is not found", async () => {
    const { gym, ana, anas, bens } = await gymWithStaff()
    const other = await gymWithStaff()
    const sam = await addMember(gym.id, { coachId: ana.id })
    expect(await repos.members.setArchived(bens, sam.id, T)).toBeUndefined()
    expect(await repos.members.setArchived(other.owners, sam.id, T)).toBeUndefined()
    expect((await repos.members.setArchived(anas, sam.id, T))?.changed).toBe(true)
    expect(await repos.members.setArchived(other.owners, sam.id, null)).toBeUndefined()
    expect((await repos.members.findInScope(anas, sam.id))?.archivedAt).toBe(T)
  })

  test('FR-MEM-01 summary inputs take only the archived, only the others, or both', async () => {
    const { gym, owners } = await gymWithStaff()
    const sam = await addMember(gym.id)
    const kim = await addMember(gym.id, { firstName: 'Kim' })
    await repos.members.setArchived(owners, kim.id, T)
    const ids = async (archived?: boolean) => (await repos.members.summaryInputs(owners, { archived })).members.map((m) => m.id)
    expect(await ids(false)).toEqual([sam.id])
    expect(await ids(true)).toEqual([kim.id])
    expect(await ids()).toEqual([sam.id, kim.id])
  })
})

describe('permanent delete', () => {
  test('FR-MEMBER-07 only an archived member is deleted, with their check-ins and nudges; nobody else is touched', async () => {
    const { gym, owner, owners } = await gymWithStaff()
    const sam = await addMember(gym.id)
    const kim = await addMember(gym.id, { firstName: 'Kim' })
    for (const m of [sam, kim]) {
      await addCheckins(gym.id, m.id, ['2026-11-02T15:00:00.000Z', '2026-11-03T15:00:00.000Z'])
      await repos.nudges.record({ gymId: gym.id, memberId: m.id, userId: owner.id, templateId: null, body: 'Hey', sentAt: T })
    }
    expect(await repos.members.deleteArchived(owners, sam.id)).toBeUndefined()
    expect((await repos.members.findInScope(owners, sam.id))?.id).toBe(sam.id)

    await repos.members.setArchived(owners, sam.id, T)
    const before = snapshot()
    expect(await repos.members.deleteArchived(owners, sam.id)).toEqual({ ...sam, archivedAt: T })
    const after = snapshot()
    expect(after.members.map((m) => m.id)).toEqual([kim.id])
    expect(after.checkins).toEqual(before.checkins.filter((c) => c.memberId === kim.id))
    expect(after.nudges).toEqual(before.nudges.filter((n) => n.memberId === kim.id))
    expect(after.checkins).toHaveLength(2)
    expect(after.nudges).toHaveLength(1)
  })

  test("FR-PRIV-02 a permanent delete keeps to the scope: another gym's archived member is not found", async () => {
    const { gym, owners } = await gymWithStaff()
    const other = await gymWithStaff()
    const sam = await addMember(gym.id)
    await repos.members.setArchived(owners, sam.id, T)
    expect(await repos.members.deleteArchived(other.owners, sam.id)).toBeUndefined()
    expect((await repos.members.findInScope(owners, sam.id))?.id).toBe(sam.id)
  })
})

describe('the summaries read', () => {
  test("FR-MEM-01 summary inputs read a member's visits that may fall in their first 90 days, and their latest", async () => {
    const { gym, owners } = await gymWithStaff()
    const joinedOn = '2025-03-01'
    const old = await addMember(gym.id, { joinedOn })
    const ats = [
      '2025-02-20T15:00:00.000Z', // before joining
      '2025-03-01T05:30:00.000Z', // 23:30 on 28 Feb in Chicago: the day before
      '2025-03-01T15:00:00.000Z', // day 0
      '2025-03-08T15:00:00.000Z', // day 7
      '2025-05-29T15:00:00.000Z', // day 89
      '2025-05-30T15:00:00.000Z', // day 90
      '2025-09-01T15:00:00.000Z', // months later
      '2026-11-05T15:00:00.000Z', // yesterday: the latest
    ]
    await addCheckins(gym.id, old.id, ats)
    const inputs = await repos.members.summaryInputs(owners)
    expect(inputs.checkins.map((c) => c.at)).toEqual([
      '2025-03-01T05:30:00.000Z',
      '2025-03-01T15:00:00.000Z',
      '2025-03-08T15:00:00.000Z',
      '2025-05-29T15:00:00.000Z',
      '2025-05-30T15:00:00.000Z',
      '2026-11-05T15:00:00.000Z',
    ])
    // The API's members test checks that the summaries come out as from every check-in.
    expect(await repos.checkins.listByGym(gym.id)).toHaveLength(ats.length)
  })
})
