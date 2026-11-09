import { expect, test } from 'vitest'
import { canSubmit, display, MAX_DIGITS, numberSlots, press } from './keypad.ts'

test('FR-KIOSK-02 press follows the old keypad: delete on empty, + only first, 15 digits at most', () => {
  expect(press('', 'back')).toBe('')
  expect(press('', '+')).toBe('+')
  expect(press('3', '+')).toBe('3')
  expect(press('+', '+')).toBe('+')
  const full = '1'.repeat(MAX_DIGITS)
  expect(press(full, '2')).toBe(full)
  expect(press(`+${full.slice(1)}`, '2')).toBe(`+${full.slice(1)}2`)
  expect(press(`+${full}`, '2')).toBe(`+${full}`)
  expect(press('312', 'back')).toBe('31')
})

test('FR-KIOSK-02 Check in needs a number: not nothing, and not + alone', () => {
  expect(canSubmit('')).toBe(false)
  expect(canSubmit('+')).toBe(false)
  expect(canSubmit('+4')).toBe(true)
  expect(canSubmit('3')).toBe(true)
})

test("FR-KIOSK-02 the number shows in the gym's own grouping, and a country outside the five reads as the US", () => {
  expect(display('3125550142', 'US')).toBe('(312) 555-0142')
  expect(display('07911123456', 'GB')).toBe('07911 123456')
  expect(display('+447911123456', 'US')).toBe('+44 7911 123456')
  expect(display('3125550142', 'ZZ')).toBe('(312) 555-0142')
  expect(display('', 'US')).toBe('')
})

test("FR-KIOSK-02 the number's slots: each character of the grouping, then empty ones up to the market's usual length", () => {
  const empty = (value: string, country: string) => numberSlots(value, country).empty
  expect(['US', 'CA', 'GB', 'PK', 'AE', 'ZZ'].map((country) => empty('', country))).toEqual([10, 10, 11, 11, 10, 10])
  expect(numberSlots('312', 'US')).toEqual({
    filled: [...'(312)'].map((char) => ({ char, digit: /\d/.test(char) })),
    empty: 7,
  })
  expect(empty('0300123', 'PK')).toBe(4)
  // Past the usual length, and after a leading +, none.
  expect(empty('312555014212', 'US')).toBe(0)
  expect(empty('+44', 'US')).toBe(0)
})
