// The kiosk's check-in write (API-KIOSK): the same-gym and archived checks inside its transaction.
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { members } from '../schema/index.ts'
import { createRepositories, type Repositories } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'
const HOUR_AGO = '2026-11-06T14:00:00.000Z'

let db: Db
let close: () => void
let repos: Repositories

beforeEach(() => {
  ;({ db, close } = createDb(':memory:'))
  repos = createRepositories(db)
})
afterEach(() => close())

let gyms = 0
async function gymWithMember(firstName: string) {
  gyms++
  const { gym } = await repos.gyms.createWithOwner({
    gym: { name: 'Gym', slug: 'gym', timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: `k${gyms}` },
    owner: { email: `owner${gyms}@example.com`, name: 'Owner', passwordHash: 'h' },
    templates: [],
    createdAt: T,
  })
  const { created } = await repos.members.applyImport({
    gymId: gym.id,
    at: T,
    creates: [{ firstName, lastName: null, phone: null, email: null, joinedOn: '2026-11-01', coachId: null, externalId: null }],
    updates: [],
    checkins: [],
  })
  const member = created[0]
  if (!member) throw new Error('no member')
  return { gym, member }
}

const setArchived = (id: number, archivedAt: string | null) =>
  db.update(members).set({ archivedAt }).where(eq(members.id, id)).run()

test("FR-PRIV-02 a kiosk check-in of another gym's member stores nothing", async () => {
  const mine = await gymWithMember('Sam')
  const theirs = await gymWithMember('Zed')
  const visit = { gymId: mine.gym.id, memberId: theirs.member.id, at: T, unlessSince: HOUR_AGO }
  expect(await repos.checkins.recordAtKiosk(visit)).toBeUndefined()
  expect(await repos.checkins.listByGym(mine.gym.id)).toEqual([])
  expect(await repos.checkins.listByGym(theirs.gym.id)).toEqual([])
})

test('FR-KIOSK-06 a kiosk check-in of an archived member stores nothing, and a restored one checks in', async () => {
  const { gym, member } = await gymWithMember('Dave')
  setArchived(member.id, HOUR_AGO)
  const visit = () => repos.checkins.recordAtKiosk({ gymId: gym.id, memberId: member.id, at: T, unlessSince: HOUR_AGO })
  expect(await visit()).toBeUndefined()
  expect(await repos.checkins.listByGym(gym.id)).toEqual([])
  setArchived(member.id, null)
  expect(await visit()).toMatchObject({ gymId: gym.id, memberId: member.id, at: T, source: 'kiosk' })
})
