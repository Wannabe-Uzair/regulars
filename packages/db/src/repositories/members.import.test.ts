// applyImport as the CSV import's commit uses it (FR-IMPORT-08): planned from the gym's snapshot inside its own
// transaction, held to the gym, and all or nothing.
import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { checkins, members, users } from '../schema/index.ts'
import { createRepositories, type ImportedMember, type Repositories } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'

let db: Db
let close: () => void
let repos: Repositories

beforeEach(() => {
  ;({ db, close } = createDb(':memory:'))
  repos = createRepositories(db)
})
afterEach(() => close())

let gyms = 0
async function gym() {
  gyms++
  const made = await repos.gyms.createWithOwner({
    gym: {
      name: 'Northside',
      slug: `gym${gyms}`,
      timezone: 'America/Chicago',
      pilotStartedOn: '2026-11-01',
      kioskToken: `k${gyms}`,
    },
    owner: { email: `owner${gyms}@example.com`, name: 'Mike', passwordHash: 'h' },
    templates: [],
    createdAt: T,
  })
  return { id: made.gym.id, owner: made.owner }
}

const person = (over: Partial<ImportedMember> = {}): ImportedMember => ({
  firstName: 'Sam',
  lastName: null,
  phone: null,
  email: null,
  joinedOn: '2026-11-01',
  coachId: null,
  externalId: null,
  ...over,
})

const nothing = { creates: [], updates: [], checkins: [] }

async function add(gymId: number, list: ImportedMember[]) {
  return (await repos.members.applyImport({ gymId, at: T, ...nothing, creates: list })).created
}

const count = (table: typeof members | typeof checkins) =>
  db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .get()?.n ?? 0

test("FR-IMPORT-08 a plan sees only its own gym's members (archived ones too), active staff and check-ins", async () => {
  const a = await gym()
  const b = await gym()
  const [kim, lee] = await add(a.id, [person({ firstName: 'Kim' }), person({ firstName: 'Lee' })])
  const [other] = await add(b.id, [person({ firstName: 'Other' })])
  if (!kim || !lee || !other) throw new Error('no members')
  db.update(members).set({ archivedAt: T }).where(eq(members.id, lee.id)).run()
  const coach = db
    .insert(users)
    .values({
      gymId: a.id,
      email: 'gone@example.com',
      name: 'Gone',
      role: 'coach',
      passwordHash: 'h',
      active: false,
      createdAt: T,
    })
    .returning()
    .get()
  await repos.members.applyImport({ gymId: a.id, at: T, ...nothing, checkins: [{ memberId: kim.id, at: T }] })
  await repos.members.applyImport({ gymId: b.id, at: T, ...nothing, checkins: [{ memberId: other.id, at: T }] })

  let seen: { members: string[]; archived: (string | null)[]; staff: string[]; checkins: number[] } | undefined
  await repos.members.applyImport({
    gymId: a.id,
    at: T,
    plan: (snap) => {
      seen = {
        members: snap.members.map((m) => m.firstName),
        archived: snap.members.map((m) => m.archivedAt),
        staff: snap.staff.map((s) => s.email),
        checkins: snap.checkins().map((c) => c.memberId),
      }
      return nothing
    },
  })
  expect(seen).toEqual({ members: ['Kim', 'Lee'], archived: [null, T], staff: [a.owner.email], checkins: [kim.id] })
  expect(coach.active).toBe(false)
})

test('FR-IMPORT-09 a planned restore clears the archive, with or without other changes', async () => {
  const a = await gym()
  const [kim, lee] = await add(a.id, [person({ firstName: 'Kim' }), person({ firstName: 'Lee' })])
  if (!kim || !lee) throw new Error('no members')
  db.update(members).set({ archivedAt: T }).where(eq(members.gymId, a.id)).run()
  const result = await repos.members.applyImport({
    gymId: a.id,
    at: T,
    plan: () => ({
      ...nothing,
      updates: [
        { id: kim.id, changes: {}, restore: true },
        { id: lee.id, changes: { lastName: 'Park' }, restore: true },
      ],
    }),
  })
  expect(result.updated.map((m) => [m.firstName, m.lastName, m.archivedAt])).toEqual([
    ['Kim', null, null],
    ['Lee', 'Park', null],
  ])
})

test("FR-IMPORT-08 a coach from another gym, or a check-in for another gym's member, throws and writes nothing", async () => {
  const a = await gym()
  const b = await gym()
  const [kim] = await add(a.id, [person({ firstName: 'Kim' })])
  const [other] = await add(b.id, [person({ firstName: 'Other' })])
  if (!kim || !other) throw new Error('no members')
  const before = { members: count(members), checkins: count(checkins) }
  const commit = (writes: Partial<typeof nothing> | Record<string, unknown>) =>
    repos.members.applyImport({ gymId: a.id, at: T, ...nothing, ...writes })
  await expect(commit({ creates: [person({ coachId: b.owner.id })] })).rejects.toThrow(/coach/)
  await expect(commit({ updates: [{ id: kim.id, changes: { coachId: b.owner.id } }] })).rejects.toThrow(/coach/)
  await expect(
    commit({ creates: [person({ firstName: 'New' })], checkins: [{ memberId: other.id, at: T }] }),
  ).rejects.toThrow(/member/)
  await expect(
    repos.members.applyImport({
      gymId: a.id,
      at: T,
      plan: () => ({ ...nothing, checkins: [{ memberId: other.id, at: T }] }),
    }),
  ).rejects.toThrow(/member/)
  expect({ members: count(members), checkins: count(checkins) }).toEqual(before)
  // The gym's own coach is fine.
  expect((await commit({ creates: [person({ coachId: a.owner.id })] })).created).toHaveLength(1)
})

test('FR-IMPORT-08 a plan that throws writes nothing', async () => {
  const a = await gym()
  const before = count(members)
  await expect(
    repos.members.applyImport({
      gymId: a.id,
      at: T,
      plan: (snap) => {
        if (snap.members.length === 0) throw new Error('planner failed')
        return nothing
      },
    }),
  ).rejects.toThrow('planner failed')
  expect(count(members)).toBe(before)
})

test('FR-IMPORT-08 a check-in recorded just before the commit is in its snapshot', async () => {
  const a = await gym()
  const [kim] = await add(a.id, [person({ firstName: 'Kim' })])
  if (!kim) throw new Error('no member')
  await repos.checkins.recordAtKiosk({ gymId: a.id, memberId: kim.id, at: T, unlessSince: '2026-11-06T14:00:00.000Z' })
  let ats: string[] = []
  await repos.members.applyImport({
    gymId: a.id,
    at: T,
    plan: (snap) => {
      ats = snap.checkins().map((c) => c.at)
      return nothing
    },
  })
  expect(ats).toEqual([T])
})
