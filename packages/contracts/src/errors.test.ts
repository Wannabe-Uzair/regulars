import { describe, expect, test } from 'vitest'
import { ERROR_CODES, ErrorBody, ErrorCode } from './errors.ts'
import { HealthResponse } from './health.ts'

// The keys of MSG in the old app's server/messages.mjs, in order.
const OLD_MESSAGE_KEYS = [
  'loginMismatch', 'loginTooMany', 'memberNotFound', 'linkInvalid', 'role', 'duplicate', 'generic',
  'email', 'password', 'phone', 'server',
  'kioskNotFound',
  'kioskTooMany', 'kioskFirstName', 'importTooBig', 'signIn', 'json', 'crossSite', 'notApi', 'notFound',
  'passwordTooLong', 'gymName', 'yourName', 'coachName', 'timezone', 'qrLink', 'statusFilter', 'coachChoice',
  'coachNotFound', 'coachActive', 'ownerActive', 'templateNotFound', 'templateName', 'templateChoice',
  'messageBody', 'tooLarge', 'signupTooMany',
]

// The first version's codes (docs/SPEC.md §3), appended after the old ones.
const FIRST_VERSION_KEYS = [
  'country', // FR-AUTH-02, FR-GYM-01
  'memberFirstName', // FR-MEM-05, FR-MEMBER-02
  'joinedOn', // FR-MEM-05
  'memberNotArchived', // FR-MEMBER-07
  'memberArchived', // FR-KIOSK-06
  'resetInvalid', // FR-AUTH-07
  'resetTooMany', // FR-AUTH-07, NFR-SEC-03
  'inviteRole', // FR-STAFF-03
]

describe('error codes', () => {
  test('start with the old message keys, in order', () => {
    expect(ERROR_CODES.slice(0, 37)).toEqual(OLD_MESSAGE_KEYS)
  })

  test("NFR-COPY-01 the first version's codes follow the old ones, in order", () => {
    expect(ERROR_CODES.slice(37)).toEqual(FIRST_VERSION_KEYS)
    expect(ERROR_CODES).toHaveLength(37 + 8)
  })

  test('ErrorCode accepts a code and rejects anything else', () => {
    expect(ErrorCode.safeParse('gymName').success).toBe(true)
    expect(ErrorCode.safeParse('Enter your name.').success).toBe(false)
  })

  test('ErrorBody', () => {
    expect(ErrorBody.safeParse({ error: { code: 'signIn', message: 'Log in to continue.' } }).success).toBe(true)
    expect(ErrorBody.safeParse({ error: 'Log in to continue.' }).success).toBe(false)
    expect(ErrorBody.safeParse({ error: { code: 'nope', message: 'x' } }).success).toBe(false)
  })
})

test('HealthResponse', () => {
  expect(HealthResponse.safeParse({ ok: true }).success).toBe(true)
  expect(HealthResponse.safeParse({ ok: false }).success).toBe(false)
})
