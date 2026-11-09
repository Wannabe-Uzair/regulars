import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb } from '../client.ts'
import { createRepositories, type Repositories } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'
const WEEK_AGO = '2026-10-30T15:00:00.000Z'

let close: () => void
let repos: Repositories

beforeEach(() => {
  const opened = createDb(':memory:')
  close = opened.close
  repos = createRepositories(opened.db)
})

afterEach(() => close())

async function gymWithOwner() {
  return repos.gyms.createWithOwner({
    gym: { name: 'Northside', slug: 'northside', timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: 'k1' },
    owner: { email: 'mike@example.com', name: 'Mike R.', passwordHash: 'scrypt$hash' },
    templates: [],
    createdAt: T,
  })
}

const accept = (tokenHash: string, email: string) =>
  repos.invites.accept({ tokenHash, liveSince: WEEK_AGO, acceptedAt: T, user: { email, name: 'New Person', passwordHash: 'h' } })

describe('invites: the role', () => {
  test('FR-STAFF-03 an invite is for a coach unless it says owner', async () => {
    const { gym, owner } = await gymWithOwner()
    const base = { gymId: gym.id, name: 'Sam', createdBy: owner.id, createdAt: T }
    expect((await repos.invites.create({ ...base, tokenHash: 'i-plain' })).role).toBe('coach')
    expect((await repos.invites.create({ ...base, tokenHash: 'i-coach', role: 'coach' })).role).toBe('coach')
    const ownerInvite = await repos.invites.create({ ...base, tokenHash: 'i-owner', role: 'owner' })
    expect(ownerInvite).toEqual({ ...base, tokenHash: 'i-owner', role: 'owner', usedAt: null })
    expect(await repos.invites.findLive('i-owner', WEEK_AGO)).toEqual(ownerInvite)
  })

  test('FR-STAFF-04 accepting an owner invite makes an owner of the gym; a coach invite, a coach', async () => {
    const { gym, owner } = await gymWithOwner()
    const base = { gymId: gym.id, name: 'Sam', createdBy: owner.id, createdAt: T }
    await repos.invites.create({ ...base, tokenHash: 'i-owner', role: 'owner' })
    await repos.invites.create({ ...base, tokenHash: 'i-coach' })
    expect(await accept('i-owner', 'co-owner@example.com')).toMatchObject({ gymId: gym.id, role: 'owner', active: true })
    expect(await accept('i-coach', 'coach@example.com')).toMatchObject({ gymId: gym.id, role: 'coach', active: true })
  })
})
