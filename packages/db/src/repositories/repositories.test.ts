import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { gyms, templates, users } from '../schema/index.ts'
import { createRepositories, DuplicateError, type NewGymWithOwner, type Repositories } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'
const LATER = '2026-11-07T15:00:00.000Z'
const DEFAULT_TEMPLATES = [
  { name: 'We missed you', body: 'Hey {first}, we missed you.' },
  { name: 'First weeks', body: 'Hi {first}, how are your first weeks going?' },
  { name: 'One visit', body: 'Hi {first}, one visit this week is a good restart.' },
]

let db: Db
let close: () => void
let repos: Repositories

beforeEach(() => {
  ;({ db, close } = createDb(':memory:'))
  repos = createRepositories(db)
})

afterEach(() => close())

let signups = 0
/** A sign-up with distinct email and kiosk token unless the test overrides them. */
function signUp(over: { gym?: Partial<NewGymWithOwner['gym']>; owner?: Partial<NewGymWithOwner['owner']> } = {}) {
  signups++
  return repos.gyms.createWithOwner({
    gym: {
      name: 'Northside Strength',
      slug: 'northside-strength',
      timezone: 'America/Chicago',
      pilotStartedOn: '2026-11-06',
      kioskToken: `kiosk-${signups}`,
      ...over.gym,
    },
    owner: { email: `owner${signups}@example.com`, name: 'Mike Ross', passwordHash: 'scrypt$hash', ...over.owner },
    templates: DEFAULT_TEMPLATES,
    createdAt: T,
  })
}

/** A coach in the owner's gym, created the way the app creates one: through an accepted invite. */
async function addCoach(gymId: number, ownerId: number, name: string, email: string) {
  const tokenHash = `invite-${email}`
  await repos.invites.create({ tokenHash, gymId, name, createdBy: ownerId, createdAt: T })
  const coach = await repos.invites.accept({
    tokenHash,
    liveSince: '2026-10-30T15:00:00.000Z',
    acceptedAt: T,
    user: { email, name, passwordHash: 'scrypt$coach' },
  })
  if (!coach) throw new Error('invite was not live')
  return coach
}

/** The error a promise rejects with. */
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
  expect(err).toMatchObject({ name: 'DuplicateError', field })
  expect((err as Error).cause).toBeInstanceOf(Error)
}

const counts = () => ({
  gyms: db.select({ id: gyms.id }).from(gyms).all().length,
  users: db.select({ id: users.id }).from(users).all().length,
  templates: db.select({ id: templates.id }).from(templates).all().length,
})

