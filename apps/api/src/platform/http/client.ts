// Stall mode: serve the built web app (apps/web/dist) after /api, with the SPA fallback to index.html.
import { serveStatic } from '@hono/node-server/serve-static'
import type { Context, Hono } from 'hono'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { AppEnv } from '../module.ts'

export const WEB_DIST = path.join(import.meta.dirname, '..', '..', '..', '..', 'web', 'dist')

export const hasWebBuild = (dist = WEB_DIST) => existsSync(path.join(dist, 'index.html'))

const YEAR = 'public, max-age=31536000, immutable'

/**
 * Static files, then index.html for app routes. Mount it after the /api catch-all, so /api/* never reaches the
 * fallback. Only a file that exists under /assets/ (Vite's hashed output) is cached for a year. Everything else is
 * no-cache, a 404 under /assets/ and the index.html fallback for /assets/ itself included, so a phone that asks for a
 * chunk from an older build doesn't keep the miss.
 */
export function mountWebApp(app: Hono<AppEnv>, dist = WEB_DIST) {
  const assets = path.join(dist, 'assets') + path.sep
  // The requests whose file serveStatic found under assets/; decided after it answers, not from the path.
  const hashed = new WeakSet<Context>()
  app.use('*', async (c, next) => {
    await next()
    c.header('Cache-Control', hashed.has(c) && c.res.ok ? YEAR : 'no-cache')
  })
  app.use('*', serveStatic({ root: dist, onFound: (file, c) => void (file.startsWith(assets) && hashed.add(c)) }))
  // App routes (/, /app, /members/12, /kiosk/<token>…) get the app; a missing file (a dot in the last segment) is a 404.
  const index = serveStatic({ path: path.join(dist, 'index.html') })
  app.get('*', (c, next) => (path.posix.basename(c.req.path).includes('.') ? next() : index(c, next)))
}
