import { afterEach, beforeEach, expect, test } from 'vitest'
import { createDb } from '../client.ts'
import { createRepositories, type Repositories } from './index.ts'

let close: () => void
let repos: Repositories

beforeEach(() => {
  const opened = createDb(':memory:')
  close = opened.close
  repos = createRepositories(opened.db)
})

afterEach(() => close())

const signUp = (email: string, slug: string) =>
  repos.gyms.createWithOwner({
    gym: { name: 'Leeds Lifts', slug, timezone: 'Europe/London', country: 'GB', pilotStartedOn: '2026-11-06', kioskToken: slug },
    owner: { email, name: 'Ayesha K.', passwordHash: 'scrypt$hash' },
    templates: [],
    createdAt: '2026-11-06T15:00:00.000Z',
  })

test('FR-GYM-01 settings write only the fields given, so saves of different fields keep each other', async () => {
  const { gym } = await signUp('a@example.com', 'leeds')
  const { gym: other } = await signUp('b@example.com', 'york')
  const renamed = await repos.gyms.updateSettings(gym.id, { name: 'Leeds Strength' })
  expect(renamed).toEqual({ ...gym, name: 'Leeds Strength' })
  const moved = await repos.gyms.updateSettings(gym.id, { timezone: 'Asia/Karachi', country: 'PK' })
  expect(moved).toEqual({ ...gym, name: 'Leeds Strength', timezone: 'Asia/Karachi', country: 'PK' })
  expect(await repos.gyms.findById(gym.id)).toEqual(moved)
  // Nothing given changes nothing, and still answers the gym.
  expect(await repos.gyms.updateSettings(gym.id, {})).toEqual(moved)
  expect(await repos.gyms.updateSettings(gym.id, { name: undefined })).toEqual(moved)
  // Another gym is untouched; no gym is undefined.
  expect(await repos.gyms.findById(other.id)).toEqual(other)
  expect(await repos.gyms.updateSettings(other.id + 1, { name: 'X' })).toBeUndefined()
  expect(await repos.gyms.updateSettings(other.id + 1, {})).toBeUndefined()
})