describe('gyms', () => {
  test('sign-up creates a pilot gym, its active owner and its templates in order', async () => {
    const { gym, owner } = await signUp()
    expect(gym).toEqual({
      id: gym.id,
      name: 'Northside Strength',
      slug: 'northside-strength',
      timezone: 'America/Chicago',
      country: 'US',
      isDemo: false,
      pilotStartedOn: '2026-11-06',
      plan: 'pilot',
      kioskToken: 'kiosk-1',
      createdAt: T,
    })
    expect(owner).toEqual({
      id: owner.id,
      gymId: gym.id,
      email: 'owner1@example.com',
      name: 'Mike Ross',
      role: 'owner',
      passwordHash: 'scrypt$hash',
      active: true,
      createdAt: T,
    })
    const rows = db.select().from(templates).all()
    expect(rows.map(({ gymId, name, body, sort, updatedAt }) => ({ gymId, name, body, sort, updatedAt }))).toEqual(
      DEFAULT_TEMPLATES.map((t, i) => ({ gymId: gym.id, ...t, sort: i + 1, updatedAt: T })),
    )
  })

  test('sign-up gives a taken slug the next free number', async () => {
    const slugs = []
    for (let i = 0; i < 3; i++) slugs.push((await signUp()).gym.slug)
    expect(slugs).toEqual(['northside-strength', 'northside-strength-2', 'northside-strength-3'])
  })

  test('sign-up with an email already in use, in any case, throws DuplicateError and leaves nothing behind', async () => {
    await signUp({ owner: { email: 'mike@example.com' } })
    const before = counts()
    await expectDuplicate(signUp({ gym: { slug: 'other' }, owner: { email: 'MIKE@Example.com' } }), 'email')
    expect(counts()).toEqual(before)
  })

  test('sign-up with a kiosk token already in use throws DuplicateError and leaves nothing behind', async () => {
    await signUp({ gym: { kioskToken: 'same' } })
    const before = counts()
    await expectDuplicate(signUp({ gym: { kioskToken: 'same' } }), 'kioskToken')
    expect(counts()).toEqual(before)
  })

  test('finds a gym by id and by kiosk token', async () => {
    const { gym } = await signUp({ gym: { kioskToken: 'k-north' } })
    expect(await repos.gyms.findById(gym.id)).toEqual(gym)
    expect(await repos.gyms.findById(gym.id + 1)).toBeUndefined()
    expect(await repos.gyms.findByKioskToken('k-north')).toEqual(gym)
    expect(await repos.gyms.findByKioskToken('k-nope')).toBeUndefined()
  })

  test('the default gym is the demo gym if there is one, else the oldest', async () => {
    expect(await repos.gyms.findDefault()).toBeUndefined()
    const { gym: first } = await signUp()
    await signUp()
    expect(await repos.gyms.findDefault()).toEqual(first)
    const demo = db
      .insert(gyms)
      .values({ name: 'Demo', slug: 'demo', isDemo: true, pilotStartedOn: '2026-11-06', kioskToken: 'k-demo', createdAt: T })
      .returning()
      .get()
    expect(await repos.gyms.findDefault()).toEqual(demo)
  })

  test('updates the name and time zone', async () => {
    const { gym } = await signUp()
    const updated = await repos.gyms.updateSettings(gym.id, { name: 'Northside', timezone: 'America/New_York' })
    expect(updated).toEqual({ ...gym, name: 'Northside', timezone: 'America/New_York' })
    expect(await repos.gyms.findById(gym.id)).toEqual(updated)
    expect(await repos.gyms.updateSettings(gym.id + 1, { name: 'X', timezone: 'UTC' })).toBeUndefined()
  })
})

describe('users', () => {
  test('finds a user by id, and by email ignoring case, active or not', async () => {
    const { gym, owner } = await signUp({ owner: { email: 'Mike@Example.com' } })
    expect(await repos.users.findById(owner.id)).toEqual(owner)
    expect(await repos.users.findById(owner.id + 1)).toBeUndefined()
    expect(await repos.users.findByEmail('mike@example.COM')).toEqual(owner)
    expect(await repos.users.findByEmail('nobody@example.com')).toBeUndefined()
    await repos.users.setActive(gym.id, owner.id, false)
    expect(await repos.users.findByEmail('MIKE@example.com')).toEqual({ ...owner, active: false })
  })

  test("finds a user only within their own gym", async () => {
    const north = await signUp()
    const south = await signUp()
    expect(await repos.users.findInGym(north.gym.id, north.owner.id)).toEqual(north.owner)
    expect(await repos.users.findInGym(south.gym.id, north.owner.id)).toBeUndefined()
  })

  test("lists the gym's staff, active or not: owners first, then by name, then by id", async () => {
    const { gym, owner } = await signUp({ owner: { name: 'Zed Owner' } })
    const bo2 = await addCoach(gym.id, owner.id, 'Bo', 'bo2@example.com')
    const ana = await addCoach(gym.id, owner.id, 'Ana', 'ana@example.com')
    const bo1 = await addCoach(gym.id, owner.id, 'Bo', 'bo1@example.com')
    await repos.users.setActive(gym.id, ana.id, false)
    await signUp() // another gym's owner stays out of the list
    const list = await repos.users.listByGym(gym.id)
    expect(list.map((u) => u.id)).toEqual([owner.id, ana.id, bo2.id, bo1.id])
    expect(list[1]).toEqual({ ...ana, active: false })
  })

  test("lists the gym's active staff by id", async () => {
    const { gym, owner } = await signUp()
    const zoe = await addCoach(gym.id, owner.id, 'Zoe', 'zoe@example.com')
    const ana = await addCoach(gym.id, owner.id, 'Ana', 'ana@example.com')
    const cy = await addCoach(gym.id, owner.id, 'Cy', 'cy@example.com')
    await repos.users.setActive(gym.id, ana.id, false)
    await signUp()
    expect((await repos.users.listActiveByGym(gym.id)).map((u) => u.id)).toEqual([owner.id, zoe.id, cy.id])
  })

  test('turning a user off ends their sessions only; turning them on again leaves sessions alone', async () => {
    const { gym, owner } = await signUp()
    const coach = await addCoach(gym.id, owner.id, 'Priya', 'priya@example.com')
    await repos.sessions.create({ tokenHash: 's-coach', userId: coach.id, createdAt: T, expiresAt: LATER })
    await repos.sessions.create({ tokenHash: 's-owner', userId: owner.id, createdAt: T, expiresAt: LATER })

    expect(await repos.users.setActive(gym.id, coach.id, false)).toEqual({ ...coach, active: false })
    await repos.users.setActive(gym.id, coach.id, true)
    expect(await repos.users.findById(coach.id)).toEqual(coach)
    expect(await repos.sessions.findLive('s-coach', T)).toBeUndefined()
    expect(await repos.sessions.findLive('s-owner', T)).toBeDefined()

    await repos.sessions.create({ tokenHash: 's-coach-2', userId: coach.id, createdAt: T, expiresAt: LATER })
    await repos.users.setActive(gym.id, coach.id, true)
    expect(await repos.sessions.findLive('s-coach-2', T)).toBeDefined()
  })

  test("refuses to change a user of another gym", async () => {
    const north = await signUp()
    const south = await signUp()
    expect(await repos.users.setActive(south.gym.id, north.owner.id, false)).toBeUndefined()
    expect(await repos.users.findById(north.owner.id)).toEqual(north.owner)
  })
})

