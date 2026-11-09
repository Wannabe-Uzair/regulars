import { expect, test } from 'vitest'
import { formatPhone } from './phone-format.ts'

test('FR-MEMBER-03 a phone shows in national format at home and international abroad', () => {
  expect(formatPhone('+13125550142', 'US')).toBe('(312) 555-0142')
  expect(formatPhone('+14165550123', 'US')).toBe('(416) 555-0123') // Toronto shares +1
  expect(formatPhone('+13125550142', 'CA')).toBe('(312) 555-0142')
  expect(formatPhone('+447911123456', 'US')).toBe('+44 7911 123456')
  expect(formatPhone('+447911123456', 'GB')).toBe('07911 123456')
  expect(formatPhone('+923001234567', 'PK')).toBe('0300 1234567')
  expect(formatPhone('+971501234567', 'AE')).toBe('050 123 4567')
  expect(formatPhone('+13125550142', 'PK')).toBe('+1 312 555 0142')
})

test('FR-MEMBER-03 formatPhone gives back what it can’t parse', () => {
  expect(formatPhone('', 'US')).toBe('')
  expect(formatPhone('not a phone', 'US')).toBe('not a phone')
})
