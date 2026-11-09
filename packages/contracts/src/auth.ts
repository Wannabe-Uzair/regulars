// Auth: sign-up, log in, log out and me. Every validation issue's message is an ErrorCode.
import { isValidTimeZone, OPEN_MARKETS } from '@tenure/domain'
import { z } from 'zod'
import { ErrorCode, withCode } from './errors.ts'
import { Id, IsoDate } from './wire.ts'

export const ROLES = ['owner', 'coach'] as const
export const Role = z.enum(ROLES)
export type Role = z.infer<typeof Role>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A trimmed string of 1..max characters. */
const text = (max: number, code: ErrorCode) =>
  z.string(withCode(code)).trim().min(1, withCode(code)).max(max, withCode(code))

const email = z.string(withCode('email')).trim().toLowerCase().max(254, withCode('email')).regex(EMAIL, withCode('email'))

const password = z.string(withCode('password')).min(8, withCode('password')).max(200, withCode('passwordTooLong'))

/** A gym's country: one of the open markets (FR-GLOBAL-01). Anything else, or none, is refused with `country`. */
export const MarketCountry = z.enum(OPEN_MARKETS, withCode('country'))
export type MarketCountry = z.infer<typeof MarketCountry>

/**
 * Fields are checked in the old route's order, so the first issue is the one it answered with; the country, new,
 * comes last.
 */
export const SignupRequest = z.object(
  {
    gymName: text(80, 'gymName'),
    name: text(80, 'yourName'),
    email,
    password,
    /**
     * The browser's IANA time zone. The gym keeps it when it is in the chosen country, and otherwise, or when it is
     * absent, takes the country's own zone (answers.md, 7 Nov).
     */
    timezone: z.string(withCode('timezone')).refine(isValidTimeZone, withCode('timezone')).optional(),
    /** Required: a missing or unlisted country is refused with `country` (FR-AUTH-02). */
    country: MarketCountry,
  },
  withCode('generic'),
)
/** What a client sends. */
export type SignupRequest = z.input<typeof SignupRequest>
/** What the API reads: the request after parsing, with the names trimmed and the email lowercased. */
export type SignupInput = z.output<typeof SignupRequest>

// Login answers every bad field like a wrong password, so it reveals nothing about which part failed.
const mismatch = withCode('loginMismatch')
export const LoginRequest = z.object(
  {
    email: z.string(mismatch).trim().toLowerCase().max(254, mismatch).regex(EMAIL, mismatch),
    password: z.string(mismatch).min(8, mismatch).max(200, mismatch),
  },
  withCode('generic'),
)
export type LoginRequest = z.infer<typeof LoginRequest>

/** The signed-in user as routes see it (`c.var.actor`). */
export const Actor = z.object({
  id: Id,
  gymId: Id,
  role: Role,
  name: z.string(),
  email: z.string(),
})
export type Actor = z.infer<typeof Actor>

export const AuthUser = z.object({
  id: Id,
  name: z.string(),
  email: z.string(),
  role: Role,
})
export type AuthUser = z.infer<typeof AuthUser>

/** The gym as any signed-in user sees it. The kiosk token is not here: only the owner's settings carry it. */
export const AuthGym = z.object({
  id: Id,
  name: z.string(),
  slug: z.string(),
  isDemo: z.boolean(),
  timezone: z.string(),
  /** ISO 3166-1 alpha-2, such as `US`: phones are read and dates shown in it. */
  country: z.string(),
  plan: z.string(),
  pilotStartedOn: IsoDate.nullable(),
})
export type AuthGym = z.infer<typeof AuthGym>

export const MeResponse = z.object({ user: AuthUser, gym: AuthGym })
export type MeResponse = z.infer<typeof MeResponse>

/**
 * GET /api/auth/session: `session` is what me answers, or null when no one is signed in. It answers 200 either way, so the public
 * sign-in pages can ask without a 401 in the browser's console (B2-24).
 */
export const SessionResponse = z.object({ session: MeResponse.nullable() })
export type SessionResponse = z.infer<typeof SessionResponse>

export const SignupResponse = MeResponse
export type SignupResponse = MeResponse

export const LoginResponse = MeResponse
export type LoginResponse = MeResponse

export const LogoutResponse = z.object({ ok: z.literal(true) })
export type LogoutResponse = z.infer<typeof LogoutResponse>
