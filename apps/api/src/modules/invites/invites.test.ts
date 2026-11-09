import { AcceptInviteResponse, CreateInviteResponse, InviteInfo, type ErrorCode, type LiveEvent } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { errorBody } from '../../platform/http/errors.ts'
import { createDevAdapters } from '../../adapters/index.ts'
import { TEST_NOW } from '../../platform/context.ts'
import { call, HOST } from '../../test/http.ts'
import { makeWorld, type World } from '../../test/world.ts'

const err = (code: ErrorCode) => errorBody(code)
const DAY_MS = 86_400_000
const tokenOf = (link: string) => link.split('/').pop() ?? ''
/**
 * The session cookie a browser keeps after this response: an accept clears the old one and sets the new one, in that
 * order, so the last tenure_session wins.
 */
const sessionCookieOf = (res: Response) =>
  res.headers.getSetCookie().filter((c) => c.startsWith('tenure_session=')).at(-1)?.split(';')[0] ?? ''

/** An invite from the world's owner; its token. */
async function invite(w: World, email = 'alex@northside.test', role = 'coach') {
  const r = await call(w.app, 'POST', '/api/invites', { cookie: await w.login(w.owner.email), body: { email, role } })
  expect(r.status).toBe(200)
  return tokenOf(CreateInviteResponse.parse(r.body).link)
}
const accept = (w: World, token: string, body: unknown, cookie?: string) =>
  call(w.app, 'POST', `/api/invites/${token}/accept`, { body, cookie })
const lookup = (w: World, token: string) => call(w.app, 'GET', `/api/invites/${token}`)

describe('POST /api/invites', () => {
  test('FR-STAFF-03 an invite link works once; a second accept fails', async () => {
    const w = await makeWorld()
    const owner = await w.login(w.owner.email)
    const inv = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { email: 'Alex@Northside.test', role: 'coach' } })
    expect(inv.status).toBe(200)
    const body = CreateInviteResponse.strict().parse(inv.body)
    expect(body.link).toMatch(/^http:\/\/192\.168\.137\.1:5175\/invite\/[\w-]{43}$/)
    expect(body).toMatchObject({ email: 'alex@northside.test', role: 'coach' })
    expect(body.expiresAt).toBe(new Date(TEST_NOW.getTime() + 7 * DAY_MS).toISOString())
    const token = tokenOf(body.link)

    const info = await lookup(w, token)
    expect(InviteInfo.strict().parse(info.body)).toEqual({ gymName: 'Northside Strength', email: 'alex@northside.test', role: 'coach' })

    const first = await accept(w, token, { name: 'Alex Kim', password: 'alex-password' })
    expect(first.status).toBe(200)
    const joined = AcceptInviteResponse.parse(first.body)
    expect(joined.user).toEqual({ id: joined.user.id, name: 'Alex Kim', email: 'alex@northside.test', role: 'coach' })
    expect(joined.gym.slug).toBe('northside')
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: sessionCookieOf(first.res) })).body).toMatchObject({
      user: { email: 'alex@northside.test' },
    })

    const second = await accept(w, token, { name: 'Eve', password: 'eve-password' })
    expect(second).toMatchObject({ status: 404, body: err('linkInvalid') })
    expect((await lookup(w, token)).status).toBe(404)
    expect(await w.ctx.repos.users.findByEmail('alex@northside.test')).toMatchObject({ name: 'Alex Kim' })
  })

  test('FR-STAFF-03 two accepts of one link at once make one person', async () => {
    const w = await makeWorld()
    const token = await invite(w)
    const both = await Promise.all([
      accept(w, token, { name: 'Alex Kim', password: 'alex-password' }),
      accept(w, token, { name: 'Eve', password: 'eve-password' }),
    ])
    expect(both.map((r) => r.status).sort()).toEqual([200, 404])
    expect((await w.ctx.repos.users.listByGym(w.gym.id)).filter((u) => u.email === 'alex@northside.test')).toHaveLength(1)
  })

  test('FR-STAFF-03 an unknown or expired invite is 404', async () => {
    let now = TEST_NOW
    const w = await makeWorld({ clock: () => now })
    expect(await lookup(w, 'not-a-token')).toMatchObject({ status: 404, body: err('linkInvalid') })
    const token = await invite(w)
    now = new Date(TEST_NOW.getTime() + 7 * DAY_MS - 1)
    expect((await lookup(w, token)).status).toBe(200)
    now = new Date(TEST_NOW.getTime() + 7 * DAY_MS)
    expect((await lookup(w, token)).status).toBe(404)
    expect(await accept(w, token, { name: 'Late', password: 'late-password' })).toMatchObject({ status: 404, body: err('linkInvalid') })
  })

  test("FR-STAFF-03 an invite link uses the LAN address so a coach's phone can open it, and the request origin only with no LAN", async () => {
    const w = await makeWorld({ lan: () => ['10.0.0.7', '192.168.1.2'] })
    const owner = await w.login(w.owner.email)
    const inv = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { email: 'alex@northside.test', role: 'coach' } })
    const { link } = CreateInviteResponse.parse(inv.body)
    expect(link).toMatch(/^http:\/\/10\.0\.0\.7:5175\/invite\/[\w-]{43}$/)
    expect(link).not.toMatch(/tenure\.test|localhost/)
    const none = await makeWorld({ lan: () => [] })
    const o2 = await none.login(none.owner.email)
    const inv2 = await call(none.app, 'POST', '/api/invites', { cookie: o2, body: { email: 'bo@northside.test', role: 'coach' } })
    expect(CreateInviteResponse.parse(inv2.body).link).toMatch(new RegExp(`^http://${HOST}/invite/[\\w-]{43}$`))
  })

  test('FR-STAFF-03 the invite is emailed with its link, worded for its role', async () => {
    const adapters = createDevAdapters(() => {})
    const w = await makeWorld({ adapters })
    const owner = await w.login(w.owner.email)
    const coach = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { email: 'alex@northside.test', role: 'coach' } })
    const co = await call(w.app, 'POST', '/api/invites', { cookie: owner, body: { email: 'sara@northside.test', role: 'owner' } })
    expect(adapters.email.outbox).toEqual([
      {
        to: 'alex@northside.test',
        subject: 'Join Northside Strength',
        text: `${t('invite.lede')}\n\n${CreateInviteResponse.parse(coach.body).link}`,
      },
      {
        to: 'sara@northside.test',
        subject: 'Join Northside Strength',
        text: `${t('invite.lede.owner')}\n\n${CreateInviteResponse.parse(co.body).link}`,
      },
    ])
  })

  test.each<[string, unknown, ErrorCode]>([
    ['no role', { email: 'alex@northside.test' }, 'inviteRole'],
    ['a role that is not Coach or Owner', { email: 'alex@northside.test', role: 'admin' }, 'inviteRole'],
    ['no email', { role: 'coach' }, 'email'],
    ['a malformed email', { email: 'alex', role: 'coach' }, 'email'],
  ])('FR-STAFF-03 %s is refused, and nothing is sent', async (_, body, code) => {
    const adapters = createDevAdapters(() => {})
    const w = await makeWorld({ adapters })
    const r = await call(w.app, 'POST', '/api/invites', { cookie: await w.login(w.owner.email), body })
    expect(r).toMatchObject({ status: 400, body: err(code) })
    expect(adapters.email.outbox).toEqual([])
  })

  test('FR-STAFF-06 creating an invite is owner only: a coach gets 403, signed out 401', async () => {
    const w = await makeWorld()
    const body = { email: 'x@northside.test', role: 'owner' }
    expect(await call(w.app, 'POST', '/api/invites', { cookie: await w.login(w.coach.email), body })).toMatchObject({ status: 403, body: err('role') })
    expect(await call(w.app, 'POST', '/api/invites', { body })).toMatchObject({ status: 401, body: err('signIn') })
  })
})

