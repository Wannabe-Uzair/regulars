// Ported from legacy/app/server/import/test/normalize.test.mjs: 8 of its 12, read month first as legacy did. The two
// phone tests live in ../phone.test.ts; the two daylight-saving changeover cases (fall back, spring forward) wait for
// the polish. Then the date order, new in the first version.
import { expect, test } from 'vitest'
import { localDate } from '../dates.ts'
import { dateOrderFor, detectDateOrder, parseDate, parseLocalDateTime } from './dates.ts'
import { cleanEmail, cleanName } from './normalize.ts'

const CHICAGO = 'America/Chicago'

test('FR-IMPORT-04 parseDate formats', () => {
  expect(parseDate('2026-09-13', 'mdy')).toBe('2026-09-13')
  expect(parseDate('09/13/2026', 'mdy')).toBe('2026-09-13')
  expect(parseDate('9/3/26', 'mdy')).toBe('2026-09-03')
  expect(parseDate('2026-09-13T10:00:00Z', 'mdy')).toBe('2026-09-13')
  expect(parseDate('2026-09-13 10:00', 'mdy')).toBe('2026-09-13')
})

test('FR-IMPORT-04 parseDate rejects invalid', () => {
  for (const s of ['', null, '13/40/2026', '2026-02-30', 'yesterday', '2/29/2027']) {
    expect(parseDate(s, 'mdy'), String(s)).toBeNull()
  }
  expect(parseDate('2/29/2028', 'mdy')).toBe('2028-02-29')
})

test('FR-IMPORT-04 local datetime, standard and daylight time', () => {
  expect(parseLocalDateTime('2026-01-15 18:00', CHICAGO, 'mdy')).toBe('2026-01-16T00:00:00.000Z')
  expect(parseLocalDateTime('2026-07-15 18:00', CHICAGO, 'mdy')).toBe('2026-07-15T23:00:00.000Z')
})

test('FR-IMPORT-04 M/D/YYYY h:mm AM/PM', () => {
  expect(parseLocalDateTime('7/15/2026 6:00 PM', CHICAGO, 'mdy')).toBe('2026-07-15T23:00:00.000Z')
  expect(parseLocalDateTime('7/15/2026 12:05 AM', CHICAGO, 'mdy')).toBe('2026-07-15T05:05:00.000Z')
  expect(parseLocalDateTime('7/15/2026 12:05 PM', CHICAGO, 'mdy')).toBe('2026-07-15T17:05:00.000Z')
})

test('FR-IMPORT-04 ISO with offset ignores the gym timezone', () => {
  expect(parseLocalDateTime('2026-07-15T18:00:00-04:00', CHICAGO, 'mdy')).toBe('2026-07-15T22:00:00.000Z')
  expect(parseLocalDateTime('2026-07-15T18:00:00Z', CHICAGO, 'mdy')).toBe('2026-07-15T18:00:00.000Z')
})

test('FR-IMPORT-04 local datetime invalid inputs', () => {
  for (const s of ['', null, 'soon', '2026-13-01 10:00', '2026-01-01 25:00', '7/15/2026 13:00 PM']) {
    expect(parseLocalDateTime(s, CHICAGO, 'mdy'), String(s)).toBeNull()
  }
})

test('FR-IMPORT-07 localDate converts to gym-local day', () => {
  expect(localDate('2026-07-16T03:00:00.000Z', CHICAGO)).toBe('2026-07-15')
})

test('FR-IMPORT-05 cleanName / cleanEmail', () => {
  expect(cleanName('  Maria   Lopez ')).toBe('Maria Lopez')
  expect(cleanName('  ')).toBeNull()
  expect(cleanEmail(' Maria@Example.COM ')).toBe('maria@example.com')
  for (const s of ['nope', 'a@b', 'a b@c.com', '', null]) expect(cleanEmail(s), String(s)).toBeNull()
})

test('FR-IMPORT-04 cleanName puts names in one Unicode form', () => {
  expect(cleanName('José')).toBe('José')
})

test("FR-IMPORT-04 each open market's order: month first in the US and Canada, day first in the UK, Pakistan and the UAE", () => {
  expect(dateOrderFor('US')).toBe('mdy')
  expect(dateOrderFor('CA')).toBe('mdy')
  expect(dateOrderFor('GB')).toBe('dmy')
  expect(dateOrderFor('PK')).toBe('dmy')
  expect(dateOrderFor('AE')).toBe('dmy')
  // Elsewhere the locale's own order: Germany writes 4.3.2026.
  expect(dateOrderFor('DE')).toBe('dmy')
})

test('FR-IMPORT-04 the same date reads day first or month first, as asked', () => {
  expect(parseDate('03/04/2026', 'mdy')).toBe('2026-03-04')
  expect(parseDate('03/04/2026', 'dmy')).toBe('2026-04-03')
  expect(parseDate('13/09/2026', 'dmy')).toBe('2026-09-13')
  expect(parseDate('13/09/2026', 'mdy')).toBeNull()
  expect(parseLocalDateTime('03/04/2026 18:00', 'Europe/London', 'dmy')).toBe('2026-04-03T17:00:00.000Z')
  expect(parseLocalDateTime('03/04/2026 18:00', 'Europe/London', 'mdy')).toBe('2026-03-04T18:00:00.000Z')
})

test('FR-IMPORT-04 dots and dashes separate dates too; a 4-digit first number is the year, whatever the order', () => {
  expect(parseDate('13.09.2026', 'dmy')).toBe('2026-09-13')
  expect(parseDate('13-09-26', 'dmy')).toBe('2026-09-13')
  expect(parseDate('2026/09/03', 'dmy')).toBe('2026-09-03')
  expect(parseDate('2026.09.03', 'mdy')).toBe('2026-09-03')
  expect(parseDate('3/9-2026', 'dmy')).toBeNull()
})

test("FR-IMPORT-04 the file settles the order when a day is over 12, and doesn't when none is or both ways are", () => {
  expect(detectDateOrder(['03/04/2026', '13/04/2026'])).toBe('dmy')
  expect(detectDateOrder(['03/04/2026', '04/13/2026 18:00'])).toBe('mdy')
  expect(detectDateOrder(['03/04/2026', '04/05/2026'])).toBeNull()
  expect(detectDateOrder(['13/04/2026', '04/13/2026'])).toBeNull()
  expect(detectDateOrder(['2026-04-13', '2026-13-04', 'nope'])).toBeNull()
  expect(detectDateOrder([])).toBeNull()
})
