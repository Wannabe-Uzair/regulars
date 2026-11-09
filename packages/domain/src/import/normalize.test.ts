import { expect, test } from 'vitest'
import { isRewrittenNumber, splitFullName } from './normalize.ts'

test('FR-IMPORT-03 a full name splits at the first word: the rest is the last name', () => {
  expect(splitFullName('Maria Lopez')).toEqual({ firstName: 'Maria', lastName: 'Lopez' })
  expect(splitFullName('Mary Ann Smith')).toEqual({ firstName: 'Mary', lastName: 'Ann Smith' })
  expect(splitFullName('  Maria   de la  Cruz ')).toEqual({ firstName: 'Maria', lastName: 'de la Cruz' })
})

test('FR-IMPORT-03 "Lopez, Maria" reads as Maria Lopez', () => {
  expect(splitFullName('Lopez, Maria')).toEqual({ firstName: 'Maria', lastName: 'Lopez' })
  expect(splitFullName('Lopez,Maria Ann')).toEqual({ firstName: 'Maria', lastName: 'Ann Lopez' })
})

test('FR-GLOBAL-04 a single word is a first name only', () => {
  expect(splitFullName('Cher')).toEqual({ firstName: 'Cher', lastName: null })
  expect(splitFullName('Cher,')).toEqual({ firstName: 'Cher', lastName: null })
  expect(splitFullName(', Cher')).toEqual({ firstName: 'Cher', lastName: null })
})

test('FR-IMPORT-03 a blank full name is no name', () => {
  for (const s of ['', '   ', ',', null, undefined]) expect(splitFullName(s), String(s)).toBeNull()
})

test('FR-IMPORT-05 numbers a spreadsheet rewrote in scientific notation are recognised', () => {
  for (const s of ['9.71501E+11', '2E+12', '1.77356e10', ' 2E+12 ']) expect(isRewrittenNumber(s), s).toBe(true)
  for (const s of ['971501234567', '+971 50 123 4567', 'M-2E+12', 'E12', ''])
    expect(isRewrittenNumber(s), s).toBe(false)
})
