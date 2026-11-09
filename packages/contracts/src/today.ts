// GET /api/today.
import { z } from 'zod'
import { MemberSummary } from './members.ts'
import { Id, IsoInstant } from './wire.ts'

/** Domain's Kpis on the wire. */
export const Kpis = z.object({
  newMembers: z.int().nonnegative(),
  onTheLinePct: z.int().min(0).max(100).nullable(),
  slipping: z.int().nonnegative(),
  nudgedThisWeek: z.int().nonnegative(),
})
export type Kpis = z.infer<typeof Kpis>

/** A check-in of today (gym-local), newest first. `name` is the member's short name. */
export const CheckinToday = z.object({ memberId: Id, name: z.string(), at: IsoInstant })
export type CheckinToday = z.infer<typeof CheckinToday>

export const TodayResponse = z.object({
  kpis: Kpis,
  /** Slipping members: the viewer's own first, then the slipping order. */
  slipping: z.array(MemberSummary),
  checkinsToday: z.array(CheckinToday),
  /** Every member in the viewer's scope still in their first 90 days, in board order. */
  board: z.array(MemberSummary),
  /** The viewer's scope has any member at all, in the window or not: false only for an empty gym (or coach). */
  hasMembers: z.boolean(),
})
export type TodayResponse = z.infer<typeof TodayResponse>
