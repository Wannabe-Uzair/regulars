// Billing: the pilot day and that the pilot is free, for owners.
import type { ApiModule } from '../../platform/module.ts'
import { billingRoutes } from './routes.ts'

export const billingModule: ApiModule = {
  name: 'billing',
  register: (router, ctx) => billingRoutes(router, ctx),
  publicPaths: [],
  ownerPaths: ['GET /api/billing'],
}
