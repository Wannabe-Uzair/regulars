// createApp(ctx) -> the Hono app. Tests call app.request(...) without a port; main.ts serves it.
import { Hono } from 'hono'
import { defaultModules } from './modules/index.ts'
import type { AppContext } from './platform/context.ts'
import { loadSession } from './platform/auth/session.ts'
import { hasWebBuild, mountWebApp, WEB_DIST } from './platform/http/client.ts'
import { ApiError, handleError } from './platform/http/errors.ts'
import { compression, securityHeaders } from './platform/http/headers.ts'
import { bodyLimits, csrfGuard } from './platform/http/guards.ts'
import type { ApiModule, AppEnv } from './platform/module.ts'

/** In stall mode (`ctx.config.stall`) the built web app at `webDist` is served too, when it exists. */
export function createApp(
  ctx: AppContext,
  modules: readonly ApiModule[] = defaultModules,
  { webDist = WEB_DIST }: { webDist?: string } = {},
) {
  const app = new Hono<AppEnv>()
  app.onError(handleError)

  // Response-side, around everything below: the security headers on every answer, then compression for text.
  app.use('*', securityHeaders)
  app.use('*', compression)

  // The old server's order: cap the body before anything reads it, then the CSRF check, then the session.
  app.use('/api/*', bodyLimits)
  app.use('/api/*', csrfGuard)
  app.use('/api/*', loadSession(ctx))

  for (const module of modules) {
    const router = new Hono<AppEnv>()
    module.register(router, ctx)
    module.subscribe?.(ctx.bus, ctx)
    app.route('/api', router)
  }

  app.all('/api/*', () => {
    throw new ApiError('notApi')
  })

  if (ctx.config.stall && hasWebBuild(webDist)) mountWebApp(app, webDist)

  return app
}
