// Members: the list by view, the member page, edits, add, archive, restore and permanent delete. Every validation
// issue's message is an ErrorCode.
import { cleanName, isCalendarDate, NAME_MAX, STATUSES } from '@tenure/domain'
import { z } from 'zod'
import { withCode } from './errors.ts'
import { Id, IsoDate, IsoInstant } from './wire.ts'

export const Status = z.enum(STATUSES)
export type Status = z.infer<typeof Status>

/** Domain's MemberSummary on the wire. */
export const MemberSummary = z.object({
  id: Id,
  firstName: z.string(),
  lastName: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  coachId: Id.nullable(),
  coachName: z.string().nullable(),
  joinedOn: IsoDate,
  daysSinceJoin: z.int(),
  week: z.int().min(0).max(12),
  weeks: z.array(z.int().nonnegative()),
  pace: z.number().nonnegative().nullable(),
  status: Status,
  lastVisitOn: IsoDate.nullable(),
  daysSinceLastVisit: z.int().nullable(),
  lastNudgeAt: IsoInstant.nullable(),
})
export type MemberSummary = z.infer<typeof MemberSummary>

// GET /api/members?view=…

/**
 * Members' three views (FR-MEM-01): the members in their first 90 days (the default), everyone who isn't archived,
 * or only the archived. A coach sees their own members in each.
 */
export const MEMBER_VIEWS = ['first90', 'everyone', 'archived'] as const
export const MemberView = z.enum(MEMBER_VIEWS, withCode('generic'))
export type MemberView = z.infer<typeof MemberView>

export const MembersQuery = z.object({ view: MemberView.default('first90') })
export type MembersQuery = z.infer<typeof MembersQuery>

/** The view's members, sorted by name in the gym's locale (FR-MEM-04). Status, coach and search filter in the browser. */
export const MembersResponse = z.object({ members: z.array(MemberSummary) })
export type MembersResponse = z.infer<typeof MembersResponse>

// GET /api/members/:id

/** The summary plus what only the member page shows. */
export const MemberDetail = MemberSummary.extend({
  email: z.string().nullable(),
  /** How the member was added: 'kiosk', 'csv', 'app' (added by hand) or 'seed'. */
  source: z.string(),
  /** When the member was archived, or null while they are active. */
  archivedAt: IsoInstant.nullable(),
})
export type MemberDetail = z.infer<typeof MemberDetail>

/** One of the 90 days, day 0 to 89 from the joining date; visited by the gym's local date, up to today. */
export const MemberPageDay = z.object({ date: IsoDate, day: z.int().min(0).max(89), visited: z.boolean() })
export type MemberPageDay = z.infer<typeof MemberPageDay>

export const MemberPageCheckin = z.object({
  at: IsoInstant,
  /** 'kiosk', 'csv' or 'seed'. */
  source: z.string(),
})
export type MemberPageCheckin = z.infer<typeof MemberPageCheckin>

export const MemberPageNudge = z.object({
  id: Id,
  at: IsoInstant,
  /** The sender's name; null if they are no longer on the staff list. */
  by: z.string().nullable(),
  body: z.string(),
  /** How it left. Null for the nudges from before the first version, which show no channel. */
  channel: z.enum(['text', 'whatsapp', 'copy', 'in-person']).nullable(),
  /** The member checked in within 7 days after it. */
  cameBack: z.boolean(),
})
export type MemberPageNudge = z.infer<typeof MemberPageNudge>

/** The member page. PATCH, archive, restore and add answer it too, so the page can show it straight away. */
export const MemberDetailResponse = z.object({
  member: MemberDetail,
  /** Exactly 90. */
  days: z.array(MemberPageDay),
  /** Newest first. */
  checkins: z.array(MemberPageCheckin),
  /** Newest first, from anyone. */
  nudges: z.array(MemberPageNudge),
})
export type MemberDetailResponse = z.infer<typeof MemberDetailResponse>

// Names, as the add dialog and the name edit take them.

const firstName = z
  .string(withCode('memberFirstName'))
  .transform(cleanName)
  .pipe(z.string().min(1, withCode('memberFirstName')).max(NAME_MAX, withCode('memberFirstName')))

/** Blank, or left out, is no last name. */
const lastName = z
  .string(withCode('generic'))
  .transform(cleanName)
  .pipe(z.string().max(NAME_MAX, withCode('generic')))
  .nullable()
  .transform((v) => v || null)

/** A staff member's id, or null for no coach. */
const coachId = z.int(withCode('coachChoice')).positive(withCode('coachChoice')).nullable()

/** As typed: the API reads it in the gym's country. Blank, or null, is no phone. */
const phone = z.string(withCode('phone')).nullable()

// PATCH /api/members/:id (owners)

/** Only the fields sent change; a refused one saves nothing at all. */
export const MemberPatchRequest = z.object(
  {
    firstName: firstName.optional(),
    lastName: lastName.optional(),
    coachId: coachId.optional(),
    phone: phone.optional(),
  },
  withCode('generic'),
)
export type MemberPatchRequest = z.infer<typeof MemberPatchRequest>

// POST /api/members (owners and coaches)

/** A coach's new member is theirs, whatever coachId says. An owner's has the coach given, or none. */
export const MemberCreateRequest = z.object(
  {
    firstName,
    lastName: lastName.optional(),
    phone: phone.optional(),
    /** Today or earlier, in the gym's time zone. */
    joinedOn: z.string(withCode('joinedOn')).refine(isCalendarDate, withCode('joinedOn')),
    coachId: coachId.optional(),
  },
  withCode('generic'),
)
export type MemberCreateRequest = z.infer<typeof MemberCreateRequest>

// DELETE /api/members/:id (owners, archived members only)

export const MemberDeleteResponse = z.object({ ok: z.literal(true) })
export type MemberDeleteResponse = z.infer<typeof MemberDeleteResponse>
