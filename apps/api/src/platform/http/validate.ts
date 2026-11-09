// Request input checked against a contracts schema: a JSON object body, or the query string.
import { ErrorCode } from '@tenure/contracts'
import type { Context } from 'hono'
import type { z } from 'zod'
import type { AppEnv } from '../module.ts'
import { ApiError } from './errors.ts'

/** A schema failure answers its first issue's message when that is an ErrorCode, else `generic`. */
function refuse(error: z.ZodError): never {
  const code = ErrorCode.safeParse(error.issues[0]?.message)
  throw new ApiError(code.success ? code.data : 'generic')
}

/**
 * The body parsed by `schema`. Not JSON, or not an object: `generic`, as the old server answered. A schema failure
 * answers its first issue's message when that is an ErrorCode (contracts put one in each issue), else `generic`.
 */
export async function readJson<S extends z.ZodType>(c: Context<AppEnv>, schema: S): Promise<z.output<S>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new ApiError('generic')
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ApiError('generic')
  const result = schema.safeParse(body)
  if (result.success) return result.data
  refuse(result.error)
}

/**
 * The query string parsed by `schema`, one value per name (the first, when a name repeats). A failure answers the way
 * a body's does: its first issue's code, with that code's status, else `generic`.
 */
export function readQuery<S extends z.ZodType>(c: Context<AppEnv>, schema: S): z.output<S> {
  const result = schema.safeParse(c.req.query())
  if (result.success) return result.data
  refuse(result.error)
}
