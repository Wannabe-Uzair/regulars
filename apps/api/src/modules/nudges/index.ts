// Nudges: recording one with its channel, the outcomes and the history.
import type { ApiModule } from '../../platform/module.ts'
import { nudgesRoutes } from './routes.ts'

export const nudgesModule: ApiModule = {
  name: 'nudges',
  register: (router, ctx) => nudgesRoutes(router, ctx),
  // POST and GET /api/nudges need a session; owners and coaches both record and read (a coach only their own members).
  publicPaths: [],
  ownerPaths: [],
}
