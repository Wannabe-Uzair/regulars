// Stall mode: serve the built client (../client/dist) after /api, with the SPA fallback to index.html.
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serveStatic } from '@hono/node-server/serve-static'

export const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'dist')
export const hasClientBuild = (dist = CLIENT_DIST) => existsSync(path.join(dist, 'index.html'))

/** mountClient for createApp: static files (hashed /assets/* cached for a year), then index.html for app routes. */
export function clientMounter(dist = CLIENT_DIST) {
  return (app) => {
    app.use('*', async (c, next) => {
      c.header('Cache-Control', c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
      await next()
    })
    app.use('*', serveStatic({ root: dist }))
    // Client routes (/, /board, /members/12, /kiosk/<token>…) get the app; a missing file (a dot in the last segment) is a 404.
    app.get('*', (c, next) => (path.posix.basename(c.req.path).includes('.') ? next() : serveStatic({ path: path.join(dist, 'index.html') })(c, next)))
  }
}
