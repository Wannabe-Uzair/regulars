// The auth tests' world, as the old server's fixtures built it: a gym with an owner and two coaches who share one
// password, and the app over a fresh test context.
import { addDays, DEFAULT_TEMPLATES } from '@tenure/domain'
import { createApp } from '../app.ts'
import { hashPassword } from '../platform/auth/password.ts'
import { sha256 } from '../platform/auth/token.ts'
import { createTestContext, type AppContext } from '../platform/context.ts'
import { call, cookieOf } from './http.ts'

export const PASSWORD = 'correct-horse-battery'
export const TODAY = '2026-11-06'
let hashed: Promise<string> | undefined

export async function makeWorld(overrides: Partial<AppContext> = {}) {
  const ctx = createTestContext(overrides)
  const app = createApp(ctx)
  const passwordHash = await (hashed ??= hashPassword(PASSWORD))
  const createdAt = ctx.clock().toISOString()
  const { gym, owner } = await ctx.repos.gyms.createWithOwner({
    gym: {
      name: 'Northside Strength',
      slug: 'northside',
      timezone: 'America/Chicago',
      pilotStartedOn: addDays(TODAY, -23),
      kioskToken: 'kiosk-token-1',
    },
    owner: { email: 'mike@northside.test', name: 'Mike R.', passwordHash },
    templates: DEFAULT_TEMPLATES,
    createdAt,
  })
  const addCoach = async (name: string, email: string) => {
    const tokenHash = sha256(`invite-${email}`)
    await ctx.repos.invites.create({ tokenHash, gymId: gym.id, name, createdBy: owner.id, createdAt })
    const user = await ctx.repos.invites.accept({
      tokenHash,
      liveSince: '1970-01-01T00:00:00.000Z',
      acceptedAt: createdAt,
      user: { email, name, passwordHash },
    })
    if (!user) throw new Error(`fixture: could not add ${email}`)
    return user
  }
  const coach = await addCoach('Priya S.', 'priya@northside.test')
  const coach2 = await addCoach('Jordan T.', 'jordan@northside.test')

  return {
    ctx,
    app,
    gym,
    owner,
    coach,
    coach2,
    /** Log in with PASSWORD; the session's Cookie header. */
    async login(email: string) {
      const r = await call(app, 'POST', '/api/auth/login', { body: { email, password: PASSWORD } })
      if (r.status !== 200) throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`)
      return cookieOf(r.res)
    },
  }
}

export type World = Awaited<ReturnType<typeof makeWorld>>
