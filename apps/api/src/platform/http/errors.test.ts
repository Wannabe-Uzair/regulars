import { ERROR_CODES, ErrorBody, ErrorCode } from '@tenure/contracts'
import { has, t } from '@tenure/copy'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createApp } from '../../app.ts'
import { call } from '../../test/http.ts'
import { createTestContext } from '../context.ts'
import type { ApiModule } from '../module.ts'
import { ApiError, ERROR_COPY, ERROR_STATUS } from './errors.ts'

const thrower: ApiModule = {
  name: 'thrower',
  register(router) {
    router.get('/throw/:code', (c) => {
      throw new ApiError(ErrorCode.parse(c.req.param('code')))
    })
    router.get('/override', () => {
      throw new ApiError('importTooBig', 413)
    })
    router.get('/boom', () => {
      throw new Error('kaboom')
    })
  },
}
const app = createApp(createTestContext(), [thrower])

afterEach(() => vi.restoreAllMocks())

describe('every error code', () => {
  test('has a status and a copy id that is in the catalogue', () => {
    for (const code of ERROR_CODES) {
      expect([400, 401, 403, 404, 409, 413, 429, 500]).toContain(ERROR_STATUS[code])
      expect(has(ERROR_COPY[code]), `${code} -> ${ERROR_COPY[code]}`).toBe(true)
    }
    expect(Object.keys(ERROR_STATUS).sort()).toEqual([...ERROR_CODES].sort())
    expect(Object.keys(ERROR_COPY).sort()).toEqual([...ERROR_CODES].sort())
  })

  test('the four client-validation codes reuse the err.* sentences', () => {
    expect([ERROR_COPY.email, ERROR_COPY.password, ERROR_COPY.phone, ERROR_COPY.server]).toEqual([
      'err.email',
      'err.password',
      'err.phone',
      'err.server',
    ])
  })

  test.each(ERROR_CODES)('%s answers its status with an ErrorBody whose message is its copy', async (code) => {
    const res = await call(app, 'GET', `/api/throw/${code}`)
    expect(res.status).toBe(ERROR_STATUS[code])
    expect(ErrorBody.parse(res.body)).toEqual({ error: { code, message: t(ERROR_COPY[code]) } })
  })
})

describe('the error handler', () => {
  test('a status can be overridden: importTooBig is 413 for a request over 4 MB', async () => {
    expect(ERROR_STATUS.importTooBig).toBe(400)
    const res = await call(app, 'GET', '/api/override')
    expect([res.status, res.body]).toEqual([413, { error: { code: 'importTooBig', message: t('api.importTooBig') } }])
  })

  test('an unknown error is logged and answers 500 server', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await call(app, 'GET', '/api/boom')
    expect([res.status, res.body]).toEqual([500, { error: { code: 'server', message: t('err.server') } }])
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ message: 'kaboom' }))
  })
})
