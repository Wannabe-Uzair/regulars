// API errors: a code, an HTTP status and the copy sentence the body carries.
import type { ErrorBody, ErrorCode } from '@tenure/contracts'
import { t, type CopyId } from '@tenure/copy'
import type { ErrorHandler } from 'hono'

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500

/** Each code's usual status, from the old server's messages.mjs and the copy deck's case notes. */
export const ERROR_STATUS = {
  loginMismatch: 401,
  loginTooMany: 429,
  memberNotFound: 404,
  linkInvalid: 404,
  role: 403,
  duplicate: 409,
  generic: 400,
  email: 400,
  password: 400,
  phone: 400,
  server: 500,
  kioskNotFound: 404,
  kioskTooMany: 429,
  kioskFirstName: 400,
  importTooBig: 400, // a CSV over 2 MB; the 4 MB request limit overrides it with 413
  signIn: 401,
  json: 400,
  crossSite: 403,
  notApi: 404,
  notFound: 404,
  passwordTooLong: 400,
  gymName: 400,
  yourName: 400,
  coachName: 400,
  timezone: 400,
  qrLink: 400,
  statusFilter: 400,
  coachChoice: 400,
  coachNotFound: 404,
  coachActive: 400,
  ownerActive: 400,
  templateNotFound: 404, // a nudge naming a template that isn't there overrides it with 400
  templateName: 400,
  templateChoice: 400,
  messageBody: 400,
  tooLarge: 413,
  signupTooMany: 429,
  country: 400, // sign-up or Settings with no country, or one outside the five open markets
  memberFirstName: 400,
  joinedOn: 400, // a member added with no join date, or one after today
  memberNotArchived: 409, // deleting a member who isn't archived
  memberArchived: 409, // the kiosk: a phone or a join that matches an archived member
  resetInvalid: 404, // a reset link that is unknown, used or expired
  resetTooMany: 429,
  inviteRole: 400,
} satisfies Record<ErrorCode, ErrorStatus>

/** Each code's sentence. Four reuse the client-validation ids. */
export const ERROR_COPY = {
  loginMismatch: 'api.loginMismatch',
  loginTooMany: 'api.loginTooMany',
  memberNotFound: 'api.memberNotFound',
  linkInvalid: 'api.linkInvalid',
  role: 'api.role',
  duplicate: 'api.duplicate',
  generic: 'api.generic',
  email: 'err.email',
  password: 'err.password',
  phone: 'err.phone',
  server: 'err.server',
  kioskNotFound: 'api.kioskNotFound',
  kioskTooMany: 'api.kioskTooMany',
  kioskFirstName: 'api.kioskFirstName',
  importTooBig: 'api.importTooBig',
  signIn: 'api.signIn',
  json: 'api.json',
  crossSite: 'api.crossSite',
  notApi: 'api.notApi',
  notFound: 'api.notFound',
  passwordTooLong: 'api.passwordTooLong',
  gymName: 'api.gymName',
  yourName: 'api.yourName',
  coachName: 'api.coachName',
  timezone: 'api.timezone',
  qrLink: 'api.qrLink',
  statusFilter: 'api.statusFilter',
  coachChoice: 'api.coachChoice',
  coachNotFound: 'api.coachNotFound',
  coachActive: 'api.coachActive',
  ownerActive: 'api.ownerActive',
  templateNotFound: 'api.templateNotFound',
  templateName: 'api.templateName',
  templateChoice: 'api.templateChoice',
  messageBody: 'api.messageBody',
  tooLarge: 'api.tooLarge',
  signupTooMany: 'api.signupTooMany',
  country: 'api.country',
  memberFirstName: 'api.memberFirstName',
  joinedOn: 'api.joinedOn',
  memberNotArchived: 'api.memberNotArchived',
  memberArchived: 'api.memberArchived',
  resetInvalid: 'api.resetInvalid',
  resetTooMany: 'api.resetTooMany',
  inviteRole: 'api.inviteRole',
} satisfies Record<ErrorCode, CopyId>

/** Throw from a route or middleware; the error handler answers it as an ErrorBody. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: ErrorStatus

  constructor(code: ErrorCode, status: ErrorStatus = ERROR_STATUS[code]) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export const errorBody = (code: ErrorCode): ErrorBody => ({ error: { code, message: t(ERROR_COPY[code]) } })

/** app.onError: an ApiError answers its code; anything else is logged and answers 500 `server`. */
export const handleError: ErrorHandler = (err, c) => {
  if (err instanceof ApiError) return c.json(errorBody(err.code), err.status)
  console.error(err)
  return c.json(errorBody('server'), ERROR_STATUS.server)
}
