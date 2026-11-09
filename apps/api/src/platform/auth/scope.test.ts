import type { Actor } from '@tenure/contracts'
import { expect, test } from 'vitest'
import { makeWorld } from '../../test/world.ts'
import { scopeOf } from './scope.ts'

const actorOf = ({ id, gymId, role, name, email }: Actor): Actor => ({ id, gymId, role, name, email })

test('FR-STAFF-07 an owner sees the gym, a coach only their own members', async () => {
  const w = await makeWorld()
  expect(scopeOf(actorOf(w.owner), w.gym)).toEqual({ gymId: w.gym.id })
  expect(scopeOf(actorOf(w.coach), w.gym)).toEqual({ gymId: w.gym.id, coachId: w.coach.id })
})
