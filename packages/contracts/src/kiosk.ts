// The kiosk at /kiosk/:token (FR-KIOSK-01 to 06): the gym, the check-in, the name search and the join. No session:
// the token in the path is the gym's secret. Every issue's message is an ErrorCode, which the API answers.
import { KIOSK_GREETINGS, KIOSK_HITS, KIOSK_VISITS_LINES } from '@tenure/domain'
import { z } from 'zod'
import { type ErrorCode, withCode } from './errors.ts'
import { Status } from './members.ts'
import { Id } from './wire.ts'

/** The longest first name, last name or phone the kiosk takes. */
export const KIOSK_TEXT_MAX = 40

/** GET /api/kiosk/:token. The country, so the keypad can show the number in its own grouping as it's typed. */
export const KioskGymResponse = z.object({
  gymName: z.string(),
  /** The demo gym: the kiosk shows the Sample data tag. */
  isDemo: z.boolean(),
  /** ISO 3166-1 alpha-2, such as `US`: the kiosk reads phones in it. The same schema as AuthGym's. */
  country: z.string(),
})
export type KioskGymResponse = z.infer<typeof KioskGymResponse>

const refuse = (ctx: z.RefinementCtx, code: ErrorCode) => {
  ctx.addIssue({ code: 'custom', message: code })
  return z.NEVER
}

/**
 * POST /api/kiosk/:token/checkin, as the old kiosk read it: a `memberId` that isn't null wins, and must be a row id
 * (anything else is `memberNotFound`, a 404); otherwise a `phone` that is text, as typed, up to 40 characters (longer
 * is `phone`); with neither, `generic`. The server reads the phone in the gym's country.
 */
export const KioskCheckinRequest = z
  .object({ memberId: z.unknown().optional(), phone: z.unknown().optional() })
  .transform((body, ctx): { memberId: number } | { phone: string } => {
    if (body.memberId !== undefined && body.memberId !== null) {
      const id = Id.safeParse(body.memberId)
      return id.success ? { memberId: id.data } : refuse(ctx, 'memberNotFound')
    }
    if (typeof body.phone !== 'string') return refuse(ctx, 'generic')
    return body.phone.length > KIOSK_TEXT_MAX ? refuse(ctx, 'phone') : { phone: body.phone }
  })
export type KioskCheckinRequest = z.output<typeof KioskCheckinRequest>
/** What the kiosk screen posts to check in. */
export type KioskCheckinBody = { memberId: number } | { phone: string }

/** A name as the kiosk stores it: composed (NFC), trimmed, each run of spaces as one. */
const cleanName = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ')

/** Missing, null or blank is none; other text is cleaned and kept up to 40 characters; anything else is `code`. */
const optionalText = (code: ErrorCode, clean: (s: string) => string) =>
  z
    .union([z.string(withCode(code)), z.null()], withCode(code))
    .optional()
    .transform((v) => (v ? clean(v) : '') || null)
    .refine((v) => v === null || v.length <= KIOSK_TEXT_MAX, withCode(code))

/**
 * POST /api/kiosk/:token/join, checked in this order, so the first field that fails is the one answered: a first
 * name, 1 to 40 characters (`kioskFirstName`); an optional last name (`generic`); an optional phone (`phone`), as
 * typed. A blank last name or phone is none (FR-KIOSK-04, data-fixes.test.mjs).
 */
export const KioskJoinRequest = z.object({
  firstName: z
    .string(withCode('kioskFirstName'))
    .transform(cleanName)
    .pipe(z.string().min(1, withCode('kioskFirstName')).max(KIOSK_TEXT_MAX, withCode('kioskFirstName'))),
  lastName: optionalText('generic', cleanName),
  phone: optionalText('phone', (s) => s.trim()),
})
export type KioskJoinRequest = z.output<typeof KioskJoinRequest>
/** What the kiosk screen posts to join. */
export type KioskJoinBody = { firstName: string; lastName?: string; phone?: string }

/** GET /api/kiosk/:token/search?q=. A missing q finds nobody. */
export const KioskSearchQuery = z.object({ q: z.string().optional() })
export type KioskSearchQuery = z.infer<typeof KioskSearchQuery>

/** A member found by name: only the first name and the last initial ("Sam O."), or a single name alone. */
export const KioskSearchHit = z.object({ memberId: Id, name: z.string() })
export type KioskSearchHit = z.infer<typeof KioskSearchHit>

/** At most 6 hits, archived members left out. */
export const KioskSearchResponse = z.array(KioskSearchHit).max(KIOSK_HITS)
export type KioskSearchResponse = z.infer<typeof KioskSearchResponse>

/**
 * The answer to a check-in or a join (FR-KIOSK-05): what the welcome's words need. `greeting` picks the headline
 * (`kiosk.welcome.first`, `.back` with `weekNumber` as {n}, or `.plain`), and `visitsLine` the line under it
 * (`kiosk.welcome.line`, `.visit`, or `.visits` with `visitsThisWeek` as {n}).
 */
export const KioskWelcome = z.object({
  firstName: z.string(),
  greeting: z.enum(KIOSK_GREETINGS),
  /** The current week, 0 to 12, as the board counts it. */
  week: z.int().min(0).max(12),
  /** "Week {n}": 1 to 13. */
  weekNumber: z.int().min(1).max(13),
  /** Days since joining; negative for a join date after today (an import can write one). */
  day: z.int(),
  /** Visits in the member's current 7-day block: at most 7. */
  visitsThisWeek: z.int().min(0).max(7),
  visitsLine: z.enum(KIOSK_VISITS_LINES),
  status: Status,
})
export type KioskWelcome = z.infer<typeof KioskWelcome>
