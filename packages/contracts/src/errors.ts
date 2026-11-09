// Error codes and the error body. The codes are the keys of the copy's API messages: a route answers
// `{ error: { code, message } }` with the message looked up from `copy` by code.
import { z } from 'zod'

export const ERROR_CODES = [
  'loginMismatch',
  'loginTooMany',
  'memberNotFound',
  'linkInvalid',
  'role',
  'duplicate',
  'generic',
  'email',
  'password',
  'phone',
  'server',
  'kioskNotFound',
  'kioskTooMany',
  'kioskFirstName',
  'importTooBig',
  'signIn',
  'json',
  'crossSite',
  'notApi',
  'notFound',
  'passwordTooLong',
  'gymName',
  'yourName',
  'coachName',
  'timezone',
  'qrLink',
  'statusFilter',
  'coachChoice',
  'coachNotFound',
  'coachActive',
  'ownerActive',
  'templateNotFound',
  'templateName',
  'templateChoice',
  'messageBody',
  'tooLarge',
  'signupTooMany',
  // The first version's codes, after the 37 legacy ones (docs/SPEC.md §3).
  'country',
  'memberFirstName',
  'joinedOn',
  'memberNotArchived',
  'memberArchived',
  'resetInvalid',
  'resetTooMany',
  'inviteRole',
] as const

export const ErrorCode = z.enum(ERROR_CODES)
export type ErrorCode = z.infer<typeof ErrorCode>

export const ErrorBody = z.object({
  error: z.object({ code: ErrorCode, message: z.string() }),
})
export type ErrorBody = z.infer<typeof ErrorBody>

/** A zod issue option whose message is an error code: `z.string(withCode('gymName'))`. */
export const withCode = (code: ErrorCode): { error: ErrorCode } => ({ error: code })
