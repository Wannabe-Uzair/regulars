// Path parameters.
import type { Context } from 'hono'
import type { AppEnv } from '../module.ts'
import { ApiError } from './errors.ts'

/**
 * The path parameter `name` as a row id: digits only, a safe integer above 0. Anything else answers 404 notFound,
 * as the old server's id() did (legacy/app/server/http.mjs:40-44): no row has that id.
 */
export function idParam(c: Context<AppEnv>, name = 'id'): number {
  const value = c.req.param(name) ?? ''
  const n = /^\d+$/.test(value) ? Number(value) : NaN
  if (!Number.isSafeInteger(n) || n <= 0) throw new ApiError('notFound')
  return n
}
