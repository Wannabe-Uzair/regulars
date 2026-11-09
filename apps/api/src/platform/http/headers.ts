// Response-side middleware for everything the server answers: the SPA, the assets, the API and its errors.
import type { MiddlewareHandler } from 'hono'
import { compress } from 'hono/compress'

/**
 * No Strict-Transport-Security: the stall runs over plain http. No full CSP yet: index.html has an inline theme script,
 * and a CSP comes later with its hash. Referrer-Policy same-origin sends no referrer to another site, so a kiosk token
 * in a path never leaks, yet keeps a same-origin request's Origin real: no-referrer would turn a form post's Origin into
 * "null", which the cross-site guard refuses.
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
} as const

/** Set after the response is built, so an answer from onError or from a guard gets them too. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) c.header(name, value)
}

/**
 * gzip (or deflate) for text: HTML, JS, CSS, JSON, SVG, when the client asks for it. hono's filter leaves
 * text/event-stream alone, and it pipes a body rather than reading it, so /api/events streams as before.
 */
export const compression: MiddlewareHandler = compress()
