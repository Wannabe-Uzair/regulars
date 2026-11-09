// /api/kiosk/:token/*: public, the token in the path is the gym's secret. Each route counts the request and finds the
// gym before it reads anything else, as the old kiosk's guard did. Each answers and closes: nothing is held open.
import {
  KioskCheckinRequest,
  type KioskGymResponse,
  KioskJoinRequest,
  KioskSearchQuery,
  type KioskSearchResponse,
  type KioskWelcome,
} from '@tenure/contracts'
import type { Context } from 'hono'
import type { AppContext } from '../../platform/context.ts'
import { readJson, readQuery } from '../../platform/http/validate.ts'
import type { AppEnv, Router } from '../../platform/module.ts'
import { deviceKey } from '../../platform/rate-limit.ts'
import { checkIn, gymCall, join, kioskGym, search } from './service.ts'

export function kioskRoutes(router: Router, ctx: AppContext) {
  const gymOf = (c: Context<AppEnv>) => kioskGym(ctx, deviceKey(c), c.req.param('token') ?? '')

  router.get('/kiosk/:token', async (c) => {
    const gym = await gymOf(c)
    return c.json(gymCall(gym) satisfies KioskGymResponse)
  })

  router.post('/kiosk/:token/checkin', async (c) => {
    const gym = await gymOf(c)
    const input = await readJson(c, KioskCheckinRequest)
    return c.json((await checkIn(ctx, gym, input)) satisfies KioskWelcome)
  })

  router.get('/kiosk/:token/search', async (c) => {
    const gym = await gymOf(c)
    const { q } = readQuery(c, KioskSearchQuery)
    return c.json((await search(ctx, gym, q ?? '')) satisfies KioskSearchResponse)
  })

  router.post('/kiosk/:token/join', async (c) => {
    const gym = await gymOf(c)
    const input = await readJson(c, KioskJoinRequest)
    return c.json((await join(ctx, gym, input)) satisfies KioskWelcome)
  })
}
