import { expect, test } from 'vitest'
import { PILOT_DAYS, pilotDay, pilotEnded, pilotEndsOn } from './pilot.ts'

test('FR-BILL-01 the start day is day 1, and 23 days after it is day 24', () => {
  expect(pilotDay('2026-10-14', '2026-10-14')).toBe(1)
  expect(pilotDay('2026-10-14', '2026-11-06')).toBe(24)
})

test('FR-BILL-01 a start in the future is still day 1', () => {
  expect(pilotDay('2026-11-07', '2026-11-06')).toBe(1)
})

test('FR-BILL-01 day 90 is the last: 89 days after the start and any day later give 90', () => {
  expect(PILOT_DAYS).toBe(90)
  expect(pilotDay('2026-10-14', '2027-01-10')).toBe(89)
  expect(pilotDay('2026-10-14', '2027-01-11')).toBe(90)
  expect(pilotDay('2026-10-14', '2027-01-12')).toBe(90)
  expect(pilotDay('2026-10-14', '2027-05-02')).toBe(90)
})

test('FR-BILL-01 days are counted by date, across a clock change and a year end', () => {
  // US daylight saving time ends on 1 Nov 2026: the dates still step one a day.
  expect(pilotDay('2026-10-31', '2026-11-02')).toBe(3)
  expect(pilotDay('2026-12-30', '2027-01-02')).toBe(4)
})

test('FR-BILL-01 the pilot ends after its day 90: day 90 is 89 days after the start, and the pilot has ended from day 91', () => {
  expect(pilotEndsOn('2026-10-14')).toBe('2027-01-11')
  expect(pilotEndsOn('2026-12-30')).toBe('2027-03-29')
  expect(pilotEnded('2026-10-14', '2027-01-10')).toBe(false)
  expect(pilotEnded('2026-10-14', '2027-01-11')).toBe(false) // day 90
  expect(pilotEnded('2026-10-14', '2027-01-12')).toBe(true) // day 91
  expect(pilotEnded('2026-10-14', '2027-05-02')).toBe(true)
  expect(pilotEnded('2026-11-07', '2026-11-06')).toBe(false)
})
