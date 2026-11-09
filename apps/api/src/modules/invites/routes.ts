// /api/invites: an owner creates one; the invite page (public) looks its token up and accepts it.
import {
  AcceptInviteRequest,
  type AcceptInviteResponse,
  CreateInviteRequest,
  type CreateInviteResponse,
  type InviteInfo,
} from '@tenure/contracts'
import type { Context } from 'hono'
import { requireOwner } from '../../platform/auth/guards.ts'
import { endSession, startSession } from '../../platform/auth/session.ts'
import type { AppContext } from '../../platform/context.ts'
import { readJson } from '../../platform/http/validate.ts'
import type { AppEnv, Router, SignedInEnv } from '../../platform/module.ts'
import { acceptInvite, createInvite, inviteInfo } from './service.ts'

/** Behind a guard a handler's context is SignedInEnv's; the platform's readers take the base env. */
const base = (c: Context<AppEnv & SignedInEnv>) => c as unknown as Context<AppEnv>

export function invitesRoutes(router: Router, ctx: AppContext) {
  router.post('/invites', requireOwner, async (c) => {
    const input = await readJson(base(c), CreateInviteRequest)
    const body = await createInvite(ctx, c.var.gym, c.var.actor.id, input, new URL(c.req.url).origin)
    return c.json(body satisfies CreateInviteResponse)
  })

  router.get('/invites/:token', async (c) => c.json((await inviteInfo(ctx, c.req.param('token'))) satisfies InviteInfo))

  // No rate limit: the token is 32 random bytes. Whoever was signed in in this browser is signed out first.
  router.post('/invites/:token/accept', async (c) => {
    const input = await readJson(c, AcceptInviteRequest)
    const { userId, ...body } = await acceptInvite(ctx, c.req.param('token'), input)
    await endSession(c, ctx)
    await startSession(c, ctx, userId)
    return c.json(body satisfies AcceptInviteResponse)
  })
}
