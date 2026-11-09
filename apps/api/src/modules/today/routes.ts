// /api/today: the first screen an owner or coach sees.
import type { TodayResponse } from '@tenure/contracts'
import { requireActor } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import type { Router } from '../../platform/module.ts'
import { todayView } from './service.ts'

export function todayRoutes(router: Router, ctx: AppContext) {
  router.get('/today', requireActor, async (c) =>
    c.json((await todayView(ctx, c.var.actor, c.var.gym)) satisfies TodayResponse),
  )
}
