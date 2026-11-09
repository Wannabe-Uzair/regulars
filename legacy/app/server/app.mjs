// createApp({ db, now }) -> the Hono app. Tests call app.request(...) without a port; index.mjs serves it.
import { Hono } from 'hono'
import { ApiError } from './http.mjs'
import { loadSession, csrfGuard } from './auth.mjs'
import { createEventBus } from './events.mjs'
import { authRoutes } from './routes/auth.mjs'
import { memberRoutes } from './routes/members.mjs'
import { staffRoutes } from './routes/staff.mjs'
import { templateRoutes } from './routes/templates.mjs'
import { nudgeRoutes } from './routes/nudges.mjs'
import { gymRoutes } from './routes/gym.mjs'
import { importRoutes } from './routes/import.mjs'
import { reportRoutes } from './routes/reports.mjs'
import { kioskRoutes } from './routes/kiosk.mjs'
import { eventRoutes } from './routes/events.mjs'
import { MSG } from './messages.mjs'
import { bodyLimit } from 'hono/body-limit'

export const MAX_BODY_BYTES = 64 * 1024
export const MAX_IMPORT_BODY_BYTES = 4 * 1024 * 1024

/**
 * @param {object} o
 * @param {import('node:sqlite').DatabaseSync} o.db  from openDb()
 * @param {() => Date} [o.now]                       injectable clock
 * @param {number} [o.port]                          the listening port, for phone URLs
 * @param {() => string[]} [o.lan]                   LAN IPv4 addresses (default: from os.networkInterfaces)
 * @param {(app: Hono, deps: object) => void} [o.mountClient]  serves the built client after /api (wave 2: `npm run stall`)
 */
export function createApp({ db, now = () => new Date(), port = Number(process.env.PORT) || 5175, lan, events = createEventBus(), mountClient } = {}) {
  const deps = { db, now, port, events, ...(lan ? { lan } : {}) }
  const app = new Hono()

  app.onError((err, c) => {
    if (err instanceof ApiError) return c.json({ error: err.message }, err.status)
    console.error(err)
    return c.json({ error: MSG.server }, 500)
  })

  // Cap every API body before anything reads it: 64 KB, or 4 MB for an import (its CSV is capped at 2 MB inside).
  const smallBody = bodyLimit({ maxSize: MAX_BODY_BYTES, onError: (c) => c.json({ error: MSG.tooLarge }, 413) })
  const importBody = bodyLimit({ maxSize: MAX_IMPORT_BODY_BYTES, onError: (c) => c.json({ error: MSG.importTooBig }, 413) })
  app.use('/api/*', (c, next) => (c.req.path.startsWith('/api/import/') ? importBody : smallBody)(c, next))
  app.use('/api/*', csrfGuard)
  app.use('/api/*', loadSession(deps))

  // Kiosk routes need no login (authorised by the kiosk token, with their own rate limit).
  for (const routes of [authRoutes, memberRoutes, staffRoutes, templateRoutes, nudgeRoutes, gymRoutes, importRoutes, reportRoutes, kioskRoutes, eventRoutes]) {
    app.route('/api', routes(deps))
  }

  app.all('/api/*', (c) => c.json({ error: MSG.notApi }, 404))

  if (mountClient) mountClient(app, deps)

  app.deps = deps // for tests and wave-2 wiring (e.g. the seed, the SSE endpoint)
  return app
}
