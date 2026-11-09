// The pilot day (the old GET /api/billing, without its plan and price). It reads only the signed-in gym the session
// already loaded, so the shell can ask for it on every page at no cost.
import type { BillingResponse } from '@tenure/contracts'
import type { Gym } from '@tenure/db'
import { pilotDay, pilotEnded, pilotEndsOn, todayIn } from '@tenure/domain'
import type { AppContext } from '../../platform/context.ts'

/** The gym's pilot day, its last day and whether it has ended, at the context's clock, in the gym's time zone. */
export function billingView(ctx: AppContext, gym: Gym): BillingResponse {
  const today = todayIn(gym.timezone, ctx.clock())
  return {
    pilotStartedOn: gym.pilotStartedOn,
    pilotDay: pilotDay(gym.pilotStartedOn, today),
    endsOn: pilotEndsOn(gym.pilotStartedOn),
    ended: pilotEnded(gym.pilotStartedOn, today),
  }
}
