import { ErrorBody, LoginResponse, LogoutResponse, MeResponse, SessionResponse, SignupResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { hashPassword } from '../../platform/auth/password.ts'
import { createTestContext } from '../../platform/context.ts'
import { call, cookieOf } from '../../test/http.ts'
import { makeWorld, PASSWORD, TODAY, type World } from '../../test/world.ts'
import { slugify } from './service.ts'

const err = (code: string) => ({ error: { code, message: t(`api.${code}` as never) } })
const login = (w: World, email: string, password: string) =>
  call(w.app, 'POST', '/api/auth/login', { body: { email, password } })
const signup = (w: World, i: number, email = `owner${i}@example.com`) =>
  call(w.app, 'POST', '/api/auth/signup', { body: { gymName: `Gym ${i}`, name: 'Ana Ruiz', email, password: 'longenough', country: 'US' } })

describe('POST /api/auth/signup', () => {
  test('creates the gym, the owner and the three default templates, and signs in', async () => {
    const ctx = createTestContext()
    const app = createApp(ctx)
    const body = { gymName: 'Iron & Oak Gym', name: 'Ana Ruiz', email: 'Ana@Example.com', password: 'longenough', country: 'US' }
    const r = await call(app, 'POST', '/api/auth/signup', { body })
    expect(r.status).toBe(200)
    const res = SignupResponse.strict().parse(r.body)
    expect(res.user).toEqual({ id: res.user.id, name: 'Ana Ruiz', email: 'ana@example.com', role: 'owner' })
    expect(res.gym).toEqual({
      id: res.gym.id,
      name: 'Iron & Oak Gym',
      slug: 'iron-oak-gym',
      isDemo: false,
      // No zone sent: the gym takes its country's own (answers.md, 7 Nov).
      timezone: 'America/New_York',
      country: 'US',
      plan: 'pilot',
      pilotStartedOn: TODAY,
    })
    expect((await ctx.repos.gyms.findById(res.gym.id))?.kioskToken).toMatch(/^[\w-]{43}$/)
    expect((await ctx.repos.templates.list(res.gym.id)).map((tpl) => tpl.name)).toEqual([
      'We missed you',
      'First weeks',
      'One visit',
    ])
    const me = await call(app, 'GET', '/api/auth/me', { cookie: cookieOf(r.res) })
    expect([me.status, me.body]).toEqual([200, r.body])
    // Same gym name again gets a fresh slug; same email is a conflict; a short password is refused.
    const again = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: 'b@example.com' } })
    expect(SignupResponse.parse(again.body).gym.slug).toBe('iron-oak-gym-2')
    const dup = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: 'ANA@example.com' } })
    expect([dup.status, dup.body]).toEqual([409, err('duplicate')])
    const short = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: 'c@example.com', password: 'short' } })
    expect([short.status, ErrorBody.parse(short.body).error.code]).toEqual([400, 'password'])
  })

  test('uses the time zone from the request, and its local date for the pilot start', async () => {
    const app = createApp(createTestContext({ clock: () => new Date('2026-11-07T03:00:00.000Z') }))
    const body = { gymName: 'Harbor', name: 'Ana', email: 'ana@harbor.test', password: 'longenough', country: 'US' }
    const la = await call(app, 'POST', '/api/auth/signup', { body: { ...body, timezone: 'America/Los_Angeles' } })
    expect(SignupResponse.parse(la.body).gym).toMatchObject({ timezone: 'America/Los_Angeles', pilotStartedOn: '2026-11-06' })
    const ny = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: 'b@harbor.test' } })
    expect(SignupResponse.parse(ny.body).gym).toMatchObject({ timezone: 'America/New_York', pilotStartedOn: '2026-11-06' })
    const bad = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: 'c@harbor.test', timezone: 'Mars/Base' } })
    expect([bad.status, bad.body]).toEqual([400, err('timezone')])
  })

  test('FR-AUTH-01 the gym gets the country chosen, with the zone sent', async () => {
    const ctx = createTestContext()
    const app = createApp(ctx)
    const body = { gymName: 'Lahore Lifts', name: 'Sana', email: 'sana@lahore.test', password: 'longenough' }
    const pk = await call(app, 'POST', '/api/auth/signup', { body: { ...body, country: 'PK', timezone: 'Asia/Karachi' } })
    expect(pk.status).toBe(200)
    const gym = SignupResponse.parse(pk.body).gym
    expect(gym).toMatchObject({ country: 'PK', timezone: 'Asia/Karachi' })
    expect((await ctx.repos.gyms.findById(gym.id))?.country).toBe('PK')
    const me = await call(app, 'GET', '/api/auth/me', { cookie: cookieOf(pk.res) })
    expect(MeResponse.parse(me.body).gym.country).toBe('PK')
    // The country is the owner's choice, not the zone's: a UAE gym signed up on a Karachi laptop stays a UAE gym, on
    // the UAE's own zone.
    const ae = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: 'b@lahore.test', country: 'AE', timezone: 'Asia/Karachi' } })
    expect(SignupResponse.parse(ae.body).gym).toMatchObject({ country: 'AE', timezone: 'Asia/Dubai' })
    for (const country of ['US', 'CA', 'GB']) {
      const r = await call(app, 'POST', '/api/auth/signup', { body: { ...body, email: `${country}@lahore.test`, country } })
      expect(SignupResponse.parse(r.body).gym.country).toBe(country)
    }
  })

  test.each([
    ['a zone in the country is kept', 'CA', 'America/Vancouver', 'America/Vancouver'],
    ['another name for a zone in the country is kept', 'US', 'US/Central', 'US/Central'],
    ['a US zone for a Canadian gym gives Toronto', 'CA', 'America/Chicago', 'America/Toronto'],
    ['a Karachi zone for a US gym gives New York', 'US', 'Asia/Karachi', 'America/New_York'],
    ['a New York zone for a UK gym gives London', 'GB', 'America/New_York', 'Europe/London'],
    ['a London zone for a Pakistani gym gives Karachi', 'PK', 'Europe/London', 'Asia/Karachi'],
    ['UTC for a UAE gym gives Dubai', 'AE', 'UTC', 'Asia/Dubai'],
    ['no zone for a UK gym gives London', 'GB', undefined, 'Europe/London'],
  ])("FR-AUTH-01 the browser's zone: %s", async (_, country, timezone, zone) => {
    const ctx = createTestContext()
    const app = createApp(ctx)
    const body = { gymName: 'Zone Gym', name: 'Ana', email: 'ana@zone.test', password: 'longenough', country, timezone }
    const r = await call(app, 'POST', '/api/auth/signup', { body })
    const gym = SignupResponse.parse(r.body).gym
    expect(gym).toMatchObject({ country, timezone: zone })
    expect((await ctx.repos.gyms.findById(gym.id))?.timezone).toBe(zone)
  })

  test.each([
    ['no country', {}],
    ['a null country', { country: null }],
    ['a country outside the five markets', { country: 'IN' }],
    ['a code that is no country', { country: 'ZZ' }],
    ['the market as a word', { country: 'UK' }],
  ])('FR-AUTH-02 a sign-up with %s is refused with 400 country, and nothing is created', async (_, country) => {
    const ctx = createTestContext()
    const app = createApp(ctx)
    const body = { gymName: 'Nowhere Gym', name: 'Ana', email: 'ana@nowhere.test', password: 'longenough', timezone: 'Asia/Karachi', ...country }
    const r = await call(app, 'POST', '/api/auth/signup', { body })
    expect([r.status, r.body]).toEqual([400, err('country')])
    expect(r.res.headers.get('set-cookie')).toBeNull()
    expect(await ctx.repos.users.findByEmail('ana@nowhere.test')).toBeUndefined()
    expect(await ctx.repos.gyms.findDefault()).toBeUndefined()
  })

  test('an email taken while the password hashed still answers 409 duplicate, and leaves nothing behind', async () => {
    const ctx = createTestContext()
    const app = createApp(ctx)
    const body = { gymName: 'Race', name: 'Ana', email: 'race@example.com', password: 'longenough', country: 'US' }
    const [a, b] = await Promise.all([1, 2].map(() => call(app, 'POST', '/api/auth/signup', { body })))
    expect([a?.status, b?.status].sort()).toEqual([200, 409])
    expect([a, b].find((r) => r?.status === 409)?.body).toEqual(err('duplicate'))
    expect(await ctx.repos.gyms.findById(2)).toBeUndefined()
  })

  test('fix 4: sign-up allows 5 per device per 10 minutes, then 429', async () => {
    const w = await makeWorld()
    for (let i = 1; i <= 5; i++) expect((await signup(w, i)).status).toBe(200)
    const sixth = await signup(w, 6)
    expect([sixth.status, sixth.body]).toEqual([429, err('signupTooMany')])
    expect(await w.ctx.repos.users.findByEmail('owner6@example.com')).toBeUndefined()
  })

  test('fix 4: parallel sign-ups are counted before hashing', async () => {
    const w = await makeWorld()
    const all = await Promise.all(Array.from({ length: 12 }, (_, i) => signup(w, i)))
    expect(all.filter((r) => r.status === 200).length, all.map((r) => r.status).join(' ')).toBe(5)
  })

  test('fix 4: a sign-up over the limit is refused before the password is hashed', async () => {
    const w = await makeWorld()
    for (let i = 1; i <= 5; i++) await signup(w, i)
    const scrypt = await fastest(3, () => hashPassword('longenough'))
    const refused = await fastest(3, async (i) => expect((await signup(w, 10 + i)).status).toBe(429))
    expect(refused, `refused took ${refused.toFixed(1)} ms; one scrypt takes ${scrypt.toFixed(1)} ms`).toBeLessThan(scrypt / 3)
  })

  test('fix 4: a duplicate email is refused before the password is hashed', async () => {
    const w = await makeWorld()
    const scrypt = await fastest(3, () => hashPassword('longenough'))
    const dup = await fastest(3, async () => expect((await signup(w, 0, w.owner.email)).status).toBe(409))
    expect(dup, `duplicate took ${dup.toFixed(1)} ms; one scrypt takes ${scrypt.toFixed(1)} ms`).toBeLessThan(scrypt / 3)
  })
})