describe('sessions', () => {
  test('a live session comes back with its user and gym', async () => {
    const { gym, owner } = await signUp()
    const session = { tokenHash: 'h1', userId: owner.id, createdAt: T, expiresAt: LATER }
    expect(await repos.sessions.create(session)).toEqual(session)
    expect(await repos.sessions.findLive('h1', T)).toEqual({ session, user: owner, gym })
    expect(await repos.sessions.findLive('h-unknown', T)).toBeUndefined()
  })

  test('refuses a session that has expired, and deletes it', async () => {
    const { owner } = await signUp()
    await repos.sessions.create({ tokenHash: 'h1', userId: owner.id, createdAt: T, expiresAt: LATER })
    expect(await repos.sessions.findLive('h1', '2026-11-07T14:59:59.999Z')).toBeDefined()
    expect(await repos.sessions.findLive('h1', LATER)).toBeUndefined()
    expect(await repos.sessions.findLive('h1', T)).toBeUndefined()
  })

  test("refuses a deactivated user's session without deleting it", async () => {
    const { gym, owner } = await signUp()
    const coach = await addCoach(gym.id, owner.id, 'Priya', 'priya@example.com')
    db.update(users).set({ active: false }).where(eq(users.id, coach.id)).run() // switched off without the session clean-up setActive does
    await repos.sessions.create({ tokenHash: 'h1', userId: coach.id, createdAt: T, expiresAt: LATER })
    expect(await repos.sessions.findLive('h1', T)).toBeUndefined()
    await repos.users.setActive(gym.id, coach.id, true)
    expect(await repos.sessions.findLive('h1', T)).toMatchObject({ user: { id: coach.id, active: true } })
  })

  test('signing out deletes the session', async () => {
    const { owner } = await signUp()
    await repos.sessions.create({ tokenHash: 'h1', userId: owner.id, createdAt: T, expiresAt: LATER })
    await repos.sessions.delete('h1')
    await repos.sessions.delete('h1')
    expect(await repos.sessions.findLive('h1', T)).toBeUndefined()
  })

  test('a token hash already in use throws DuplicateError', async () => {
    const { owner } = await signUp()
    await repos.sessions.create({ tokenHash: 'h1', userId: owner.id, createdAt: T, expiresAt: LATER })
    await expectDuplicate(repos.sessions.create({ tokenHash: 'h1', userId: owner.id, createdAt: T, expiresAt: LATER }), 'tokenHash')
  })
})

