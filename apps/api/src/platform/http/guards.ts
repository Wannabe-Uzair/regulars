// Request guards for /api/*: body limits and the CSRF check, ported from the old server.
import type { MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { AppEnv } from '../module.ts'
import { ApiError, ERROR_STATUS, errorBody } from './errors.ts'

export const MAX_BODY_BYTES = 64 * 1024
export const MAX_IMPORT_BODY_BYTES = 4 * 1024 * 1024

const smallBody = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => c.json(errorBody('tooLarge'), ERROR_STATUS.tooLarge),
})
// The CSV inside is capped at 2 MB (400 importTooBig); the whole request at 4 MB (413).
const importBody = bodyLimit({
  maxSize: MAX_IMPORT_BODY_BYTES,
  onError: (c) => c.json(errorBody('importTooBig'), 413),
})

/** Cap every API body before anything reads it: 64 KB, or 4 MB under /api/import/. */
export const bodyLimits: MiddlewareHandler<AppEnv> = (c, next) =>
  (c.req.path.startsWith('/api/import/') ? importBody : smallBody)(c, next)

/**
 * CSRF guard for /api mutations: the body must be declared JSON (a cross-site form can't send that without CORS),
 * and an Origin header, when present, must match the host the request was sent to.
 */
export const csrfGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const type = (c.req.header('content-type') ?? '').split(';')[0]?.trim().toLowerCase()
    if (type !== 'application/json') throw new ApiError('json')
    const origin = c.req.header('origin')
    if (origin !== undefined) {
      let host: string | null
      try {
        host = new URL(origin).host
      } catch {
        host = null
      }
      const allowed = [c.req.header('host'), c.req.header('x-forwarded-host')].filter(Boolean)
      if (!host || !allowed.includes(host)) throw new ApiError('crossSite')
    }
  }
  await next()
}