describe('POST /api/auth/login', () => {
  test('a good password gives a session; a bad one gives 401 loginMismatch', async () => {
    const w = await makeWorld()
    const good = await login(w, 'MIKE@northside.test', PASSWORD)
    expect(good.status).toBe(200)
    const body = LoginResponse.strict().parse(good.body)
    expect(body.user).toEqual({ id: w.owner.id, name: 'Mike R.', email: 'mike@northside.test', role: 'owner' })
    expect(body.gym).toMatchObject({ name: 'Northside Strength', slug: 'northside', pilotStartedOn: '2026-10-14' })
    expect(body.gym).not.toHaveProperty('kioskToken')
    const bad = await login(w, 'mike@northside.test', 'wrong-password')
    expect([bad.status, bad.body]).toEqual([401, err('loginMismatch')])
    const nobody = await login(w, 'nobody@northside.test', PASSWORD)
    expect([nobody.status, nobody.body]).toEqual([401, err('loginMismatch')])
  })

  test('the login rate limit returns 429 on the 11th try, for that email only', async () => {
    const w = await makeWorld()
    for (let i = 1; i <= 10; i++) expect((await login(w, w.owner.email, `nope-nope-${i}`)).status, `try ${i}`).toBe(401)
    const eleventh = await login(w, w.owner.email, PASSWORD)
    expect([eleventh.status, eleventh.body]).toEqual([429, err('loginTooMany')])
    expect((await login(w, w.coach.email, PASSWORD)).status).toBe(200)
  })

  test('a deactivated coach cannot log in and loses their sessions', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.coach.email)
    await w.ctx.repos.users.setActive(w.gym.id, w.coach.id, false)
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie })).status).toBe(401)
    const r = await login(w, w.coach.email, PASSWORD)
    expect([r.status, r.body]).toEqual([401, err('loginMismatch')])
  })

  test('fix 1: 30 parallel wrong logins for one email get at most 10 real answers; the rest are refused', async () => {
    const w = await makeWorld()
    const all = await Promise.all(Array.from({ length: 30 }, () => login(w, w.owner.email, 'wrong-password')))
    const statuses = all.map((r) => r.status)
    expect(statuses.filter((s) => s === 401).length, statuses.join(' ')).toBe(10)
    expect(statuses.filter((s) => s === 429).length, statuses.join(' ')).toBe(20)
    expect(all.filter((r) => r.status === 429).every((r) => r.body && ErrorBody.parse(r.body).error.code === 'loginTooMany')).toBe(true)
    // Still blocked for the right password too, until the window passes.
    expect((await login(w, w.owner.email, PASSWORD)).status).toBe(429)
  })

  test('fix 1: a login over the limit is refused before the password is checked', async () => {
    const w = await makeWorld()
    for (let i = 0; i < 10; i++) await login(w, w.owner.email, 'wrong-password')
    const scrypt = await fastest(3, () => hashPassword('longenough'))
    const refused = await fastest(3, async () => expect((await login(w, w.owner.email, PASSWORD)).status).toBe(429))
    expect(refused, `refused took ${refused.toFixed(1)} ms; one scrypt takes ${scrypt.toFixed(1)} ms`).toBeLessThan(scrypt / 3)
  })

  test('fix 1: a good login clears the count', async () => {
    const w = await makeWorld()
    for (let i = 0; i < 9; i++) expect((await login(w, w.owner.email, 'wrong-password')).status).toBe(401)
    expect((await login(w, w.owner.email, PASSWORD)).status).toBe(200)
    for (let i = 0; i < 10; i++) expect((await login(w, w.owner.email, 'wrong-password')).status).toBe(401)
    expect((await login(w, w.owner.email, 'wrong-password')).status).toBe(429)
  })

  test('fix 5: an unknown email takes as long as a wrong password (it is checked against a dummy hash)', async () => {
    const w = await makeWorld()
    await login(w, 'warmup@nowhere.test', 'wrong-password')
    const scrypt = await fastest(3, () => hashPassword('longenough'))
    const unknown = await fastest(3, async (i) =>
      expect((await login(w, `nobody${i}@nowhere.test`, 'wrong-password')).status).toBe(401),
    )
    expect(unknown, `unknown email took ${unknown.toFixed(1)} ms; one scrypt takes ${scrypt.toFixed(1)} ms`).toBeGreaterThan(scrypt / 3)
  })
})