describe('invites', () => {
  const WEEK_AGO = '2026-10-30T15:00:00.000Z'

  async function invite(createdAt = T) {
    const { gym, owner } = await signUp()
    const created = await repos.invites.create({ tokenHash: 'i1', gymId: gym.id, name: 'Sam', createdBy: owner.id, createdAt })
    return { gym, owner, created }
  }

  test('creates a coach invite, unused', async () => {
    const { gym, owner, created } = await invite()
    expect(created).toEqual({ tokenHash: 'i1', gymId: gym.id, role: 'coach', name: 'Sam', createdBy: owner.id, createdAt: T, usedAt: null })
  })

  test('a token hash already in use throws DuplicateError', async () => {
    const { gym, owner } = await invite()
    await expectDuplicate(repos.invites.create({ tokenHash: 'i1', gymId: gym.id, name: 'Kim', createdBy: owner.id, createdAt: T }), 'tokenHash')
  })

  test('finds an invite only while it is unused and created after the cut-off', async () => {
    const { created } = await invite(T)
    expect(await repos.invites.findLive('i1', WEEK_AGO)).toEqual(created)
    expect(await repos.invites.findLive('i1', '2026-11-06T14:59:59.999Z')).toEqual(created)
    expect(await repos.invites.findLive('i1', T)).toBeUndefined()
    expect(await repos.invites.findLive('i-unknown', WEEK_AGO)).toBeUndefined()
    await repos.invites.accept({ tokenHash: 'i1', liveSince: WEEK_AGO, acceptedAt: LATER, user: { email: 'sam@example.com', name: 'Sam', passwordHash: 'h' } })
    expect(await repos.invites.findLive('i1', WEEK_AGO)).toBeUndefined()
  })

  test("accepting creates an active user with the invite's gym and role, and uses the invite up", async () => {
    const { gym } = await invite()
    const user = await repos.invites.accept({
      tokenHash: 'i1',
      liveSince: WEEK_AGO,
      acceptedAt: LATER,
      user: { email: 'sam@example.com', name: 'Sam Lee', passwordHash: 'scrypt$sam' },
    })
    expect(user).toEqual({
      id: user?.id,
      gymId: gym.id,
      email: 'sam@example.com',
      name: 'Sam Lee',
      role: 'coach',
      passwordHash: 'scrypt$sam',
      active: true,
      createdAt: LATER,
    })
    const again = await repos.invites.accept({ tokenHash: 'i1', liveSince: WEEK_AGO, acceptedAt: LATER, user: { email: 'sam2@example.com', name: 'Sam', passwordHash: 'h' } })
    expect(again).toBeUndefined()
    expect(await repos.users.findByEmail('sam2@example.com')).toBeUndefined()
  })

  test('accepting an expired or unknown invite writes nothing', async () => {
    await invite(T)
    const before = counts()
    const user = { email: 'sam@example.com', name: 'Sam', passwordHash: 'h' }
    expect(await repos.invites.accept({ tokenHash: 'i1', liveSince: T, acceptedAt: LATER, user })).toBeUndefined()
    expect(await repos.invites.accept({ tokenHash: 'i-unknown', liveSince: WEEK_AGO, acceptedAt: LATER, user })).toBeUndefined()
    expect(counts()).toEqual(before)
    expect(await repos.invites.findLive('i1', WEEK_AGO)).toMatchObject({ usedAt: null })
  })

  test('accepting with an email already in use throws DuplicateError and leaves the invite unused', async () => {
    const { owner } = await invite()
    const before = counts()
    const accept = repos.invites.accept({
      tokenHash: 'i1',
      liveSince: WEEK_AGO,
      acceptedAt: LATER,
      user: { email: owner.email.toUpperCase(), name: 'Sam', passwordHash: 'h' },
    })
    await expectDuplicate(accept, 'email')
    expect(counts()).toEqual(before)
    expect(await repos.invites.findLive('i1', WEEK_AGO)).toMatchObject({ usedAt: null })
  })
})
