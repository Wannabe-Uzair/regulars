// Message templates: the list, owners' edits and the rendered message.
import type { ApiModule } from '../../platform/module.ts'
import { templatesRoutes } from './routes.ts'

export const templatesModule: ApiModule = {
  name: 'templates',
  register: (router, ctx) => templatesRoutes(router, ctx),
  // GET /api/templates and POST /api/templates/render need a session; the writes need an owner.
  publicPaths: [],
  ownerPaths: ['POST /api/templates', 'PATCH /api/templates/:id', 'DELETE /api/templates/:id'],
}
