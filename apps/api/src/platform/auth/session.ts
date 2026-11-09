// Sessions: a random token in the tenure_session cookie, its sha256 in the database. The middleware loads the
// signed-in user as `c.var.actor` and their gym as `c.var.gym`.
import type { Actor } from '@tenure/contracts'
import type { User } from '@tenure/db'
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppContext } from '../context.ts'
import type { AppEnv } from '../module.ts'
import { newToken, sha256 } from './token.ts'

export const SESSION_COOKIE = 'tenure_session'
export const SESSION_DAYS = 30
const DAY_MS = 86_400_000

/** The typed actor routes see: never the raw user row. */
export const actorOf = (user: User): Actor => ({
  id: user.id,
  gymId: user.gymId,
  role: user.role,
  name: user.name,
  email: user.email,
})

/** Start a session for the user and set its cookie. */
export async function startSession(c: Context, ctx: AppContext, userId: number): Promise<void> {
  const token = newToken()
  const now = ctx.clock()
  await ctx.repos.sessions.create({
    tokenHash: sha256(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY_MS).toISOString(),
  })
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
    secure: ctx.config.secureCookies,
  })
}

/** Delete the cookie's session, if there is one, and clear the cookie. */
export async function endSession(c: Context, ctx: AppContext): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) await ctx.repos.sessions.delete(sha256(token))
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: ctx.config.secureCookies })
}

/** Middleware: when the cookie names a live session of an active user, sets `actor` and `gym`. */
export function loadSession(ctx: AppContext): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) {
      const live = await ctx.repos.sessions.findLive(sha256(token), ctx.clock().toISOString())
      if (live) {
        c.set('actor', actorOf(live.user))
        c.set('gym', live.gym)
      }
    }
    await next()
  }
}

/**
 * For a response that outlives its request (the live stream): a check, run as often as needed, that the request's
 * cookie still names a live session of `actor`, with the role and gym the actor opened with. Logging out, expiry,
 * deactivation and a change of role or gym all turn it false.
 */
export function sessionProbe(c: Context, ctx: AppContext, actor: Actor): () => Promise<boolean> {
  const token = getCookie(c, SESSION_COOKIE)
  const tokenHash = token ? sha256(token) : undefined
  return async () => {
    if (!tokenHash) return false
    const live = await ctx.repos.sessions.findLive(tokenHash, ctx.clock().toISOString())
    return live?.user.id === actor.id && live.user.role === actor.role && live.user.gymId === actor.gymId
  }
}
