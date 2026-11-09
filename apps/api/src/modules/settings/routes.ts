// /api/settings (owner only) and /api/qr (anyone signed in).
import { QrQuery, SettingsPatch, type SettingsResponse } from '@tenure/contracts'
import type { Context } from 'hono'
import { requireActor, requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'
import { readJson, readQuery } from '../../platform/http/validate.ts'
import type { AppEnv, Router, SignedInEnv } from '../../platform/module.ts'
import { qrSvg, settingsView, updateSettings } from './service.ts'

/** The address the request came to, as the old server's originOf read it: the kiosk link when there is no LAN. */
const originOf = (c: Pick<Context, 'req'>) => new URL(c.req.url).origin

/**
 * readJson and readQuery take a plain AppEnv context, which a handler behind a guard (SignedInEnv) isn't assignable
 * to, though they only read `c.req`. Until platform/http/validate.ts accepts any AppEnv, this hands them the same
 * context under the type they take.
 */
const plain = (c: Context<AppEnv & SignedInEnv>) => c as unknown as Context<AppEnv>

export function settingsRoutes(router: Router, ctx: AppContext) {
  router.get('/settings', requireOwner, (c) =>
    c.json(settingsView(ctx, c.var.gym, originOf(c)) satisfies SettingsResponse),
  )

  router.patch('/settings', requireOwner, async (c) => {
    const patch = await readJson(plain(c), SettingsPatch)
    return c.json((await updateSettings(ctx, c.var.gym, patch, originOf(c))) satisfies SettingsResponse)
  })

  router.get('/qr', requireActor, async (c) => {
    const { text } = readQuery(plain(c), QrQuery)
    const svg = await qrSvg(ctx, c.var.gym, originOf(c), text)
    if (svg === null) throw new ApiError('qrLink')
    return c.body(svg, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=300' })
  })
}
