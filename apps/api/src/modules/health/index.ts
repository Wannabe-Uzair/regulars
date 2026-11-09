import type { ApiModule } from '../../platform/module.ts'
import { healthRoutes } from './routes.ts'

export const healthModule: ApiModule = {
  name: 'health',
  register: (router) => healthRoutes(router),
  publicPaths: ['GET /api/health'],
  ownerPaths: [],
}
