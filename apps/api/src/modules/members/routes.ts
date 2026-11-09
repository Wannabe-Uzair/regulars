// /api/members: the lists by view, the member page, edits (owners), add, archive, restore and permanent delete
// (owners).
import {
  MemberCreateRequest,
  type MemberDeleteResponse,
  type MemberDetailResponse,
  MemberPatchRequest,
  MembersQuery,
  type MembersResponse,
} from '@tenure/contracts'
import type { Context } from 'hono'
import { requireActor, requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import { idParam } from '../../platform/http/params.ts'
import { readJson, readQuery } from '../../platform/http/validate.ts'
import type { AppEnv, Router, SignedInEnv } from '../../platform/module.ts'
import { addMember, deleteMember, listMembers, memberPage, patchMember, setArchived } from './service.ts'

/**
 * A guarded handler's context for the platform's readers (idParam, readJson, readQuery), which take a
 * Context<AppEnv>: the signed-in env only narrows actor and gym, but Hono's Context is invariant in its env.
 */
const plain = (c: Context<AppEnv & SignedInEnv>) => c as unknown as Context<AppEnv>

export function memberRoutes(router: Router, ctx: AppContext) {
  router.get('/members', requireActor, async (c) => {
    const { view } = readQuery(plain(c), MembersQuery)
    return c.json((await listMembers(ctx, c.var.actor, c.var.gym, view)) satisfies MembersResponse)
  })

  router.post('/members', requireActor, async (c) => {
    const input = await readJson(plain(c), MemberCreateRequest)
    return c.json((await addMember(ctx, c.var.actor, c.var.gym, input)) satisfies MemberDetailResponse, 201)
  })

  router.get('/members/:id', requireActor, async (c) => {
    const id = idParam(plain(c))
    return c.json((await memberPage(ctx, c.var.actor, c.var.gym, id)) satisfies MemberDetailResponse)
  })

  router.patch('/members/:id', requireOwner, async (c) => {
    const id = idParam(plain(c))
    const input = await readJson(plain(c), MemberPatchRequest)
    return c.json((await patchMember(ctx, c.var.actor, c.var.gym, id, input)) satisfies MemberDetailResponse)
  })

  router.delete('/members/:id', requireOwner, async (c) => {
    await deleteMember(ctx, c.var.actor, c.var.gym, idParam(plain(c)))
    return c.json({ ok: true } satisfies MemberDeleteResponse)
  })

  router.post('/members/:id/archive', requireActor, async (c) => {
    const id = idParam(plain(c))
    return c.json((await setArchived(ctx, c.var.actor, c.var.gym, id, true)) satisfies MemberDetailResponse)
  })

  router.post('/members/:id/restore', requireActor, async (c) => {
    const id = idParam(plain(c))
    return c.json((await setArchived(ctx, c.var.actor, c.var.gym, id, false)) satisfies MemberDetailResponse)
  })
}
