// Staff (owner only): the list with each person's counts (GET /api/coaches), and turning someone off or back on
// (PATCH /api/coaches/:id). Every validation issue's message is an ErrorCode.
import { z } from 'zod'
import { Role } from './auth.ts'
import { withCode } from './errors.ts'
import { Id } from './wire.ts'

/** A person on the gym's staff, as the owner's staff list shows them. */
export const StaffMember = z.object({
  id: Id,
  name: z.string(),
  email: z.string(),
  role: Role,
  /** False once deactivated: they can't log in and get no kiosk walk-ins. Their history stays. */
  active: z.boolean(),
  /** Their members in the first 90 days (the board's set: archived members left out). */
  members: z.int().nonnegative(),
  /** How many of those members are slipping. */
  slipping: z.int().nonnegative(),
})
export type StaffMember = z.infer<typeof StaffMember>

/** GET /api/coaches: owners first, then by name, then by id. Inactive staff are listed too. */
export const CoachesResponse = z.object({ staff: z.array(StaffMember) })
export type CoachesResponse = z.infer<typeof CoachesResponse>

/** PATCH /api/coaches/:id: deactivate (`false`) or reactivate (`true`). */
export const CoachPatch = z.object({ active: z.boolean(withCode('coachActive')) }, withCode('generic'))
export type CoachPatch = z.infer<typeof CoachPatch>

/** The person after the change. */
export const CoachPatchResponse = StaffMember.pick({ id: true, name: true, email: true, role: true, active: true })
export type CoachPatchResponse = z.infer<typeof CoachPatchResponse>
