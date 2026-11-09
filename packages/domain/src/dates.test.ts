import { expect, test } from 'vitest'
import { addDays, daysBetween, isValidTimeZone, localDate, todayIn } from './dates.ts'

const CHICAGO = 'America/Chicago'

test('localDate across the fall DST change in America/Chicago (1 Nov 2026, CDT -5 to CST -6)', () => {
  expect(localDate('2026-11-01T04:59:00.000Z', CHICAGO)).toBe('2026-10-31') // 23:59 CDT
  expect(localDate('2026-11-01T05:00:00.000Z', CHICAGO)).toBe('2026-11-01') // 00:00 CDT
  // After the change midnight is 06:00Z: 05:30Z is still 1 Nov (23:30 CST), not 00:30 on 2 Nov.
  expect(localDate('2026-11-02T05:30:00.000Z', CHICAGO)).toBe('2026-11-01')
  expect(localDate('2026-11-02T06:00:00.000Z', CHICAGO)).toBe('2026-11-02') // 00:00 CST
})

test('localDate across the spring DST change in America/Chicago (8 Mar 2026, CST -6 to CDT -5)', () => {
  expect(localDate('2026-03-08T05:59:00.000Z', CHICAGO)).toBe('2026-03-07') // 23:59 CST
  expect(localDate('2026-03-08T06:00:00.000Z', CHICAGO)).toBe('2026-03-08') // 00:00 CST
  // After the change midnight is 05:00Z: 05:30Z is 9 Mar (00:30 CDT).
  expect(localDate('2026-03-09T04:59:00.000Z', CHICAGO)).toBe('2026-03-08') // 23:59 CDT
  expect(localDate('2026-03-09T05:30:00.000Z', CHICAGO)).toBe('2026-03-09')
})

test('localDate takes a Date as well as an ISO string', () => {
  expect(localDate(new Date('2026-11-06T03:00:00.000Z'), CHICAGO)).toBe('2026-11-05')
  expect(localDate(new Date('2026-11-06T03:00:00.000Z'), 'UTC')).toBe('2026-11-06')
})

test('todayIn is the local date of the given instant', () => {
  const now = new Date('2026-11-06T18:00:00.000Z')
  expect(todayIn(CHICAGO, now)).toBe('2026-11-06')
  expect(todayIn('Asia/Tokyo', new Date('2026-11-06T16:00:00.000Z'))).toBe('2026-11-07')
})

test('daysBetween and addDays count calendar days, across DST and month ends', () => {
  expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  expect(daysBetween('2026-11-02', '2026-10-31')).toBe(-2)
  expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-11-06', -89)).toBe('2026-08-09')
})

test('isValidTimeZone accepts IANA names and rejects anything else', () => {
  expect(isValidTimeZone('America/Chicago')).toBe(true)
  expect(isValidTimeZone('UTC')).toBe(true)
  expect(isValidTimeZone('Mars/Olympus')).toBe(false)
  expect(isValidTimeZone('')).toBe(false)
  expect(isValidTimeZone(null)).toBe(false)
  expect(isValidTimeZone(-6)).toBe(false)
})
