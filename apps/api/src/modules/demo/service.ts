// The stall demo's two actions: who "Try the demo" signs in as (FR-WEB-04), and "Reset the demo" (FR-OPS-03).
import type { MeResponse } from '@tenure/contracts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'
import { demoPlace, resetDemo } from '../../seed.ts'
import { authGym, authUser } from '../auth/index.ts'

/** The demo gym and its first active owner (the seed's, unless a visitor's invitee took over), for "Try the demo". */
export async function demoOwner(ctx: AppContext): Promise<MeResponse & { userId: number }> {
  const gym = await ctx.repos.gyms.findDefault()
  if (!gym?.isDemo) throw new ApiError('notFound')
  const owner = (await ctx.repos.users.listByGym(gym.id)).filter((u) => u.role === 'owner' && u.active).sort((a, b) => a.id - b.id)[0]
  if (!owner) throw new ApiError('notFound')
  return { user: authUser(owner), gym: authGym(gym), userId: owner.id }
}

/**
 * Put the demo gym back as seeded for today, in the zone and country `env` gives (as `npm run seed` reads them), on
 * the server's own database file. Every demo session goes with the reset; the event makes each open live stream check
 * its session at once, so the screens signed in to the demo sign out now rather than at the next heartbeat.
 */
export async function resetTheDemo(ctx: AppContext, env: Record<string, string | undefined>): Promise<void> {
  const place = demoPlace(env)
  if ('error' in place) throw new Error(place.error)
  const reset = await resetDemo(ctx.config.dbFile, place, ctx.clock())
  if (!reset) throw new ApiError('notFound')
  ctx.bus.publish({ type: 'settings.updated', gymId: reset.gymId })
}
