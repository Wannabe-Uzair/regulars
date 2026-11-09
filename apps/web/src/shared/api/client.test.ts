import { MeResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { json, me, mockFetch } from '../../test/fakes.ts'
import { ApiRequestError, del, get, patch, post } from './client.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

const caught = (p: Promise<unknown>) =>
  p.then(
    () => expect.fail('expected a rejection'),
    (e: unknown) => e,
  )

describe('the API client', () => {
  test('returns the parsed answer and sends same-origin JSON', async () => {
    const fetch = mockFetch(() => json(200, me('owner')))
    await expect(post('/api/auth/login', { email: 'a@b.co' }, MeResponse)).resolves.toEqual(me('owner'))
    const init = fetch.mock.calls[0]?.[1]
    expect(init?.credentials).toBe('same-origin')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(init?.body).toBe('{"email":"a@b.co"}')
  })

  test("turns an ErrorBody into ApiRequestError with the server's message", async () => {
    const message = 'Only the owner can do that. Ask your owner.'
    mockFetch(() => json(403, { error: { code: 'role', message } }))
    const error = await caught(get('/api/reports', MeResponse))
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ status: 403, code: 'role', message })
  })

  test('a failed fetch is err.network', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    const error = await caught(get('/api/today', MeResponse))
    expect(error).toMatchObject({ status: 0, code: null, message: t('err.network') })
  })

  test('a 401 on an app call is err.session; a login mismatch keeps the server sentence', async () => {
    mockFetch(() => json(401, { error: { code: 'signIn', message: 'Log in to continue.' } }))
    const ended = await caught(get('/api/today', MeResponse))
    expect(ended).toMatchObject({ status: 401, message: t('err.session'), sessionEnded: true })

    const message = "That email and password don't match."
    mockFetch(() => json(401, { error: { code: 'loginMismatch', message } }))
    expect(await caught(post('/api/auth/login', {}, MeResponse))).toMatchObject({ message, sessionEnded: false })
  })

  test('FR-MEMBER-02 patch sends PATCH with a JSON body and parses the answer', async () => {
    const fetch = mockFetch(() => json(200, me('owner')))
    await expect(patch('/api/members/4', { firstName: 'Sam' }, MeResponse)).resolves.toEqual(me('owner'))
    const [path, init] = fetch.mock.calls[0] ?? []
    expect(path).toBe('/api/members/4')
    expect(init?.method).toBe('PATCH')
    expect(init?.credentials).toBe('same-origin')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(init?.body).toBe('{"firstName":"Sam"}')
  })

  test('FR-MEMBER-07 del sends DELETE with the JSON content type and no body, and errors as the others do', async () => {
    const fetch = mockFetch(() => json(200, me('owner')))
    await expect(del('/api/members/4', MeResponse)).resolves.toEqual(me('owner'))
    const init = fetch.mock.calls[0]?.[1]
    expect(init?.method).toBe('DELETE')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(init?.body).toBeUndefined()

    mockFetch(() => json(404, { error: { code: 'memberNotFound', message: 'gone' } }))
    expect(await caught(del('/api/members/4', MeResponse))).toMatchObject({ status: 404, code: 'memberNotFound' })
  })

  test('an answer without an ErrorBody, or off-contract, is err.server', async () => {
    mockFetch(() => new Response('Bad gateway', { status: 502 }))
    expect(await caught(get('/api/today', MeResponse))).toMatchObject({ status: 502, message: t('err.server') })
    mockFetch(() => json(200, { nope: true }))
    expect(await caught(get('/api/auth/me', MeResponse))).toMatchObject({ status: 200, message: t('err.server') })
  })
})
