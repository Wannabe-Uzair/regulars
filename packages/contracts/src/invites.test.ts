import { describe, expect, test } from 'vitest'
import type { z } from 'zod'
import { AcceptInviteRequest, CreateInviteRequest } from './invites.ts'
import { CoachPatch } from './staff.ts'

const firstCode = (schema: z.ZodType, input: unknown) => {
  const r = schema.safeParse(input)
  if (r.success) throw new Error(`expected ${JSON.stringify(input)} to fail`)
  return r.error.issues[0]?.message
}

describe('CreateInviteRequest', () => {
  test('FR-STAFF-03 takes an email (trimmed, lower case) and a role, Coach or Owner', () => {
    expect(CreateInviteRequest.parse({ email: ' Priya@Northside.TEST ', role: 'owner' })).toEqual({
      email: 'priya@northside.test',
      role: 'owner',
    })
    expect(CreateInviteRequest.parse({ email: 'a@b.test', role: 'coach' }).role).toBe('coach')
  })

  test.each([
    ['no email', { role: 'coach' }, 'email'],
    ['a malformed email', { email: 'priya@northside', role: 'coach' }, 'email'],
    ['no role', { email: 'a@b.test' }, 'inviteRole'],
    ['a role that is not coach or owner', { email: 'a@b.test', role: 'admin' }, 'inviteRole'],
    ['a body that is not an object', 'priya', 'generic'],
  ])('FR-STAFF-03 refuses %s with its code', (_, input, code) => {
    expect(firstCode(CreateInviteRequest, input)).toBe(code)
  })
})

describe('AcceptInviteRequest', () => {
  test('FR-STAFF-04 takes the invitee name (trimmed) and password', () => {
    expect(AcceptInviteRequest.parse({ name: ' Alex Kim ', password: 'alex-password' })).toEqual({
      name: 'Alex Kim',
      password: 'alex-password',
    })
  })

  test.each([
    ['no name', { password: 'alex-password' }, 'yourName'],
    ['a blank name', { name: '  ', password: 'alex-password' }, 'yourName'],
    ['a name over 80', { name: 'x'.repeat(81), password: 'alex-password' }, 'yourName'],
    ['a short password', { name: 'Alex', password: 'short' }, 'password'],
    ['a password over 200', { name: 'Alex', password: 'x'.repeat(201) }, 'passwordTooLong'],
  ])('FR-STAFF-04 refuses %s with its code', (_, input, code) => {
    expect(firstCode(AcceptInviteRequest, input)).toBe(code)
  })
})

describe('CoachPatch', () => {
  test('FR-STAFF-05 takes the active flag, and refuses anything but true or false', () => {
    expect(CoachPatch.parse({ active: false })).toEqual({ active: false })
    expect(firstCode(CoachPatch, {})).toBe('coachActive')
    expect(firstCode(CoachPatch, { active: 'no' })).toBe('coachActive')
  })
})
