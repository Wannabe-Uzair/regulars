// Nudges (FR-NUDGE-01 to 08): recording one with its channel, and the nudges log with each nudge's outcome. Every
// validation issue's message is an ErrorCode.
import { NUDGE_CHANNELS, NUDGE_LOG_DAYS, NUDGE_OUTCOMES, STORED_NUDGE_CHANNELS } from '@tenure/domain'
import { z } from 'zod'
import { type ErrorCode, withCode } from './errors.ts'
import { MessageBody } from './templates.ts'
import { Id, IsoInstant } from './wire.ts'

/** How a new nudge left: text, whatsapp, copy or in-person. */
export const NudgeChannel = z.enum(NUDGE_CHANNELS, withCode('generic'))
export type NudgeChannel = z.infer<typeof NudgeChannel>

/** A stored nudge's channel: the four, or own-phone for the nudges from before the first version (no channel word). */
export const StoredNudgeChannel = z.enum(STORED_NUDGE_CHANNELS)
export type StoredNudgeChannel = z.infer<typeof StoredNudgeChannel>

export const NudgeOutcome = z.enum(NUDGE_OUTCOMES)
export type NudgeOutcome = z.infer<typeof NudgeOutcome>

/** A row id whose every issue (not a number, not a whole number, not above 0) is `code`. */
const idWithCode = (code: ErrorCode) => z.int(withCode(code)).positive(withCode(code))

/**
 * POST /api/nudges: the nudge the coach just sent from their own phone or computer, recorded on the same click as the
 * Contact menu's link (Tenure sends nothing itself). The member must be one the sender sees, and the template, when
 * one was used, the gym's: otherwise 404 `memberNotFound` or `templateNotFound`. The channel is required, and
 * own-phone is refused: only old rows hold it.
 */
export const RecordNudgeRequest = z.object(
  {
    memberId: idWithCode('notFound'),
    body: MessageBody,
    templateId: idWithCode('templateNotFound').nullish(),
    channel: NudgeChannel,
  },
  withCode('generic'),
)
export type RecordNudgeRequest = z.infer<typeof RecordNudgeRequest>

/** A nudge as recorded, with the trimmed message stored. */
export const RecordedNudge = z.object({
  id: Id,
  memberId: Id,
  templateId: Id.nullable(),
  at: IsoInstant,
  body: z.string(),
  channel: NudgeChannel,
})
export type RecordedNudge = z.infer<typeof RecordedNudge>

/** The recorded nudge, and the member's Text message and WhatsApp links for it: null when they have no phone. */
export const RecordNudgeResponse = z.object({
  nudge: RecordedNudge,
  smsUrl: z.string().nullable(),
  whatsappUrl: z.string().nullable(),
})
export type RecordNudgeResponse = z.infer<typeof RecordNudgeResponse>

/**
 * One row of the nudges log. `memberName` is the member's plain short name ("Sam O.", or a single name); `by` is the
 * sender's name; `body` is the whole message (the screen shows its start); `channel` is how it left, null for the
 * nudges from before the first version (as on the member page); `outcome` is decided at the server's clock.
 */
export const NudgeLogEntry = z.object({
  id: Id,
  at: IsoInstant,
  memberId: Id,
  memberName: z.string(),
  by: z.string().nullable(),
  body: z.string(),
  channel: NudgeChannel.nullable(),
  outcome: NudgeOutcome,
})
export type NudgeLogEntry = z.infer<typeof NudgeLogEntry>

/**
 * GET /api/nudges: the last 30 days of nudges, newest first. An owner sees the gym's; a coach the ones they sent to
 * members who are still theirs.
 */
export const NudgesResponse = z.array(NudgeLogEntry)
export type NudgesResponse = z.infer<typeof NudgesResponse>

/** `?days=` as the old log read it: rounded and held to 1 to 365, and 30 when absent or not a number. */
export function nudgeDays(raw: string | undefined): number {
  const n = Number(raw ?? NUDGE_LOG_DAYS)
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1), 365) : NUDGE_LOG_DAYS
}

/** GET /api/nudges's query: `days`, 30 by default. It never fails. */
export const NudgesQuery = z.object({ days: z.string().optional().transform(nudgeDays) })
export type NudgesQuery = z.output<typeof NudgesQuery>
