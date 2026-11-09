import { expect, test } from 'vitest'
import { addMember } from './members.ts'
import { makeWorld } from './world.ts'

test('FR-GLOBAL-04 addMember stores a given phone, no phone or no last name, and otherwise hands out the sequence', async () => {
  const w = await makeWorld()
  const find = async (id: number) => {
    const m = await w.ctx.repos.members.findInScope({ gymId: w.gym.id }, id)
    return { last: m?.lastName, phone: m?.phone }
  }
  const first = await find(await addMember(w, { first: 'Ana', daysSinceJoin: 3 }))
  expect(first.last).toBe('Test')
  expect(first.phone).toMatch(/^\+1312555\d{4}$/)
  const sequence = Number(first.phone?.slice(-4))
  expect(sequence).toBeGreaterThanOrEqual(100)

  expect(await find(await addMember(w, { first: 'Leo', last: null, phone: null, daysSinceJoin: 3 }))).toEqual({
    last: null,
    phone: null,
  })
  expect(await find(await addMember(w, { first: 'Bo', phone: '+13125550042', daysSinceJoin: 3 }))).toEqual({
    last: 'Test',
    phone: '+13125550042',
  })
  // The two members with a phone of their own took no number from the sequence.
  const next = await find(await addMember(w, { first: 'Cy', daysSinceJoin: 3 }))
  expect(next.phone).toBe(`+1312555${String(sequence + 1).padStart(4, '0')}`)
})
