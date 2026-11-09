// /api/reports: the owner's Reports screen.
import type { ReportsResponse } from '@tenure/contracts'
import { requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import type { Router } from '../../platform/module.ts'
import { reportsView } from './service.ts'

export function reportsRoutes(router: Router, ctx: AppContext) {
  router.get('/reports', requireOwner, async (c) =>
    c.json((await reportsView(ctx, c.var.gym)) satisfies ReportsResponse),
  )
}
