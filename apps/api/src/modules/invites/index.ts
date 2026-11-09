// Invites: inviting a coach or an owner by email, and looking up and accepting an invite.
import type { ApiModule } from '../../platform/module.ts'
import { invitesRoutes } from './routes.ts'

export const invitesModule: ApiModule = {
  name: 'invites',
  register: (router, ctx) => invitesRoutes(router, ctx),
  publicPaths: ['GET /api/invites/:token', 'POST /api/invites/:token/accept'],
  ownerPaths: ['POST /api/invites'],
}
