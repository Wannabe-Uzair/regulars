// The kiosk at /kiosk/:token: check-in by phone or name, the name search and joining. Its name turns on the
// start-up kiosk lines (platform/lan.ts). It holds nothing open, so it subscribes to nothing and registers no stop.
import type { ApiModule } from '../../platform/module.ts'
import { kioskRoutes } from './routes.ts'

export const kioskModule: ApiModule = {
  name: 'kiosk',
  register: (router, ctx) => kioskRoutes(router, ctx),
  // The kiosk works without signing in (FR-KIOSK-01): every route takes the gym's kiosk token instead.
  publicPaths: [
    'GET /api/kiosk/:token',
    'POST /api/kiosk/:token/checkin',
    'GET /api/kiosk/:token/search',
    'POST /api/kiosk/:token/join',
  ],
  ownerPaths: [],
}
