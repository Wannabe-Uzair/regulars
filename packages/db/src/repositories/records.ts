import type { NudgeChannel, UserRole } from '../schema/index.ts'

/**
 * The typed records the repositories return. Dates are `YYYY-MM-DD` strings and timestamps are UTC ISO strings
 * (`2026-11-06T14:00:00.000Z`), whatever the database stores them as.
 */

export interface Gym {
  id: number
  name: string
  slug: string
  /** IANA time zone, such as `America/Chicago`. */
  timezone: string
  /** ISO 3166-1 alpha-2, such as `US`: phones and dates are read in it. */
  country: string
  isDemo: boolean
  /** `YYYY-MM-DD`. */
  pilotStartedOn: string
  plan: string
  kioskToken: string
  createdAt: string
}

export interface User {
  id: number
  gymId: number
  email: string
  name: string
  role: UserRole
  passwordHash: string
  active: boolean
  createdAt: string
}

export interface Session {
  tokenHash: string
  userId: number
  createdAt: string
  expiresAt: string
}

/** A session that is still live, with the active user it belongs to and that user's gym. */
export interface LiveSession {
  session: Session
  user: User
  gym: Gym
}

export interface Invite {
  tokenHash: string
  gymId: number
  role: UserRole
  name: string
  /** The id of the user who made the invite. */
  createdBy: number
  createdAt: string
  /** When the invite was accepted, or null while it is unused. */
  usedAt: string | null
}

/**
 * What a user may see. Without `coachId` it is the whole gym (an owner); with it, only the members whose coach that
 * user is, and those members' check-ins and nudges.
 */
export interface Scope {
  gymId: number
  coachId?: number
}

/** Its `id`, `firstName`, `lastName`, `phone`, `coachId` and `joinedOn` are domain's MemberInput, field for field. */
export interface Member {
  id: number
  gymId: number
  firstName: string
  lastName: string | null
  /** E.164, or null. Never ''. */
  phone: string | null
  email: string | null
  /** `YYYY-MM-DD`, in the gym's time zone. */
  joinedOn: string
  coachId: number | null
  /** The member's id in the gym's own system, from a CSV import. */
  externalId: string | null
  /** How the member was added: 'kiosk', 'csv', 'app' (by hand, in the app) or 'seed'. */
  source: string
  createdAt: string
  /** When the member was archived (UTC ISO timestamp), or null while they are active. */
  archivedAt: string | null
}

/** Its `memberId` and `at` are domain's CheckinInput. */
export interface Checkin {
  id: number
  gymId: number
  memberId: number
  at: string
  /** 'kiosk', 'csv' or 'seed'. */
  source: string
}

/** A check-in with its member's name, for Today's "checked in today" list. */
export interface CheckinWithName {
  memberId: number
  at: string
  firstName: string
  lastName: string | null
}

export interface Template {
  id: number
  gymId: number
  name: string
  body: string
  /** The template's place in the list: 1, 2, 3… */
  sort: number
  updatedAt: string
}

/** Its `memberId` and `sentAt` are domain's NudgeInput. */
export interface Nudge {
  id: number
  gymId: number
  memberId: number
  /** Who sent it. */
  userId: number
  /** The template it started from, or null (none, or the template was deleted since). */
  templateId: number | null
  body: string
  channel: NudgeChannel
  sentAt: string
}

/** A nudge with the name of the user who sent it. */
export interface NudgeWithSender extends Nudge {
  senderName: string | null
}

/** A nudge with its sender's and its member's names, for the nudge history. */
export interface NudgeWithNames extends NudgeWithSender {
  memberFirstName: string
  memberLastName: string | null
}

/** domain's CheckinInput. */
export interface CheckinAt {
  memberId: number
  at: string
}

/** domain's NudgeInput. */
export interface NudgeAt {
  memberId: number
  sentAt: string
}

/** domain's UserInput. */
export interface UserName {
  id: number
  name: string
}

/** What domain's buildSummaries needs, for one scope. */
export interface SummaryInputs {
  /** By id. */
  members: Member[]
  /** The members' check-ins, oldest first. */
  checkins: CheckinAt[]
  /** Everyone on the gym's staff, active or not, by id: the coach names. */
  users: UserName[]
  /** Each member's latest nudge, from anyone; members never nudged are left out. */
  lastNudges: NudgeAt[]
}
