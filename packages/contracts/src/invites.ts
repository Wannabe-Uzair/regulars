// Invites: an owner invites a coach or a co-owner by email (POST /api/invites); the invite page looks the link up
// (GET /api/invites/:token) and accepts it (POST /api/invites/:token/accept). Every validation issue's message is an
// ErrorCode.
import { z } from 'zod'
import { MeResponse, ROLES, Role } from './auth.ts'
import { withCode } from './errors.ts'
import { IsoInstant } from './wire.ts'

/** Sign-up's email rule: trimmed, lower case, at most 254 characters. */
const email = z
  .string(withCode('email'))
  .trim()
  .toLowerCase()
  .max(254, withCode('email'))
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, withCode('email'))

/** Fields are checked in this order, so the first issue is the one the API answers with. */
export const CreateInviteRequest = z.object(
  {
    /** Where the invite is emailed; the account the invite makes takes this email. */
    email,
    /** Coach or Owner (a co-owner). */
    role: z.enum(ROLES, withCode('inviteRole')),
  },
  withCode('generic'),
)
export type CreateInviteRequest = z.infer<typeof CreateInviteRequest>

export const CreateInviteResponse = z.object({
  /** The invite page, `<origin>/invite/<token>`: on the LAN address when there is one, so a phone can open it. */
  link: z.url(),
  /** 7 days after it was made. The link works once, until then. */
  expiresAt: IsoInstant,
  /** Where it was emailed. */
  email: z.string(),
  role: Role,
})
export type CreateInviteResponse = z.infer<typeof CreateInviteResponse>

/** GET /api/invites/:token: what the invite page shows. A bad, used or expired link answers 404 linkInvalid. */
export const InviteInfo = z.object({
  gymName: z.string(),
  /** The email the new account takes. */
  email: z.string(),
  /** An owner invite makes a co-owner, and the page words it so. */
  role: Role,
})
export type InviteInfo = z.infer<typeof InviteInfo>

/** The invitee's own details; the email and the role come from the invite. */
export const AcceptInviteRequest = z.object(
  {
    name: z.string(withCode('yourName')).trim().min(1, withCode('yourName')).max(80, withCode('yourName')),
    /** Sign-up's rule: 8 to 200 characters. */
    password: z.string(withCode('password')).min(8, withCode('password')).max(200, withCode('passwordTooLong')),
  },
  withCode('generic'),
)
export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequest>

/** The new person, signed in, and their gym. */
export const AcceptInviteResponse = MeResponse
export type AcceptInviteResponse = MeResponse
