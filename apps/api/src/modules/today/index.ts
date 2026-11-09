import type { ApiModule } from '../../platform/module.ts'
import { todayRoutes } from './routes.ts'

export const todayModule: ApiModule = {
  name: 'today',
  register: (router, ctx) => todayRoutes(router, ctx),
  // GET /api/today needs a session.
  publicPaths: [],
  ownerPaths: [],
}
