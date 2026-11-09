import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb, type Db } from '../client.ts'
import { gyms, members, nudgeChannels, nudges, users, type NudgeChannel } from './index.ts'

const T = '2026-11-06T15:00:00.000Z'

let db: Db
let close: () => void
beforeEach(() => {
  ;({ db, close } = createDb(':memory:'))
})
afterEach(() => close())

function nudgeTargets() {
  const gymId = db.insert(gyms).values({ name: 'Northside', slug: 'northside', pilotStartedOn: '2026-10-14', kioskToken: 'kn', createdAt: T }).returning().get().id
  const userId = db.insert(users).values({ gymId, email: 'mike@example.com', name: 'Mike R.', role: 'owner', passwordHash: 'h', createdAt: T }).returning().get().id
  const memberId = db.insert(members).values({ gymId, firstName: 'Ana', joinedOn: '2026-10-14', source: 'seed', createdAt: T }).returning().get().id
  return { gymId, userId, memberId, templateId: null, body: 'Hi Ana', sentAt: T }
}

describe('the nudge channel', () => {
  test('FR-NUDGE-06 the channels are text, whatsapp, copy and in-person, plus own-phone for the nudges from before', () => {
    expect(nudgeChannels).toEqual(['text', 'whatsapp', 'copy', 'in-person', 'own-phone'])
  })

  test('FR-NUDGE-02 each channel is stored as given, and a nudge written without one is from before (own-phone)', () => {
    const base = nudgeTargets()
    const stored = nudgeChannels.map((channel: NudgeChannel) => db.insert(nudges).values({ ...base, channel }).returning().get().channel)
    expect(stored).toEqual(nudgeChannels)
    expect(db.insert(nudges).values(base).returning().get().channel).toBe('own-phone')
  })

  test('FR-NUDGE-02 a channel outside the list does not typecheck', () => {
    const base = nudgeTargets()
    // @ts-expect-error 'sms' is not a nudge channel. The column is plain text, so the type is what keeps it out.
    const write = () => db.insert(nudges).values({ ...base, channel: 'sms' })
    expect(typeof write).toBe('function')
  })
})
