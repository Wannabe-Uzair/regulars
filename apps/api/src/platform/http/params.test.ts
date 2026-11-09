import { t } from '@tenure/copy'
import { expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { call } from '../../test/http.ts'
import { createTestContext } from '../context.ts'
import type { ApiModule } from '../module.ts'
import { idParam } from './params.ts'

const probe: ApiModule = {
  name: 'probe',
  register(router) {
    router.get('/probe/:id', (c) => c.json({ id: idParam(c) }))
    router.get('/probe/:memberId/named', (c) => c.json({ id: idParam(c, 'memberId') }))
  },
}
const app = createApp(createTestContext(), [probe])

test('FR-PRIV-02 idParam reads a positive integer id, by any param name', async () => {
  expect((await call(app, 'GET', '/api/probe/12')).body).toEqual({ id: 12 })
  expect((await call(app, 'GET', '/api/probe/9007199254740991')).body).toEqual({ id: 9007199254740991 })
  expect((await call(app, 'GET', '/api/probe/7/named')).body).toEqual({ id: 7 })
})

test.each(['abc', '0', '00', '-1', '1.5', '1e3', '%2012', '12abc', '9007199254740993'])(
  'FR-PRIV-02 idParam answers 404 notFound for %s',
  async (id) => {
    const res = await call(app, 'GET', `/api/probe/${id}`)
    expect([res.status, res.body]).toEqual([404, { error: { code: 'notFound', message: t('api.notFound') } }])
  },
)
