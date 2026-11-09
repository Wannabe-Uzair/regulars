import { expect, test } from 'vitest'
import type { Country } from './country.ts'
import { localeFor } from './locale.ts'

const AT = new Date('2026-03-04T17:05:00Z')
const time = (country: Country) =>
  new Intl.DateTimeFormat(localeFor(country), { timeStyle: 'short', timeZone: 'UTC' }).format(AT)
const date = (country: Country) =>
  new Intl.DateTimeFormat(localeFor(country), { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(AT)

test('FR-GLOBAL-03 localeFor is English for the gym’s country where Intl has it', () => {
  expect(localeFor('US')).toBe('en-US')
  expect(localeFor('CA')).toBe('en-CA')
  expect(localeFor('GB')).toBe('en-GB')
  expect(localeFor('PK')).toBe('en-PK')
  expect(localeFor('IN')).toBe('en-IN')
  expect(localeFor('DE')).toBe('en-DE')
})

test('FR-GLOBAL-03 localeFor falls back to international English (en-001), with the country’s own clock', () => {
  expect(localeFor('SA')).toBe('en-001') // Arabic keeps a 12-hour clock, as en-001 does
  expect(localeFor('KR')).toBe('en-001')
  expect(localeFor('BR')).toBe('en-001-u-hc-h23')
  expect(localeFor('CN')).toBe('en-001-u-hc-h23')
  expect(date('BR')).toBe('4 Mar') // day first
  // The UAE takes en-AE where the runtime has it (Node 26 does), and en-001 elsewhere: the same date either way.
  expect(date('AE')).toBe('4 Mar')
})

test('FR-GLOBAL-03 each open market keeps its own 12- or 24-hour clock', () => {
  expect(time('US')).toMatch(/^5:05\sPM$/)
  expect(time('CA')).toMatch(/^5:05\sp\.m\.$/)
  expect(time('GB')).toBe('17:05')
  expect(time('PK')).toMatch(/^5:05\spm$/i)
  expect(time('AE')).toMatch(/^5:05\spm$/i)
  expect(time('BR')).toBe('17:05')
  expect(date('US')).toBe('Mar 4')
  expect(date('GB')).toBe('4 Mar')
})