describe('POST /api/auth/logout and GET /api/auth/me', () => {
  test('me answers the signed-in user and gym', async () => {
    const w = await makeWorld()
    const me = await call(w.app, 'GET', '/api/auth/me', { cookie: await w.login(w.coach.email) })
    expect(me.status).toBe(200)
    expect(MeResponse.strict().parse(me.body).user).toEqual({ id: w.coach.id, name: 'Priya S.', email: 'priya@northside.test', role: 'coach' })
  })

  test('signed out, me is 401 signIn', async () => {
    const w = await makeWorld()
    const me = await call(w.app, 'GET', '/api/auth/me')
    expect([me.status, me.body]).toEqual([401, err('signIn')])
  })

  test('logout ends the session and clears the cookie', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.owner.email)
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie })).status).toBe(200)
    const out = await call(w.app, 'POST', '/api/auth/logout', { cookie, body: {} })
    expect([out.status, LogoutResponse.parse(out.body)]).toEqual([200, { ok: true }])
    expect(out.res.headers.get('set-cookie')).toMatch(/^tenure_session=; Max-Age=0; Path=\//)
    const me = await call(w.app, 'GET', '/api/auth/me', { cookie })
    expect([me.status, me.body]).toEqual([401, err('signIn')])
  })

  test('B2-24 the session is what me answers when signed in, and null, with a 200, when signed out or logged out', async () => {
    const w = await makeWorld()
    const cookie = await w.login(w.coach.email)
    const me = await call(w.app, 'GET', '/api/auth/me', { cookie })
    const session = await call(w.app, 'GET', '/api/auth/session', { cookie })
    expect([session.status, session.body]).toEqual([200, { session: me.body }])
    expect(SessionResponse.parse(session.body).session?.user.id).toBe(w.coach.id)
    const signedOut = await call(w.app, 'GET', '/api/auth/session')
    expect([signedOut.status, signedOut.body]).toEqual([200, { session: null }])
    await call(w.app, 'POST', '/api/auth/logout', { cookie, body: {} })
    const after = await call(w.app, 'GET', '/api/auth/session', { cookie })
    expect([after.status, after.body]).toEqual([200, { session: null }])
  })

  test('logout without a session still answers ok', async () => {
    const w = await makeWorld()
    const out = await call(w.app, 'POST', '/api/auth/logout', { body: {} })
    expect([out.status, out.body]).toEqual([200, { ok: true }])
  })
})

describe('slugify', () => {
  test.each([
    ['Iron & Oak Gym', 'iron-oak-gym'],
    ['  Northside  Strength!! ', 'northside-strength'],
    ['Café Fitness', 'cafe-fitness'],
    ['CrossFit 312', 'crossfit-312'],
    ['!!!', 'gym'],
    ['', 'gym'],
    ['健身房', 'gym'],
    ['a'.repeat(50), 'a'.repeat(40)],
    [`${'a'.repeat(39)} b`, 'a'.repeat(39)], // cut at 40 leaves no trailing '-'
  ])('%j -> %j', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })
})

/** Fastest of `n` runs, in ms. */
async function fastest(n: number, fn: (i: number) => Promise<unknown>) {
  let best = Infinity
  for (let i = 0; i < n; i++) {
    const start = performance.now()
    await fn(i)
    best = Math.min(best, performance.now() - start)
  }
  return best
}
