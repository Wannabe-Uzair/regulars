// Live events (GET /api/events, SSE). Each carries what the realtime scope check needs (gymId, and the member's
// coachId after the write) and the little the web shows; the web refetches for the rest.
import { z } from 'zod'
import { Id, IsoInstant } from './wire.ts'

export const LIVE_EVENT_TYPES = [
  'checkin.recorded',
  'member.joined',
  'member.updated',
  'member.deleted',
  'nudge.recorded',
  'import.committed',
  'staff.updated',
  'settings.updated',
] as const
export const LiveEventType = z.enum(LIVE_EVENT_TYPES)
export type LiveEventType = z.infer<typeof LiveEventType>

const scope = { gymId: Id, memberId: Id, coachId: Id.nullable() }

/** `name` is the member's short name, for the "{name} checked in" toast. */
export const CheckinRecorded = z.object({
  type: z.literal('checkin.recorded'),
  ...scope,
  name: z.string(),
  at: IsoInstant,
})
export type CheckinRecorded = z.infer<typeof CheckinRecorded>

export const MemberJoined = z.object({ type: z.literal('member.joined'), ...scope })
export type MemberJoined = z.infer<typeof MemberJoined>

export const MemberUpdated = z.object({ type: z.literal('member.updated'), ...scope })
export type MemberUpdated = z.infer<typeof MemberUpdated>

/** An archive or a restore is a member.updated; a permanent delete is this, with the coach the member had. */
export const MemberDeleted = z.object({ type: z.literal('member.deleted'), ...scope })
export type MemberDeleted = z.infer<typeof MemberDeleted>

export const NudgeRecorded = z.object({ type: z.literal('nudge.recorded'), ...scope })
export type NudgeRecorded = z.infer<typeof NudgeRecorded>

// Gym-wide events carry only the gym, and everyone signed in to it hears them. An import is one event however many
// rows it wrote.
const gym = { gymId: Id }

export const ImportCommitted = z.object({ type: z.literal('import.committed'), ...gym })
export type ImportCommitted = z.infer<typeof ImportCommitted>

export const StaffUpdated = z.object({ type: z.literal('staff.updated'), ...gym })
export type StaffUpdated = z.infer<typeof StaffUpdated>

export const SettingsUpdated = z.object({ type: z.literal('settings.updated'), ...gym })
export type SettingsUpdated = z.infer<typeof SettingsUpdated>

export const LiveEvent = z.discriminatedUnion('type', [
  CheckinRecorded,
  MemberJoined,
  MemberUpdated,
  MemberDeleted,
  NudgeRecorded,
  ImportCommitted,
  StaffUpdated,
  SettingsUpdated,
])
export type LiveEvent = z.infer<typeof LiveEvent>
