// Route guards. After one of these, a handler's `c.var.actor` and `c.var.gym` are set.
import type { MiddlewareHandler } from 'hono'
import { ApiError } from '../http/errors.ts'
import type { AppEnv, SignedInEnv } from '../module.ts'

/** 401 signIn unless someone is signed in. */
export const requireActor: MiddlewareHandler<AppEnv & SignedInEnv> = async (c, next) => {
  const actor: AppEnv['Variables']['actor'] = c.var.actor
  if (!actor) throw new ApiError('signIn')
  await next()
}

/** 401 signIn unless someone is signed in; 403 role unless they are an owner. */
export const requireOwner: MiddlewareHandler<AppEnv & SignedInEnv> = async (c, next) => {
  const actor: AppEnv['Variables']['actor'] = c.var.actor
  if (!actor) throw new ApiError('signIn')
  if (actor.role !== 'owner') throw new ApiError('role')
  await next()
}
