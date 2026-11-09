import type { ApiModule } from '../../platform/module.ts'
import { HEARTBEAT_MS, realtimeRoutes } from './routes.ts'

/** The live stream. Tests pass a short heartbeat. */
export const createRealtimeModule = ({ heartbeatMs = HEARTBEAT_MS }: { heartbeatMs?: number } = {}): ApiModule => ({
  name: 'realtime',
  register: (router, ctx) => realtimeRoutes(router, ctx, heartbeatMs),
  // GET /api/events needs a session.
  publicPaths: [],
  ownerPaths: [],
})

export const realtimeModule = createRealtimeModule()
