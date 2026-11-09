import { expect, test } from 'vitest'
import { ImportField, ImportRequest, MAX_CSV_BYTES, utf8Bytes } from './import.ts'

const issue = (body: unknown) => {
  const r = ImportRequest.safeParse(body)
  return r.success ? null : r.error.issues[0]?.message
}

test('FR-IMPORT-01 a CSV of up to 2 MB in UTF-8 bytes is taken; one byte more is importTooBig', () => {
  expect(issue({ kind: 'members', csv: 'a'.repeat(MAX_CSV_BYTES) })).toBeNull()
  expect(issue({ kind: 'members', csv: 'a'.repeat(MAX_CSV_BYTES + 1) })).toBe('importTooBig')
  // "é" is two bytes, so half as many fit.
  expect(utf8Bytes('é')).toBe(2)
  expect(issue({ kind: 'members', csv: 'é'.repeat(MAX_CSV_BYTES / 2 + 1) })).toBe('importTooBig')
})

test('FR-IMPORT-01 a kind other than members or check-ins, or no CSV, is generic', () => {
  expect(issue({ kind: 'nope', csv: 'a' })).toBe('generic')
  expect(issue({ kind: 'checkins' })).toBe('generic')
  expect(issue({ kind: 'checkins', csv: 'a', dateOrder: 'ymd' })).toBe('generic')
  expect(issue({ kind: 'checkins', csv: 'a', mapping: { phone: true } })).toBe('generic')
})

test('FR-IMPORT-02 a mapping maps fields to an index, a header name or null; a date order is mdy or dmy', () => {
  const body = {
    kind: 'members',
    csv: 'a',
    mapping: { first_name: 0, joined_on: 'Since', phone: null },
    dateOrder: 'dmy',
  }
  expect(ImportRequest.parse(body)).toEqual(body)
  expect(ImportField.options).toContain('checked_in_at')
  expect(ImportField.options).toContain('full_name')
})
