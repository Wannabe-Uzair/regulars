import { expect, test } from 'vitest'
import { fold, foldDigits } from './text.ts'

test('FR-MEM-02 search folds case and accents', () => {
  expect(fold('José')).toBe('jose')
  expect(fold('JOSÉ')).toBe('jose')
  expect(fold('Zoë Ångström')).toBe('zoe angstrom')
  expect(fold('Éclair')).toBe('eclair') // an accent typed as a combining mark
  expect(fold('jose')).toBe(fold('José'))
})

test('FR-MEM-02 a digit query drops its leading zeros', () => {
  expect(foldDigits('0300 123')).toBe('300123') // finds +923001234567
  expect(foldDigits('00 44 7911')).toBe('447911')
  expect(foldDigits('(312) 555')).toBe('312555')
  expect(foldDigits('012')).toBe('12')
  expect(foldDigits('000')).toBe('')
  expect(foldDigits('Sam')).toBe('')
})
