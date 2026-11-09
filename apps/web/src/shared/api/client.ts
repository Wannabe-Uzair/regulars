// The typed API client. Every call is same-origin JSON; every answer is checked against its contracts schema.
import { ErrorBody, type ErrorCode } from '@tenure/contracts'
import { t } from '@tenure/copy'

/** Anything that turns unknown JSON into a T or throws: every contracts (zod) schema fits. */
export type Schema<T> = { parse(data: unknown): T }

/** A call that didn't succeed. `message` is the sentence to show, as the server sent it. */
export class ApiRequestError extends Error {
  /** The HTTP status; 0 when the request never reached the server. */
  readonly status: number
  /** The server's error code; null when there was no readable ErrorBody. */
  readonly code: ErrorCode | null

  constructor(status: number, code: ErrorCode | null, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }

  /** The session ended (401 on any route but login): the app sends the user back to log in. */
  get sessionEnded(): boolean {
    return this.status === 401 && this.code === 'signIn'
  }
}

function errorFrom(status: number, data: unknown): ApiRequestError {
  const body = ErrorBody.safeParse(data)
  if (!body.success) return new ApiRequestError(status, null, t('err.server'))
  const { code, message } = body.data.error
  if (status === 401 && code === 'signIn') return new ApiRequestError(status, code, t('err.session'))
  return new ApiRequestError(status, code, message)
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/**
 * Every method but GET declares a JSON body, DELETE's included though it sends none: the API's CSRF guard refuses a
 * mutation without that header.
 */
async function request<T>(method: Method, path: string, body: unknown, schema: Schema<T>): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers,
      ...(method === 'GET' || method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new ApiRequestError(0, null, t('err.network'))
  }
  const data: unknown = await res.json().catch(() => undefined)
  if (!res.ok) throw errorFrom(res.status, data)
  try {
    return schema.parse(data)
  } catch {
    // The answer doesn't match the contract: nothing the user can fix.
    throw new ApiRequestError(res.status, null, t('err.server'))
  }
}

export function get<T>(path: string, schema: Schema<T>): Promise<T> {
  return request('GET', path, undefined, schema)
}

export function post<T>(path: string, body: unknown, schema: Schema<T>): Promise<T> {
  return request('POST', path, body, schema)
}

export function patch<T>(path: string, body: unknown, schema: Schema<T>): Promise<T> {
  return request('PATCH', path, body, schema)
}

export function del<T>(path: string, schema: Schema<T>): Promise<T> {
  return request('DELETE', path, undefined, schema)
}
