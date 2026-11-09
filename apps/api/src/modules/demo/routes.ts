// /api/demo*: whether this is the stall, "Try the demo" and "Reset the demo". The two actions exist in stall mode only,
// and answer 404 anywhere else.
import type { DemoStatus, ResetDemoResponse, TryDemoResponse } from '@tenure/contracts'
import { deleteCookie } from 'hono/cookie'
import { SESSION_COOKIE, startSession } from '../../platform/auth/session.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'
import type { Router } from '../../platform/module.ts'
import { demoOwner, resetTheDemo } from './service.ts'

export function demoRoutes(router: Router, ctx: AppContext, env: Record<string, string | undefined>) {
  const stallOnly = () => {
    if (!ctx.config.stall) throw new ApiError('notFound')
  }

  router.get('/demo', (c) => c.json({ stall: ctx.config.stall } satisfies DemoStatus))

  router.post('/demo/try', async (c) => {
    stallOnly()
    const { userId, ...body } = await demoOwner(ctx)
    await startSession(c, ctx, userId)
    return c.json(body satisfies TryDemoResponse)
  })

  router.post('/demo/reset', async (c) => {
    stallOnly()
    await resetTheDemo(ctx, env)
    // The reset ended this device's demo session too, so its cookie goes; a session at another gym stays.
    if (!c.var.gym || c.var.gym.isDemo) deleteCookie(c, SESSION_COOKIE, { path: '/', secure: ctx.config.secureCookies })
    return c.json({ ok: true } satisfies ResetDemoResponse)
  })
}
