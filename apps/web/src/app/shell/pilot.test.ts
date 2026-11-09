import type { BillingResponse } from '@tenure/contracts'
import { describe, expect, test } from 'vitest'
import { shownPilotDay } from './pilot.ts'

const billing = (pilotDay: number, ended = false): BillingResponse => ({
  pilotStartedOn: '2026-10-01',
  pilotDay,
  endsOn: '2026-12-29',
  ended,
})

describe('shownPilotDay', () => {
  test("FR-SHELL-03 an owner gets the billing answer's pilot day, day 90 included", () => {
    expect(shownPilotDay('owner', billing(37))).toBe(37)
    expect(shownPilotDay('owner', billing(90))).toBe(90)
  })

  test('FR-SHELL-03 from day 91 there is none: the pilot has ended', () => {
    expect(shownPilotDay('owner', billing(90, true))).toBeNull()
  })

  test('FR-SHELL-03 a coach gets none, and nobody does before the answer loads', () => {
    expect(shownPilotDay('coach', billing(37))).toBeNull()
    expect(shownPilotDay('owner', undefined)).toBeNull()
  })
})
