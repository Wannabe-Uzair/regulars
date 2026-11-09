// /api/coaches: the staff list, and deactivating or reactivating someone. Owner only.
import { CoachPatch, type CoachesResponse, type CoachPatchResponse } from '@tenure/contracts'
import type { Context } from 'hono'
import { requireOwner } from '../../platform/auth/guards.ts'
import type { AppContext } from '../../platform/context.ts'
import { ApiError } from '../../platform/http/errors.ts'
import { idParam } from '../../platform/http/params.ts'
import { readJson } from '../../platform/http/validate.ts'
import type { AppEnv, Router, SignedInEnv } from '../../platform/module.ts'
import { setStaffActive, staffList } from './service.ts'

/** Behind a guard a handler's context is SignedInEnv's; the platform's readers take the base env. */
const base = (c: Context<AppEnv & SignedInEnv>) => c as unknown as Context<AppEnv>

/** The `:id` as a user id; one that can't be an id answers coachNotFound, as an unknown one does. */
function staffId(c: Context<AppEnv>): number {
  try {
    return idParam(c)
  } catch {
    throw new ApiError('coachNotFound')
  }
}

export function staffRoutes(router: Router, ctx: AppContext) {
  router.get('/coaches', requireOwner, async (c) => c.json((await staffList(ctx, c.var.gym)) satisfies CoachesResponse))

  // The old route's order: the person first (another gym's answers coachNotFound), then the body.
  router.patch('/coaches/:id', requireOwner, async (c) => {
    const id = staffId(base(c))
    if (!(await ctx.repos.users.findInGym(c.var.gym.id, id))) throw new ApiError('coachNotFound')
    const { active } = await readJson(base(c), CoachPatch)
    return c.json((await setStaffActive(ctx, c.var.gym, id, active)) satisfies CoachPatchResponse)
  })
}
