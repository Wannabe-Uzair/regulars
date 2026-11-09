// users.setActiveKeepingAnOwner: the staff list's deactivate and reactivate, which never leave a gym with no active
// owner.
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb } from '../client.ts'
import type { UserRole } from '../schema/index.ts'
import { createRepositories, type Repositories } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'
const LATER = '2026-11-07T15:00:00.000Z'

let close: () => void
let repos: Repositories

beforeEach(() => {
  const opened = createDb(':memory:')
  close = opened.close
  repos = createRepositories(opened.db)
})

afterEach(() => close())

let n = 0
async function makeGym() {
  n++
  const { gym, owner } = await repos.gyms.createWithOwner({
    gym: { name: `Gym ${n}`, slug: `gym-${n}`, timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: `k${n}` },
    owner: { email: `owner${n}@example.com`, name: 'Mike R.', passwordHash: 'h' },
    templates: [],
    createdAt: T,
  })
  const add = async (role: UserRole, email: string) => {
    await repos.invites.create({ tokenHash: email, gymId: gym.id, role, name: email, createdBy: owner.id, createdAt: T })
    const user = await repos.invites.accept({ tokenHash: email, liveSince: '1970-01-01T00:00:00.000Z', acceptedAt: T, user: { email, name: email, passwordHash: 'h' } })
    if (!user) throw new Error(`could not add ${email}`)
    return user
  }
  return { gym, owner, add }
}

describe('users.setActiveKeepingAnOwner', () => {
  test('FR-STAFF-05 turns a coach off, ending their sessions, and back on', async () => {
    const { gym, add } = await makeGym()
    const coach = await add('coach', 'coach@example.com')
    await repos.sessions.create({ tokenHash: 's1', userId: coach.id, createdAt: T, expiresAt: LATER })
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, coach.id, false)).toEqual({ ...coach, active: false })
    expect(await repos.sessions.findLive('s1', T)).toBeUndefined()
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, coach.id, true)).toEqual(coach)
  })

  test("FR-STAFF-05 refuses the gym's last active owner and writes nothing", async () => {
    const { gym, owner, add } = await makeGym()
    await repos.sessions.create({ tokenHash: 's1', userId: owner.id, createdAt: T, expiresAt: LATER })
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, owner.id, false)).toBe('lastOwner')
    expect(await repos.users.findById(owner.id)).toEqual(owner)
    expect(await repos.sessions.findLive('s1', T)).toBeDefined()

    // An inactive co-owner doesn't count as the other owner.
    const co = await add('owner', 'co@example.com')
    await repos.users.setActiveKeepingAnOwner(gym.id, co.id, false)
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, owner.id, false)).toBe('lastOwner')
    // Turning the last owner "on", or an inactive owner off again, is no refusal.
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, owner.id, true)).toEqual(owner)
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, co.id, false)).toEqual({ ...co, active: false })
  })

  test('FR-STAFF-05 with two active owners either may be turned off, and then the other is the last', async () => {
    const { gym, owner, add } = await makeGym()
    const co = await add('owner', 'co@example.com')
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, owner.id, false)).toEqual({ ...owner, active: false })
    expect(await repos.users.setActiveKeepingAnOwner(gym.id, co.id, false)).toBe('lastOwner')
  })

  test('FR-STAFF-05 two owners turning each other off at once leave one active', async () => {
    const { gym, owner, add } = await makeGym()
    const co = await add('owner', 'co@example.com')
    const results = await Promise.all([
      repos.users.setActiveKeepingAnOwner(gym.id, owner.id, false),
      repos.users.setActiveKeepingAnOwner(gym.id, co.id, false),
    ])
    expect(results.filter((r) => r === 'lastOwner')).toHaveLength(1)
    expect((await repos.users.listActiveByGym(gym.id)).filter((u) => u.role === 'owner')).toHaveLength(1)
  })

  test('FR-PRIV-02 another gym\'s user is not found, and is left alone', async () => {
    const north = await makeGym()
    const south = await makeGym()
    expect(await repos.users.setActiveKeepingAnOwner(south.gym.id, north.owner.id, false)).toBeUndefined()
    expect(await repos.users.findById(north.owner.id)).toEqual(north.owner)
  })
})
