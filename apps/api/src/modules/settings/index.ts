// Settings: the gym's name, time zone and country, and the kiosk and phone links with their QR codes.
import type { ApiModule } from '../../platform/module.ts'
import { settingsRoutes } from './routes.ts'

export const settingsModule: ApiModule = {
  name: 'settings',
  register: (router, ctx) => settingsRoutes(router, ctx),
  // GET /api/qr needs a session: a coach may show the phone link's code too, as in the old app.
  publicPaths: [],
  ownerPaths: ['GET /api/settings', 'PATCH /api/settings'],
}
