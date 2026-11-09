// The CSV import of members or check-ins: the preview, then the commit.
import type { ApiModule } from '../../platform/module.ts'
import { importRoutes } from './routes.ts'

export const importModule: ApiModule = {
  name: 'import',
  register: (router, ctx) => importRoutes(router, ctx),
  publicPaths: [],
  ownerPaths: ['POST /api/import/preview', 'POST /api/import/commit'],
}
