import { describe, expect, test } from 'vitest'
import type { z } from 'zod'
import { Actor, LoginRequest, LoginResponse, LogoutResponse, MeResponse, SignupRequest, SignupResponse } from './auth.ts'
import { ErrorCode } from './errors.ts'

const signup = { gymName: 'Northside Strength', name: 'Mike Reyes', email: 'mike@northside.test', password: 'northside-demo-2026', country: 'US' }

/** The message of every issue from parsing `input`. */
function issueMessages(schema: z.ZodType, input: unknown): string[] {
  const r = schema.safeParse(input)
  if (r.success) throw new Error(`expected ${JSON.stringify(input)} to fail`)
  return r.error.issues.map((i) => i.message)
}
const firstCode = (schema: z.ZodType, input: unknown) => issueMessages(schema, input)[0]

describe('SignupRequest', () => {
  test('accepts a sign-up, trimming names and trimming and lowercasing the email', () => {
    expect(SignupRequest.parse({ ...signup, gymName: '  Northside Strength ', email: ' Mike@Northside.TEST ' })).toEqual(signup)
    expect(SignupRequest.parse({ ...signup, timezone: 'America/New_York' }).timezone).toBe('America/New_York')
  })

  test.each([
    ['no gym name', { ...signup, gymName: undefined }, 'gymName'],
    ['a blank gym name', { ...signup, gymName: '   ' }, 'gymName'],
    ['a gym name over 80', { ...signup, gymName: 'x'.repeat(81) }, 'gymName'],
    ['no name', { ...signup, name: undefined }, 'yourName'],
    ['a name that is not text', { ...signup, name: 7 }, 'yourName'],
    ['a name over 80', { ...signup, name: 'x'.repeat(81) }, 'yourName'],
    ['no email', { ...signup, email: undefined }, 'email'],
    ['a malformed email', { ...signup, email: 'mike@northside' }, 'email'],
    ['an email over 254', { ...signup, email: `${'m'.repeat(250)}@n.test` }, 'email'],
    ['no password', { ...signup, password: undefined }, 'password'],
    ['a password under 8', { ...signup, password: 'short' }, 'password'],
    ['a password over 200', { ...signup, password: 'x'.repeat(201) }, 'passwordTooLong'],
    ['an unknown time zone', { ...signup, timezone: 'Mars/Olympus' }, 'timezone'],
    ['FR-AUTH-02 no country', { ...signup, country: undefined }, 'country'],
    ['FR-AUTH-02 a null country', { ...signup, country: null }, 'country'],
    ['FR-AUTH-02 a blank country', { ...signup, country: '' }, 'country'],
    ['FR-AUTH-02 a country outside the five markets', { ...signup, country: 'IN' }, 'country'],
    ['FR-AUTH-02 a country that is no code', { ...signup, country: 'ZZ' }, 'country'],
    ['FR-AUTH-02 the market as a word, not its code', { ...signup, country: 'UK' }, 'country'],
    ['FR-AUTH-02 a code in lower case', { ...signup, country: 'us' }, 'country'],
    ['a time zone that is not text', { ...signup, timezone: 5 }, 'timezone'],
    ['a body that is not an object', [signup], 'generic'],
  ])('rejects %s with its code', (_, input, code) => {
    expect(firstCode(SignupRequest, input)).toBe(code)
  })

  test('the first issue follows the old route order (gym name, name, email, password), then the country', () => {
    expect(firstCode(SignupRequest, {})).toBe('gymName')
    expect(firstCode(SignupRequest, { gymName: 'G' })).toBe('yourName')
    expect(firstCode(SignupRequest, { gymName: 'G', name: 'N' })).toBe('email')
    expect(firstCode(SignupRequest, { gymName: 'G', name: 'N', email: 'a@b.co' })).toBe('password')
    expect(firstCode(SignupRequest, { gymName: 'G', name: 'N', email: 'a@b.co', password: 'longenough' })).toBe('country')
  })

  test('FR-AUTH-02 each of the five markets is a country sign-up takes', () => {
    for (const country of ['US', 'CA', 'GB', 'PK', 'AE']) expect(SignupRequest.parse({ ...signup, country }).country).toBe(country)
  })

  test('FR-AUTH-01 a client must send the country: the request type has no sign-up without one', () => {
    // tsc checks the line below: it fails to compile once the country is optional again.
    // @ts-expect-error no country
    const noCountry: z.input<typeof SignupRequest> = { gymName: 'G', name: 'N', email: 'a@b.co', password: 'longenough' }
    expect(firstCode(SignupRequest, noCountry)).toBe('country')
  })

  test('passwords of exactly 8 and 200 characters pass', () => {
    expect(SignupRequest.safeParse({ ...signup, password: 'x'.repeat(8) }).success).toBe(true)
    expect(SignupRequest.safeParse({ ...signup, password: 'x'.repeat(200) }).success).toBe(true)
  })
})

