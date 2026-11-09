// /api/import/*: the CSV import, owner only. The platform caps these bodies at 4 MB (413 importTooBig); the CSV
// inside at 2 MB (400 importTooBig, from the contract).
import { ImportRequest } from '@tenure/contracts'
import type { Context } from 'hono'
import { requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import { readJson } from '../../platform/http/validate.ts'
import type { AppEnv, Router } from '../../platform/module.ts'
import { commitImport, previewImport } from './service.ts'

// readJson takes the platform's Context; a handler behind requireOwner has a narrower one of the same request.
const request = (c: Context) => readJson(c as Context<AppEnv>, ImportRequest)

export function importRoutes(router: Router, ctx: AppContext) {
  router.post('/import/preview', requireOwner, async (c) =>
    c.json(await previewImport(ctx, c.var.gym, await request(c))),
  )

  router.post('/import/commit', requireOwner, async (c) => c.json(await commitImport(ctx, c.var.gym, await request(c))))
}
