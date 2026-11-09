// /api/auth/*: sign up, log in, log out, me, and the session (me, or null when signed out).
import {
  LoginRequest,
  type LoginResponse,
  type LogoutResponse,
  type MeResponse,
  type SessionResponse,
  SignupRequest,
  type SignupResponse,
} from '@tenure/contracts'
import { requireActor } from '../../platform/auth/guards.ts'
import { endSession, startSession } from '../../platform/auth/session.ts'
import type { AppContext } from '../../platform/context.ts'
import { readJson } from '../../platform/http/validate.ts'
import type { Router } from '../../platform/module.ts'
import { deviceKey } from '../../platform/rate-limit.ts'
import { authGym, authUser, logIn, signUp } from './service.ts'

export function authRoutes(router: Router, ctx: AppContext) {
  router.post('/auth/signup', async (c) => {
    const input = await readJson(c, SignupRequest)
    const { userId, ...body } = await signUp(ctx, input, deviceKey(c))
    await startSession(c, ctx, userId)
    return c.json(body satisfies SignupResponse)
  })

  router.post('/auth/login', async (c) => {
    const input = await readJson(c, LoginRequest)
    const { userId, ...body } = await logIn(ctx, input, deviceKey(c))
    await startSession(c, ctx, userId)
    return c.json(body satisfies LoginResponse)
  })

  router.post('/auth/logout', async (c) => {
    await endSession(c, ctx)
    return c.json({ ok: true } satisfies LogoutResponse)
  })

  router.get('/auth/me', requireActor, (c) =>
    c.json({ user: authUser(c.var.actor), gym: authGym(c.var.gym) } satisfies MeResponse),
  )

  // Me without the 401, for Log In and Set Up: signed out, it answers 200 with a null session.
  router.get('/auth/session', (c) => {
    const { actor, gym } = c.var
    const session = actor && gym ? { user: authUser(actor), gym: authGym(gym) } : null
    return c.json({ session } satisfies SessionResponse)
  })
}
