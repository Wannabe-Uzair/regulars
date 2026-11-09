import { describe, expect, test } from 'vitest'
import { LIVE_EVENT_TYPES, LiveEvent } from './events.ts'

const scope = { gymId: 1, memberId: 12, coachId: 2 }
const examples = [
  { type: 'checkin.recorded', ...scope, name: 'Sam O.', at: '2026-11-06T13:30:00.000Z' },
  { type: 'member.joined', ...scope, coachId: null },
  { type: 'member.updated', ...scope },
  { type: 'member.deleted', ...scope },
  { type: 'nudge.recorded', ...scope },
  { type: 'import.committed', gymId: 1 },
  { type: 'staff.updated', gymId: 1 },
  { type: 'settings.updated', gymId: 1 },
]

describe('LiveEvent', () => {
  test('FR-LIVE-01 has an event for every write: check-ins, joins, member edits and deletes, nudges, imports, staff and settings', () => {
    expect(LIVE_EVENT_TYPES).toEqual([
      'checkin.recorded',
      'member.joined',
      'member.updated',
      'member.deleted',
      'nudge.recorded',
      'import.committed',
      'staff.updated',
      'settings.updated',
    ])
    expect(examples.map((e) => e.type)).toEqual([...LIVE_EVENT_TYPES])
  })

  test.each(examples)('accepts $type', (event) => {
    expect(LiveEvent.parse(event)).toEqual(event)
  })

  test.each([
    ['an old event name', { type: 'checkin', memberId: 12, name: 'Sam O.', at: '2026-11-06T13:30:00.000Z' }],
    ['a check-in without the name', { type: 'checkin.recorded', ...scope, at: '2026-11-06T13:30:00.000Z' }],
    ['an event without its gym', { type: 'nudge.recorded', memberId: 12, coachId: 2 }],
    ['an event without the coach', { type: 'member.updated', gymId: 1, memberId: 12 }],
    ['a deleted member without the coach', { type: 'member.deleted', gymId: 1, memberId: 12 }],
    ['a gym-wide event without its gym', { type: 'settings.updated' }],
  ])('rejects %s', (_, event) => {
    expect(LiveEvent.safeParse(event).success).toBe(false)
  })
})
