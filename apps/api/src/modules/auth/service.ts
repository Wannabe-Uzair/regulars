// Sign-up and log-in, in the old server's order: count the attempt, refuse what can be refused cheaply, then hash.
import type { AuthGym, AuthUser, LoginRequest, MeResponse, SignupInput } from '@tenure/contracts'
import { DuplicateError, type Gym, type User } from '@tenure/db'
import { DEFAULT_TEMPLATES, todayIn, zoneForCountry } from '@tenure/domain'
import { dummyPasswordHash, hashPassword, verifyPassword } from '../../platform/auth/password.ts'
import { newToken } from '../../platform/auth/token.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'
import { loginKey } from '../../platform/rate-limit.ts'

const SLUG_MAX = 40

/**
 * A gym name as a URL slug: lower case, runs of anything but a-z and 0-9 become one '-', at most 40 characters,
 * no '-' at either end. 'gym' when nothing is left. The repository adds -2, -3… when the slug is taken.
 */
export function slugify(name: string): string {
  const trim = (s: string) => s.replace(/^-+|-+$/g, '')
  const s = trim(trim(name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-')).slice(0, SLUG_MAX))
  return s || 'gym'
}

export const authUser = (u: Pick<User, 'id' | 'name' | 'email' | 'role'>): AuthUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
})

export const authGym = (g: Gym): AuthGym => ({
  id: g.id,
  name: g.name,
  slug: g.slug,
  isDemo: g.isDemo,
  timezone: g.timezone,
  country: g.country,
  plan: g.plan,
  pilotStartedOn: g.pilotStartedOn,
})

/**
 * A new gym, in the country chosen (the contract refuses a missing one), and its owner. The gym keeps the browser's
 * zone when it is in that country, and otherwise takes the country's own (answers.md, 7 Nov). The caller starts the
 * owner's session.
 */
export async function signUp(
  ctx: AppContext,
  input: SignupInput,
  device: string,
): Promise<MeResponse & { userId: number }> {
  // Count the attempt before the slow hash, so parallel sign-ups can't all get past the limit.
  if (!(await ctx.rateLimits.signup.attempt(device))) throw new ApiError('signupTooMany')
  // Before the hash too, so a duplicate costs no scrypt.
  if (await ctx.repos.users.findByEmail(input.email)) throw new ApiError('duplicate')
  const passwordHash = await hashPassword(input.password)
  const now = ctx.clock()
  const timezone = zoneForCountry(input.country, input.timezone)
  try {
    const { gym, owner } = await ctx.repos.gyms.createWithOwner({
      gym: {
        name: input.gymName,
        slug: slugify(input.gymName),
        timezone,
        country: input.country,
        pilotStartedOn: todayIn(timezone, now),
        kioskToken: newToken(),
      },
      owner: { email: input.email, name: input.name, passwordHash },
      templates: DEFAULT_TEMPLATES,
      createdAt: now.toISOString(),
    })
    return { user: authUser(owner), gym: authGym(gym), userId: owner.id }
  } catch (err) {
    // The same email may have signed up while we hashed.
    if (err instanceof DuplicateError && err.field === 'email') throw new ApiError('duplicate')
    throw err
  }
}

/** Check the email and password. The caller starts the session. */
export async function logIn(
  ctx: AppContext,
  input: LoginRequest,
  device: string,
): Promise<MeResponse & { userId: number }> {
  const key = loginKey(device, input.email)
  // Count the attempt before the slow verify, so parallel tries can't all get past the limit.
  if (!(await ctx.rateLimits.login.attempt(key))) throw new ApiError('loginTooMany')
  const user = await ctx.repos.users.findByEmail(input.email)
  const real = user?.active ? user : undefined
  // An unknown or inactive email still costs one scrypt, so timing doesn't reveal which emails exist.
  const verified = await verifyPassword(
    real ? input.password : '',
    real ? real.passwordHash : await dummyPasswordHash(),
  )
  if (!real || !verified) throw new ApiError('loginMismatch')
  const gym = await ctx.repos.gyms.findById(real.gymId)
  if (!gym) throw new Error(`user ${real.id} has no gym`)
  await ctx.rateLimits.login.clear(key)
  return { user: authUser(real), gym: authGym(gym), userId: real.id }
}
