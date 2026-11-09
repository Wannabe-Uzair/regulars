// The accept's order (legacy data-fixes.test.mjs): the link, then the email, are checked before the slow hash.
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { hashPassword } from '../../platform/auth/password.ts'
import { call } from '../../test/http.ts'
import { makeWorld, type World } from '../../test/world.ts'

vi.mock('../../platform/auth/password.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../platform/auth/password.ts')>()
  return { ...real, hashPassword: vi.fn(real.hashPassword) }
})

let w: World
let token: string

beforeEach(async () => {
  w = await makeWorld()
  const owner = await w.login(w.owner.email)
  const r = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { email: 'priya@northside.test', role: 'coach' } })
  token = (r.body as { link: string }).link.split('/').pop() ?? ''
  vi.mocked(hashPassword).mockClear()
})

describe('invite accept', () => {
  test('FR-STAFF-04 invite accept checks the link before hashing the password', async () => {
    const bad = await call(w.app, 'POST', '/api/invites/nope/accept', { body: { name: 'Eve', password: 'long-enough-pw' } })
    expect(bad.status).toBe(404)
    expect(hashPassword).not.toHaveBeenCalled()
  })

  test('FR-STAFF-04 invite accept checks the email is free before hashing the password', async () => {
    // priya@northside.test is already the world's coach.
    const taken = await call(w.app, 'POST', `/api/invites/${token}/accept`, { body: { name: 'Priya', password: 'long-enough-pw' } })
    expect(taken.status).toBe(409)
    expect(hashPassword).not.toHaveBeenCalled()
  })
})
