import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb } from '../client.ts'
import { createRepositories, type NewGymWithOwner, type Repositories } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'

let close: () => void
let repos: Repositories

beforeEach(() => {
  const opened = createDb(':memory:')
  close = opened.close
  repos = createRepositories(opened.db)
})

afterEach(() => close())

function signUp(gym: Partial<NewGymWithOwner['gym']> = {}) {
  return repos.gyms.createWithOwner({
    gym: { name: 'Lahore Lifts', slug: 'lahore-lifts', timezone: 'Asia/Karachi', pilotStartedOn: '2026-11-06', kioskToken: 'k1', ...gym },
    owner: { email: 'owner@example.com', name: 'Ayesha K.', passwordHash: 'scrypt$hash' },
    templates: [],
    createdAt: T,
  })
}

describe('gyms: the country', () => {
  test('FR-AUTH-01 sign-up stores the country it is given', async () => {
    const { gym } = await signUp({ country: 'PK' })
    expect(gym.country).toBe('PK')
    expect((await repos.gyms.findById(gym.id))?.country).toBe('PK')
  })

  test('FR-AUTH-01 a gym created without a country is a US gym, as every gym from before the country was', async () => {
    const { gym } = await signUp()
    expect(gym.country).toBe('US')
  })

  test('FR-GYM-01 settings change the country with the name and zone, and keep it when none is given', async () => {
    const { gym } = await signUp({ country: 'PK' })
    const moved = await repos.gyms.updateSettings(gym.id, { name: 'Leeds Lifts', timezone: 'Europe/London', country: 'GB' })
    expect(moved).toEqual({ ...gym, name: 'Leeds Lifts', timezone: 'Europe/London', country: 'GB' })
    const renamed = await repos.gyms.updateSettings(gym.id, { name: 'Leeds Strength', timezone: 'Europe/London' })
    expect(renamed).toEqual({ ...gym, name: 'Leeds Strength', timezone: 'Europe/London', country: 'GB' })
    expect(await repos.gyms.findById(gym.id)).toEqual(renamed)
    expect(await repos.gyms.updateSettings(gym.id + 1, { name: 'X', timezone: 'UTC', country: 'US' })).toBeUndefined()
  })
})
