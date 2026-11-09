// Ported from legacy/app/server/import/test/csv.test.mjs (all 9), plus the separator sniffing.
import { expect, test } from 'vitest'
import { parseCsv } from './csv.ts'

test('FR-IMPORT-01 basic parse with LF and trailing newline', () => {
  const r = parseCsv('a,b\n1,2\n3,4\n')
  expect(r.header).toEqual(['a', 'b'])
  expect(r.rows).toEqual([
    ['1', '2'],
    ['3', '4'],
  ])
  expect(r.problems).toEqual([])
})

test('FR-IMPORT-01 CRLF line endings, no trailing newline', () => {
  expect(parseCsv('a,b\r\n1,2\r\n3,4').rows).toEqual([
    ['1', '2'],
    ['3', '4'],
  ])
})

test('FR-IMPORT-01 UTF-8 BOM is stripped from the first header', () => {
  expect(parseCsv('﻿Name,Age\nA,1').header).toEqual(['Name', 'Age'])
})

test('FR-IMPORT-01 quoted commas, escaped quotes and newlines inside quotes', () => {
  const r = parseCsv('n,note\n"Okafor, Jr.","said ""hi"""\n"x","line1\nline2"\n')
  expect(r.rows[0]).toEqual(['Okafor, Jr.', 'said "hi"'])
  expect(r.rows[1]).toEqual(['x', 'line1\nline2'])
  expect(r.rows).toHaveLength(2)
})

test('FR-IMPORT-01 blank lines are skipped but row numbers stay spreadsheet-accurate', () => {
  const r = parseCsv('a,b\n\n1,2\n\r\n3,4\n\n')
  expect(r.rows).toEqual([
    ['1', '2'],
    ['3', '4'],
  ])
  expect(r.rowNumbers).toEqual([3, 5])
})

test('FR-IMPORT-01 empty fields are kept', () => {
  expect(parseCsv('a,b,c\n1,,3\n,,\n').rows).toEqual([['1', '', '3']])
})

test('FR-IMPORT-05 short and long rows are reported, not thrown', () => {
  const r = parseCsv('a,b\n1\n1,2,3\n1,2\n')
  expect(r.rows).toHaveLength(3)
  expect(r.problems).toEqual([
    { code: 'missingColumns', row: 2, count: 1, columns: 2 },
    { code: 'extraColumns', row: 3, count: 3, columns: 2 },
  ])
})

test('FR-IMPORT-05 unterminated quote is reported, not thrown', () => {
  expect(parseCsv('a,b\n1,"oops\n').problems).toEqual([{ code: 'unclosedQuote', row: null }])
})

test('FR-IMPORT-01 empty input', () => {
  expect(parseCsv('')).toEqual({ header: [], rows: [], rowNumbers: [], problems: [] })
})

test('FR-IMPORT-01 a semicolon file splits on semicolons, keeping an unquoted comma in its cell', () => {
  const r = parseCsv('Member ID;First Name;Last Name\nM-1;Ethan;Okafor, Jr.\n')
  expect(r.header).toEqual(['Member ID', 'First Name', 'Last Name'])
  expect(r.rows).toEqual([['M-1', 'Ethan', 'Okafor, Jr.']])
  expect(r.problems).toEqual([])
})

test('FR-IMPORT-01 cells pasted from a spreadsheet split on tabs', () => {
  const r = parseCsv('First Name\tJoin Date\r\nMaria\t09/11/2026\r\n')
  expect(r.header).toEqual(['First Name', 'Join Date'])
  expect(r.rows).toEqual([['Maria', '09/11/2026']])
})

test('FR-IMPORT-01 a comma header stays comma-split, with semicolons inside quotes or after the first line', () => {
  const r = parseCsv('"a;b",c\n"1;2",3\nx;y;z,w\n')
  expect(r.header).toEqual(['a;b', 'c'])
  expect(r.rows).toEqual([
    ['1;2', '3'],
    ['x;y;z', 'w'],
  ])
})