describe('POST /api/invites/:token/accept', () => {
  test('FR-STAFF-04 an owner invite makes an owner, who can reach owner routes', async () => {
    const w = await makeWorld()
    const token = await invite(w, 'sara@northside.test', 'owner')
    expect(InviteInfo.parse((await lookup(w, token)).body).role).toBe('owner')
    const r = await accept(w, token, { name: 'Sara K.', password: 'sara-password' })
    expect(AcceptInviteResponse.parse(r.body).user).toMatchObject({ role: 'owner', email: 'sara@northside.test' })
    expect((await call(w.app, 'GET', '/api/coaches', { cookie: sessionCookieOf(r.res) })).status).toBe(200)
  })

  test('FR-STAFF-04 accepting ends the old session in that browser and signs the new person in', async () => {
    const w = await makeWorld()
    const token = await invite(w)
    const mike = await w.login(w.owner.email)
    const r = await accept(w, token, { name: 'Alex Kim', password: 'alex-password' }, mike)
    expect(r.status).toBe(200)
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: mike })).status).toBe(401)
    expect((await call(w.app, 'GET', '/api/auth/me', { cookie: sessionCookieOf(r.res) })).body).toMatchObject({ user: { name: 'Alex Kim' } })
  })

  test('FR-STAFF-04 accepting publishes staff.updated to the gym', async () => {
    const w = await makeWorld()
    const token = await invite(w)
    const events: LiveEvent[] = []
    w.ctx.bus.subscribe((e) => events.push(e))
    expect((await accept(w, token, { name: 'Alex Kim', password: 'alex-password' })).status).toBe(200)
    expect(events).toEqual([{ type: 'staff.updated', gymId: w.gym.id }])
  })

  test('FR-STAFF-04 an email that already has an account is 409, and the link stays usable', async () => {
    const w = await makeWorld()
    const token = await invite(w, 'priya@northside.test')
    expect(await accept(w, token, { name: 'Priya', password: 'priya-password' })).toMatchObject({ status: 409, body: err('duplicate') })
    expect((await lookup(w, token)).status).toBe(200)
  })

  test.each<[string, unknown, ErrorCode]>([
    ['no name', { password: 'alex-password' }, 'yourName'],
    ['a short password', { name: 'Alex', password: 'short' }, 'password'],
    ['a body that is not an object', 'alex', 'generic'],
  ])('FR-STAFF-04 %s is refused with its code, and the link stays usable', async (_, body, code) => {
    const w = await makeWorld()
    const token = await invite(w)
    expect(await accept(w, token, body)).toMatchObject({ status: 400, body: err(code) })
    expect((await lookup(w, token)).status).toBe(200)
  })

  test('FR-STAFF-04 a bad link is 404 linkInvalid, and nobody is made', async () => {
    const w = await makeWorld()
    expect(await accept(w, 'nope', { name: 'Eve', password: 'long-enough-pw' })).toMatchObject({ status: 404, body: err('linkInvalid') })
    expect(await w.ctx.repos.users.listByGym(w.gym.id)).toHaveLength(3)
  })
})
