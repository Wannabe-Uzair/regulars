import type { ApiModule } from '../../platform/module.ts'
import { authRoutes } from './routes.ts'

/** The session's user and gym as the API answers them, for the other modules that answer a gym (Settings). */
export { authGym, authUser } from './service.ts'

export const authModule: ApiModule = {
  name: 'auth',
  register: (router, ctx) => authRoutes(router, ctx),
  // GET /api/auth/me needs a session; GET /api/auth/session answers anyone, with null when signed out.
  publicPaths: ['POST /api/auth/signup', 'POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/session'],
  ownerPaths: [],
}
