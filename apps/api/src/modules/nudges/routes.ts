// /api/nudges: record the nudge a coach just sent, and the nudges log.
import { NudgesQuery, type NudgesResponse, RecordNudgeRequest, type RecordNudgeResponse } from '@tenure/contracts'
import type { Context } from 'hono'
import { requireActor } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import { readJson, readQuery } from '../../platform/http/validate.ts'
import type { AppEnv, Router, SignedInEnv } from '../../platform/module.ts'
import { nudgesLog, recordNudge } from './service.ts'

/**
 * platform's readJson, readQuery and idParam take a Context<AppEnv>; behind requireActor or requireOwner the context
 * is AppEnv & SignedInEnv, which TypeScript won't pass for it (Context#set is invariant). They read only `c.req`.
 */
const plain = (c: Context<AppEnv & SignedInEnv>): Context<AppEnv> => c as unknown as Context<AppEnv>

export function nudgesRoutes(router: Router, ctx: AppContext) {
  router.post('/nudges', requireActor, async (c) => {
    const input = await readJson(plain(c), RecordNudgeRequest)
    return c.json((await recordNudge(ctx, c.var.actor, c.var.gym, input)) satisfies RecordNudgeResponse)
  })

  router.get('/nudges', requireActor, async (c) => {
    const { days } = readQuery(plain(c), NudgesQuery)
    return c.json((await nudgesLog(ctx, c.var.actor, c.var.gym, days)) satisfies NudgesResponse)
  })
}
