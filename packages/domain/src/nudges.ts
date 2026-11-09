// Nudges (SPEC §3.8): the channels a nudge is recorded with, and what came of it.
import { cameBack } from './metrics.ts'

/**
 * How a nudge left, from the first version on: the Contact menu's Text message, WhatsApp and Copy message, and in
 * person (a member with no phone). Every new nudge records one of these.
 */
export const NUDGE_CHANNELS = ['text', 'whatsapp', 'copy', 'in-person'] as const
export type NudgeChannel = (typeof NUDGE_CHANNELS)[number]

/** What every nudge recorded before the first version holds: a text, a copied message or in person, not told apart. */
export const OLD_NUDGE_CHANNEL = 'own-phone'

/** Every value a stored nudge's channel holds: the four, then the old one. */
export const STORED_NUDGE_CHANNELS = [...NUDGE_CHANNELS, OLD_NUDGE_CHANNEL] as const
export type StoredNudgeChannel = (typeof STORED_NUDGE_CHANNELS)[number]

/** The channel a screen shows for a stored one: the four as they are, and null for `own-phone`, which has no channel word. */
export function shownNudgeChannel(stored: StoredNudgeChannel): NudgeChannel | null {
  return stored === OLD_NUDGE_CHANNEL ? null : stored
}

/** A nudge's outcome in the log (FR-NUDGE-06): came back, still waiting, or no visit. */
export const NUDGE_OUTCOMES = ['cameBack', 'waiting', 'noVisit'] as const
export type NudgeOutcome = (typeof NUDGE_OUTCOMES)[number]

/** How far back the nudges log reaches, in days (FR-NUDGE-06). */
export const NUDGE_LOG_DAYS = 30

const WEEK_MS = 7 * 86_400_000

/**
 * What came of a nudge at `now`: `cameBack` by metrics' one came-back rule (a check-in strictly after it and at most 7
 * days later, FR-NUDGE-07); otherwise `waiting` while the nudge is under 7 days old, then `noVisit`.
 */
export function nudgeOutcome(sentAt: string, checkinAts: readonly string[], now: Date): NudgeOutcome {
  if (cameBack(sentAt, checkinAts)) return 'cameBack'
  return now.getTime() - Date.parse(sentAt) < WEEK_MS ? 'waiting' : 'noVisit'
}