describe('LoginRequest', () => {
  test('accepts a login and normalises the email', () => {
    expect(LoginRequest.parse({ email: ' Mike@Northside.test', password: 'northside-demo-2026' })).toEqual({
      email: 'mike@northside.test',
      password: 'northside-demo-2026',
    })
  })

  test.each([
    ['no email', { password: 'northside-demo-2026' }],
    ['a malformed email', { email: 'mike', password: 'northside-demo-2026' }],
    ['no password', { email: 'mike@northside.test' }],
    ['a short password', { email: 'mike@northside.test', password: 'short' }],
    ['a password over 200', { email: 'mike@northside.test', password: 'x'.repeat(201) }],
  ])('rejects %s like a wrong password', (_, input) => {
    expect(issueMessages(LoginRequest, input).every((m) => m === 'loginMismatch')).toBe(true)
  })

  test('rejects a body that is not an object as generic', () => {
    expect(firstCode(LoginRequest, 'mike')).toBe('generic')
  })
})

test('every issue message from a bad request is an ErrorCode', () => {
  const bad: [z.ZodType, unknown][] = [
    [SignupRequest, null],
    [SignupRequest, {}],
    [SignupRequest, { gymName: 1, name: '', email: 'x', password: 'x'.repeat(300), timezone: 'Nowhere' }],
    [SignupRequest, { gymName: ' ', name: 'x'.repeat(90), email: 3, password: 3, timezone: null }],
    [SignupRequest, { ...signup, country: 'IN' }],
    [SignupRequest, { ...signup, country: 7 }],
    [LoginRequest, null],
    [LoginRequest, {}],
    [LoginRequest, { email: 'x'.repeat(300), password: 'x'.repeat(300) }],
    [LoginRequest, { email: 1, password: 1 }],
  ]
  const messages = bad.flatMap(([schema, input]) => issueMessages(schema, input))
  expect(messages.length).toBeGreaterThan(10)
  for (const m of messages) expect(ErrorCode.safeParse(m).success, m).toBe(true)
})

describe('Actor', () => {
  test('accepts an owner and a coach, and rejects another role', () => {
    const actor = { id: 1, gymId: 1, role: 'owner', name: 'Mike Reyes', email: 'mike@northside.test' }
    expect(Actor.safeParse(actor).success).toBe(true)
    expect(Actor.safeParse({ ...actor, role: 'coach' }).success).toBe(true)
    expect(Actor.safeParse({ ...actor, role: 'admin' }).success).toBe(false)
    expect(Actor.safeParse({ ...actor, gymId: undefined }).success).toBe(false)
  })
})

describe('auth responses', () => {
  // The old userJson / gymJson output for the seeded owner.
  const me = {
    user: { id: 1, name: 'Mike Reyes', email: 'mike@northside.test', role: 'owner' },
    gym: { id: 1, name: 'Northside Strength', slug: 'northside', isDemo: true, timezone: 'America/Chicago', country: 'US', plan: 'pilot', pilotStartedOn: '2026-10-14' },
  }

  test('me, sign-up and login answer the user and the gym', () => {
    for (const schema of [MeResponse, SignupResponse, LoginResponse]) expect(schema.safeParse(me).success).toBe(true)
  })

  test('never pass on the kiosk token', () => {
    const parsed = MeResponse.parse({ ...me, gym: { ...me.gym, kioskToken: 'secret' } })
    expect(parsed.gym).not.toHaveProperty('kioskToken')
  })

  test('reject a snake_case gym', () => {
    const gym = { id: 1, name: 'Northside Strength', slug: 'northside', is_demo: 1, timezone: 'America/Chicago', plan: 'pilot', pilot_started_on: '2026-10-14' }
    expect(MeResponse.safeParse({ ...me, gym }).success).toBe(false)
  })

  test('logout', () => {
    expect(LogoutResponse.safeParse({ ok: true }).success).toBe(true)
    expect(LogoutResponse.safeParse({}).success).toBe(false)
  })
})
