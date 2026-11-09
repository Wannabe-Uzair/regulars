// Members: the lists by view, the member page, edits, add, archive, restore and permanent delete.
import type { ApiModule } from '../../platform/module.ts'
import { memberRoutes } from './routes.ts'

export const membersModule: ApiModule = {
  name: 'members',
  register: (router, ctx) => memberRoutes(router, ctx),
  // The lists, the member page, add, archive and restore need a session: a coach acts on their own members.
  publicPaths: [],
  // Member edits (FR-STAFF-06) and the permanent delete (FR-MEMBER-07).
  ownerPaths: ['PATCH /api/members/:id', 'DELETE /api/members/:id'],
}
