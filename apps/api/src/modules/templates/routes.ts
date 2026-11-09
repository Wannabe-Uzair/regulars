// /api/templates: everyone signed in lists and renders; owners create, edit and delete.
import {
  CreateTemplateRequest,
  type DeleteTemplateResponse,
  RenderRequest,
  type RenderResponse,
  type Template,
  type TemplatesResponse,
  UpdateTemplateRequest,
} from '@tenure/contracts'
import type { Context } from 'hono'
import { requireActor, requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import { idParam } from '../../platform/http/params.ts'
import { readJson } from '../../platform/http/validate.ts'
import type { AppEnv, Router, SignedInEnv } from '../../platform/module.ts'
import { createTemplate, deleteTemplate, ensureTemplate, listTemplates, renderFor, updateTemplate } from './service.ts'

/**
 * platform's readJson, readQuery and idParam take a Context<AppEnv>; behind requireActor or requireOwner the context
 * is AppEnv & SignedInEnv, which TypeScript won't pass for it (Context#set is invariant). They read only `c.req`.
 */
const plain = (c: Context<AppEnv & SignedInEnv>): Context<AppEnv> => c as unknown as Context<AppEnv>

export function templatesRoutes(router: Router, ctx: AppContext) {
  router.get('/templates', requireActor, async (c) => c.json((await listTemplates(ctx, c.var.gym)) satisfies TemplatesResponse))

  router.post('/templates/render', requireActor, async (c) => {
    const input = await readJson(plain(c), RenderRequest)
    const body = await renderFor(ctx, c.var.actor, c.var.gym, input)
    return c.json({ body } satisfies RenderResponse)
  })

  router.post('/templates', requireOwner, async (c) => {
    const input = await readJson(plain(c), CreateTemplateRequest)
    return c.json((await createTemplate(ctx, c.var.gym, input)) satisfies Template, 201)
  })

  router.patch('/templates/:id', requireOwner, async (c) => {
    const id = idParam(plain(c))
    await ensureTemplate(ctx, c.var.gym, id)
    const edit = await readJson(plain(c), UpdateTemplateRequest)
    return c.json((await updateTemplate(ctx, c.var.gym, id, edit)) satisfies Template)
  })

  router.delete('/templates/:id', requireOwner, async (c) => {
    await deleteTemplate(ctx, c.var.gym, idParam(plain(c)))
    return c.json({ ok: true } satisfies DeleteTemplateResponse)
  })
}
