import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { nudges } from '../schema/index.ts'
import { createRepositories, type Repositories, type Scope } from './index.ts'

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
    gym: { name: 'Northside', slug: `northside-${gyms}`, timezone: 'America/Chicago', pilotStartedOn: '2026-11-06', kioskToken: `k${gyms}` },
    owner: { email: `owner${gyms}@example.com`, name: 'Mike Ross', passwordHash: 'h' },
    templates: [{ name: 'Missed you', body: 'Hey {first}' }],
    createdAt: T,
  })
  const email = `ana${gyms}@example.com`
  await repos.invites.create({ tokenHash: email, gymId: gym.id, name: 'Ana', createdBy: owner.id, createdAt: T })
  const ana = await repos.invites.accept({ tokenHash: email, liveSince: WEEK_AGO, acceptedAt: T, user: { email, name: 'Ana', passwordHash: 'h' } })
  if (!ana) throw new Error('invite was not live')
  const person = { lastName: 'Ortiz', email: null, joinedOn: '2026-11-01', externalId: null }
  const { created } = await repos.members.applyImport({
    gymId: gym.id,
    at: T,
    creates: [
      { ...person, firstName: 'Sam', phone: '+13125550042', coachId: owner.id },
      { ...person, firstName: 'Hana', phone: null, coachId: ana.id },
    ],
    updates: [],
    checkins: [],
  })
  const [sam, hana] = created
  if (!sam || !hana) throw new Error('no members')
  const [template] = await repos.templates.list(gym.id)
  if (!template) throw new Error('no template')
  const owners: Scope = { gymId: gym.id }
  const anas: Scope = { gymId: gym.id, coachId: ana.id }
  return { gym, owner, ana, sam, hana, template, owners, anas }
}

const stored = () => db.select().from(nudges).all()

describe('recordInScope', () => {
  test('FR-NUDGE-02 records the nudge with its channel, and answers the member\'s coach and phone', async () => {
    const { gym, owner, sam, template, owners } = await gymWithStaff()
    const result = await repos.nudges.recordInScope(owners, {
      memberId: sam.id,
      userId: owner.id,
      templateId: template.id,
      body: 'Hey Sam',
      channel: 'whatsapp',
      sentAt: T,
    })
    expect(result).toEqual({
      nudge: { id: expect.any(Number), gymId: gym.id, memberId: sam.id, userId: owner.id, templateId: template.id, body: 'Hey Sam', channel: 'whatsapp', sentAt: T },
      member: { coachId: owner.id, phone: '+13125550042' },
    })
    expect(stored()).toHaveLength(1)
  })

  test.each(['text', 'whatsapp', 'copy', 'in-person'] as const)('FR-NUDGE-02 stores the channel %s as given', async (channel) => {
    const { owner, hana, owners } = await gymWithStaff()
    await repos.nudges.recordInScope(owners, { memberId: hana.id, userId: owner.id, templateId: null, body: 'Hi', channel, sentAt: T })
    expect(stored().map((n) => n.channel)).toEqual([channel])
  })

  test("FR-PRIV-02 another gym's member is missing, and nothing is written", async () => {
    const { owner, owners } = await gymWithStaff()
    const other = await gymWithStaff()
    const result = await repos.nudges.recordInScope(owners, { memberId: other.sam.id, userId: owner.id, templateId: null, body: 'Hi', channel: 'text', sentAt: T })
    expect(result).toEqual({ missing: 'member' })
    expect(stored()).toEqual([])
  })

  test("FR-STAFF-07 another coach's member is missing for a coach, and nothing is written", async () => {
    const { ana, sam, hana, anas } = await gymWithStaff()
    const result = await repos.nudges.recordInScope(anas, { memberId: sam.id, userId: ana.id, templateId: null, body: 'Hi', channel: 'text', sentAt: T })
    expect(result).toEqual({ missing: 'member' })
    expect(stored()).toEqual([])
    const own = await repos.nudges.recordInScope(anas, { memberId: hana.id, userId: ana.id, templateId: null, body: 'Hi', channel: 'in-person', sentAt: T })
    expect(own).toMatchObject({ member: { coachId: ana.id, phone: null } })
  })

  test("FR-NUDGE-08 another gym's template, or one that isn't there, is missing, and nothing is written", async () => {
    const { owner, sam, owners } = await gymWithStaff()
    const other = await gymWithStaff()
    for (const templateId of [other.template.id, 9999]) {
      const result = await repos.nudges.recordInScope(owners, { memberId: sam.id, userId: owner.id, templateId, body: 'Hi', channel: 'text', sentAt: T })
      expect(result).toEqual({ missing: 'template' })
    }
    expect(stored()).toEqual([])
  })
})

describe('record', () => {
  test('FR-NUDGE-06 a nudge written without a channel is one from before the first version (own-phone)', async () => {
    const { gym, owner, sam } = await gymWithStaff()
    const old = await repos.nudges.record({ gymId: gym.id, memberId: sam.id, userId: owner.id, templateId: null, body: 'Hi', sentAt: T })
    const now = await repos.nudges.record({ gymId: gym.id, memberId: sam.id, userId: owner.id, templateId: null, body: 'Hi', channel: 'copy', sentAt: T })
    expect([old.channel, now.channel]).toEqual(['own-phone', 'copy'])
  })
})
