// Reports: the cohorts, visits and nudge figures, for owners.
import type { ApiModule } from '../../platform/module.ts'
import { reportsRoutes } from './routes.ts'

export const reportsModule: ApiModule = {
  name: 'reports',
  register: (router, ctx) => reportsRoutes(router, ctx),
  publicPaths: [],
  ownerPaths: ['GET /api/reports'],
}
