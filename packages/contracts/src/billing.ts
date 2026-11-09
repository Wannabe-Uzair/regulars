// GET /api/billing (owner only): the free pilot's day (FR-BILL-01), which the shell's "Pilot day {n} of 90" shows too
// (FR-SHELL-03), and whether the pilot has ended. No plan and no price until one is set.
import { PILOT_DAYS } from '@tenure/domain'
import { z } from 'zod'
import { IsoDate } from './wire.ts'

export const BillingResponse = z.object({
  /** The pilot's first day, a date in the gym's time zone. */
  pilotStartedOn: IsoDate,
  /** Today's pilot day in the gym's time zone: 1 on the start day, and 90 from day 90 on. */
  pilotDay: z.int().min(1).max(PILOT_DAYS),
  /** The pilot's day 90, a date in the gym's time zone: the last day of the pilot. */
  endsOn: IsoDate,
  /** True from day 91 on, which `pilotDay` cannot tell from day 90. */
  ended: z.boolean(),
})
export type BillingResponse = z.infer<typeof BillingResponse>
