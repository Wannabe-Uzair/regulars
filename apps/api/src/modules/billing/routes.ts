// /api/billing: the owner's Billing screen, and the pilot day the shell shows by the gym name.
import type { BillingResponse } from '@tenure/contracts'
import { requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import type { Router } from '../../platform/module.ts'
import { billingView } from './service.ts'

export function billingRoutes(router: Router, ctx: AppContext) {
  router.get('/billing', requireOwner, (c) => c.json(billingView(ctx, c.var.gym) satisfies BillingResponse))
}
