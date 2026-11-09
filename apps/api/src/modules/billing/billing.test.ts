import { BillingResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { expect, test } from 'vitest'
import type { Clock } from '../../platform/context.ts'
import { call } from '../../test/http.ts'
import { makeWorld } from '../../test/world.ts'

const billingAt = async (clock?: Clock, timezone?: string) => {
  const w = await makeWorld(clock ? { clock } : {})
  if (timezone) await w.ctx.repos.gyms.updateSettings(w.gym.id, { name: w.gym.name, timezone })
  const r = await call(w.app, 'GET', '/api/billing', { cookie: await w.login(w.owner.email) })
  expect(r.status).toBe(200)
  return BillingResponse.strict().parse(r.body)
}

// Ported from legacy/app/server/test/gym.test.mjs. FR-BILL-01 drops the old body's plan, days left and price.
test('FR-BILL-01 billing: pilot day N of 90', async () => {
  // The world's pilot started 23 days before TEST_NOW's day, 6 Nov 2026.
  expect(await billingAt()).toEqual({ pilotStartedOn: '2026-10-14', pilotDay: 24, endsOn: '2027-01-11', ended: false })
})

test("FR-BILL-01 billing counts the gym's local day and stops at day 90", async () => {
  // 03:00Z on 7 Nov is still 6 Nov in Chicago: day 24, not 25.
  expect((await billingAt(() => new Date('2026-11-07T03:00:00.000Z'))).pilotDay).toBe(24)
  expect((await billingAt(() => new Date('2026-11-07T06:00:00.000Z'))).pilotDay).toBe(25)
  // 88 and 89 days after the start (11 Jan 2027 is day 90); 200 days after it, only `ended` tells.
  expect((await billingAt(() => new Date('2027-01-10T18:00:00.000Z'))).pilotDay).toBe(89)
  expect((await billingAt(() => new Date('2027-01-11T18:00:00.000Z'))).pilotDay).toBe(90)
  const late = await billingAt(() => new Date('2027-05-02T18:00:00.000Z'))
  expect([late.pilotDay, late.ended]).toEqual([90, true])
})

test('FR-BILL-01 the pilot has ended from day 91: 23:59 and 00:00 gym time on days 90 and 91', async () => {
  // Chicago is UTC-6 in January. Day 90 is 11 Jan 2027, and ends on it.
  const at = (iso: string) => billingAt(() => new Date(iso))
  const last = await at('2027-01-12T05:59:00.000Z') // 23:59 on 11 Jan, day 90
  expect([last.pilotDay, last.ended, last.endsOn]).toEqual([90, false, '2027-01-11'])
  const first = await at('2027-01-12T06:00:00.000Z') // 00:00 on 12 Jan, day 91
  expect([first.pilotDay, first.ended, first.endsOn]).toEqual([90, true, '2027-01-11'])
  const start = await at('2027-01-11T06:00:00.000Z') // 00:00 on 11 Jan, day 90
  expect([start.pilotDay, start.ended]).toEqual([90, false])
  const eve = await at('2027-01-11T05:59:00.000Z') // 23:59 on 10 Jan, day 89
  expect([eve.pilotDay, eve.ended]).toEqual([89, false])
})

test('FR-BILL-01 a gym far east of UTC is a day ahead: Auckland is on day 25 while Chicago is on day 24', async () => {
  // 18:00Z on 6 Nov is 07:00 on 7 Nov in Auckland.
  expect(await billingAt(undefined, 'Pacific/Auckland')).toEqual({ pilotStartedOn: '2026-10-14', pilotDay: 25, endsOn: '2027-01-11', ended: false })
})

test('FR-BILL-01 billing is for owners: a coach gets 403 role, and a signed-out request 401 signIn', async () => {
  const w = await makeWorld()
  const coach = await call(w.app, 'GET', '/api/billing', { cookie: await w.login(w.coach.email) })
  expect([coach.status, coach.body]).toEqual([403, { error: { code: 'role', message: t('api.role') } }])
  const out = await call(w.app, 'GET', '/api/billing')
  expect([out.status, out.body]).toEqual([401, { error: { code: 'signIn', message: t('api.signIn') } }])
})
