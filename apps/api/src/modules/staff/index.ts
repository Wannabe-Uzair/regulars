// Staff: the coaches with their counts, deactivating and reactivating.
import type { ApiModule } from '../../platform/module.ts'
import { staffRoutes } from './routes.ts'

export const staffModule: ApiModule = {
  name: 'staff',
  register: (router, ctx) => staffRoutes(router, ctx),
  publicPaths: [],
  ownerPaths: ['GET /api/coaches', 'PATCH /api/coaches/:id'],
}
