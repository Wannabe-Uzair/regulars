// The stall demo: "Try the demo" signs in as the demo owner, and "Reset the demo" re-seeds the demo gym in place, in
// stall mode only. Anyone at the stall may use either, so all three routes are public.
import type { ApiModule } from '../../platform/module.ts'
import { demoRoutes } from './routes.ts'

/** `env` gives the reset its zone and country, as `npm run seed` reads them (TENURE_TZ, TENURE_COUNTRY). */
export function createDemoModule(env: Record<string, string | undefined> = process.env): ApiModule {
  return {
    name: 'demo',
    register: (router, ctx) => demoRoutes(router, ctx, env),
    publicPaths: ['GET /api/demo', 'POST /api/demo/try', 'POST /api/demo/reset'],
    ownerPaths: [],
  }
}

export const demoModule: ApiModule = createDemoModule()
