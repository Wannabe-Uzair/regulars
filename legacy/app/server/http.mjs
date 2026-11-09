import { MSG } from './messages.mjs'
// Shared request helpers: errors as { error }, JSON bodies, small validators.
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
export const fail = (status, message) => { throw new ApiError(status, message) }

/** The JSON object body, or 400. */
export async function readJson(c) {
  let body
  try { body = await c.req.json() } catch { fail(400, MSG.generic) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, MSG.generic)
  return body
}

/** A trimmed string of min..max characters, or 400 with `message`. */
export function text(value, { min = 1, max = 200, message }) {
  if (typeof value !== 'string') fail(400, message)
  const v = value.trim()
  if (v.length < min || v.length > max) fail(400, message)
  return v
}

export function email(value) {
  const v = text(value, { max: 254, message: MSG.email }).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(400, MSG.email)
  return v
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8) fail(400, MSG.password)
  if (value.length > 200) fail(400, MSG.passwordTooLong)
  return value
}

/** A positive integer id from a path/body value, or 404/400. */
export function id(value, { status = 404, message = MSG.notFound } = {}) {
  const n = typeof value === 'number' ? value : /^\d+$/.test(String(value)) ? Number(value) : NaN
  if (!Number.isSafeInteger(n) || n <= 0) fail(status, message)
  return n
}

/** The request's origin as the browser sees it (http://host:port). */
export const originOf = (c) => new URL(c.req.url).origin
