import type { Actor, LiveEvent } from '@tenure/contracts'
import { describe, expect, test } from 'vitest'
import { inScope } from './scope.ts'

const person = (id: number, role: Actor['role'], gymId = 1): Actor => ({
  id,
  gymId,
  role,
  name: 'A',
  email: 'a@x.test',
})
const owner = person(1, 'owner')
const coach = person(2, 'coach')
const coach2 = person(3, 'coach')
const elsewhere = person(4, 'owner', 2)

const who = (event: LiveEvent) => [owner, coach, coach2, elsewhere].filter((a) => inScope(a, event)).map((a) => a.id)

describe('inScope', () => {
  test("FR-LIVE-02 a member's events reach the owners and that member's coach only", () => {
    for (const type of ['member.joined', 'member.updated', 'member.deleted', 'nudge.recorded'] as const)
      expect(who({ type, gymId: 1, memberId: 9, coachId: 2 })).toEqual([1, 2])
    expect(
      who({
        type: 'checkin.recorded',
        gymId: 1,
        memberId: 9,
        coachId: 3,
        name: 'Sam O.',
        at: '2026-11-07T08:00:00.000Z',
      }),
    ).toEqual([1, 3])
    expect(who({ type: 'member.updated', gymId: 1, memberId: 9, coachId: null })).toEqual([1])
  })

  test('FR-LIVE-01 gym-wide events (an import, a staff or settings change) reach everyone in the gym, and nobody else', () => {
    for (const type of ['import.committed', 'staff.updated', 'settings.updated'] as const) {
      expect(who({ type, gymId: 1 })).toEqual([1, 2, 3])
      expect(who({ type, gymId: 2 })).toEqual([4])
    }
  })
})
