import { describe, expect, test } from 'vitest'
import { BillingResponse } from './billing.ts'

describe('BillingResponse', () => {
  test('FR-BILL-01 takes the pilot day and its start, and nothing about a plan or a price', () => {
    const body = { pilotStartedOn: '2026-10-14', pilotDay: 24, endsOn: '2027-01-11', ended: false }
    expect(BillingResponse.strict().parse(body)).toEqual(body)
    expect(BillingResponse.strict().safeParse({ ...body, plan: 'pilot', priceMonthly: 99 }).success).toBe(false)
  })

  test.each([0, 91, 2.5])('FR-BILL-01 refuses a pilot day of %s', (pilotDay) => {
    expect(BillingResponse.safeParse({ pilotStartedOn: '2026-10-14', pilotDay, endsOn: '2027-01-11', ended: false }).success).toBe(false)
  })

  test('FR-BILL-01 refuses a start that is not a date', () => {
    expect(BillingResponse.safeParse({ pilotStartedOn: '2026-10-14T00:00:00Z', pilotDay: 1, endsOn: '2027-01-11', ended: false }).success).toBe(false)
  })

  test('FR-BILL-01 takes pilot day 90 with the pilot ended, and refuses a body without ended or endsOn', () => {
    const body = { pilotStartedOn: '2026-10-14', pilotDay: 90, endsOn: '2027-01-11', ended: true }
    expect(BillingResponse.strict().parse(body)).toEqual(body)
    expect(BillingResponse.safeParse({ ...body, ended: undefined }).success).toBe(false)
    expect(BillingResponse.safeParse({ ...body, endsOn: undefined }).success).toBe(false)
  })
})
