// Calls into the app the way the old server's tests did: a Host header, and JSON unless told otherwise.
import type { Hono } from 'hono'
import type { AppEnv } from '../platform/module.ts'

export const HOST = 'tenure.test:5175'

type CallOptions = { body?: unknown; headers?: Record<string, string>; cookie?: string }

/** fetch-like call into the app. Returns { status, body, res }. */
export async function call(
  app: Hono<AppEnv>,
  method: string,
  path: string,
  { body, headers = {}, cookie }: CallOptions = {},
) {
  const h: Record<string, string> = { host: HOST, ...headers }
  if (cookie) h.cookie = cookie
  if (method !== 'GET' && !('content-type' in h)) h['content-type'] = 'application/json'
  const res = await app.request(`http://${HOST}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const type = res.headers.get('content-type') ?? ''
  return { status: res.status, body: (type.includes('json') ? await res.json() : await res.text()) as unknown, res }
}

/** The 'tenure_session=…' pair from a response, for the Cookie header. */
export const cookieOf = (res: Response) => (res.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
