// The members repository as the kiosk uses it: the name list, the phone lookup and the join (API-KIOSK).
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { checkins, members } from '../schema/index.ts'
import { createRepositories, DuplicateError, type ImportedMember, type Repositories } from './index.ts'

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
async function newGym() {
  gyms++
  const { gym } = await repos.gyms.createWithOwner({
    gym: { name: 'Northside', slug: 'northside', timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: `k${gyms}` },
    owner: { email: `owner${gyms}@example.com`, name: 'Mike Ross', passwordHash: 'h' },
    templates: [],
    createdAt: T,
  })
  return gym
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

async function addMembers(gymId: number, list: ImportedMember[]) {
  return (await repos.members.applyImport({ gymId, at: T, creates: list, updates: [], checkins: [] })).created
}

/** Archive a member as the members module does: set archivedAt. */
const archive = (id: number) => db.update(members).set({ archivedAt: T }).where(eq(members.id, id)).run()

const rows = () => ({ members: db.select().from(members).all(), checkins: db.select().from(checkins).all() })

test('FR-KIOSK-02 the name list leaves archived members out and keeps its order', async () => {
  const gym = await newGym()
  const [zoe, annZ, annNone, gone] = await addMembers(gym.id, [
    person({ firstName: 'Zoe', lastName: 'Ames' }),
    person({ firstName: 'Ann', lastName: 'Zed' }),
    person({ firstName: 'Ann', lastName: null }),
    person({ firstName: 'Ann', lastName: 'Bell' }),
  ])
  if (!zoe || !annZ || !annNone || !gone) throw new Error('no members')
  archive(gone.id)
  expect((await repos.members.listByName(gym.id)).map((m) => m.id)).toEqual([annNone.id, annZ.id, zoe.id])
})

test("FR-KIOSK-06 the phone lookup finds an archived member, in the member's gym only", async () => {
  const gym = await newGym()
  const other = await newGym()
  const [dave] = await addMembers(gym.id, [person({ firstName: 'Dave', phone: '+13125550101' })])
  if (!dave) throw new Error('no member')
  archive(dave.id)
  expect(await repos.members.findByPhone(gym.id, '+13125550101')).toEqual({ ...dave, archivedAt: T })
  expect(await repos.members.findByPhone(other.id, '+13125550101')).toBeUndefined()
})

test("FR-KIOSK-06 a join with an archived member's phone throws DuplicateError('phone') and writes nothing", async () => {
  const gym = await newGym()
  const [dave] = await addMembers(gym.id, [person({ firstName: 'Dave', phone: '+13125550101' })])
  if (!dave) throw new Error('no member')
  archive(dave.id)
  const before = rows()
  const err = await repos.members
    .joinAtKiosk({ gymId: gym.id, firstName: 'Dave', lastName: 'Kim', phone: '+13125550101', joinedOn: '2026-11-06', at: T })
    .then(
      () => undefined,
      (e: unknown) => e,
    )
  expect(err).toBeInstanceOf(DuplicateError)
  expect(err).toMatchObject({ field: 'phone' })
  expect(rows()).toEqual(before)
})
