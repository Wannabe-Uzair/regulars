// Cases from the two legacy normalisers (server/phone.mjs for members and the kiosk, server/import/normalize.mjs
// phoneE164 for the CSV import) and the phones their tests use (kiosk, import, data-fixes) and the seed, all at a US
// gym; then the country-aware rule (FR-GLOBAL-02, answers.md Q34: the gym's country wins).
import { expect, test } from 'vitest'
import type { Country } from './country.ts'
import { normalizePhone } from './phone.ts'

const cases = (rows: readonly (readonly [unknown, string | null])[], country: Country = 'US') => {
  for (const [input, expected] of rows)
    expect(normalizePhone(input, country), `${JSON.stringify(input)} at ${country}`).toBe(expected)
}

test('FR-GLOBAL-02 US numbers in any punctuation, with or without the leading 1 or +1 (both old normalisers agree)', () => {
  cases([
    ['(312) 555-0142', '+13125550142'],
    ['312.555.0142', '+13125550142'],
    ['312-555-0199', '+13125550199'],
    ['312 555 0199', '+13125550199'],
    ['3125550100', '+13125550100'],
    ['1 312 555 0142', '+13125550142'],
    ['1-312-555-0142', '+13125550142'],
    ['+1 312 555 0142', '+13125550142'],
    ['+13125550142', '+13125550142'],
    [' +1 (773) 555-0110 ', '+17735550110'],
    ['+1 773-555-0110', '+17735550110'], // the import sample CSV's format
    [3125550142, '+13125550142'],
    [13125550142, '+13125550142'],
  ])
})

test('FR-GLOBAL-02 every seed phone (fictional 555 numbers) stays as it is', () => {
  const seed = Array.from({ length: 100 }, (_, i) => `+1312555${String(100 + i).padStart(4, '0')}`)
  for (const p of seed) expect(normalizePhone(p, 'US')).toBe(p)
})

test('FR-GLOBAL-02 a US number must fit the NANP pattern: area code and exchange start 2-9', () => {
  cases([
    ['012-555-0142', null],
    ['112-555-0142', null],
    ['312-055-0142', null],
    ['312-155-0142', null],
    ['+1 212 055 0142', null],
  ])
})

test('FR-GLOBAL-02 a US number needs 10 digits, or 11 with a leading 1', () => {
  cases([
    ['312 555 014', null],
    ['+1 312 555 014', null],
    ['312 555 01422', null],
    ['2 312 555 0142', null],
    ['555-0142', null],
  ])
})

test('FR-GLOBAL-02 extensions are dropped', () => {
  cases([
    ['312-555-0142 x12', '+13125550142'],
    ['312-555-0142 ext. 12', '+13125550142'],
    ['312-555-0142 Extension 12', '+13125550142'],
    ['+1 312 555 0142 ext 5', '+13125550142'],
    ['+44 7911 123456 ext 3', '+447911123456'],
  ])
})

test('FR-GLOBAL-02 international numbers need the + and a possible length for their country', () => {
  cases([
    ['+44 20 7946 0958', '+442079460958'],
    ['+44 (0)20 7946 0958', '+442079460958'], // the trunk 0 is not part of E.164
    ['+33 1 23 45 67 89', '+33123456789'],
    ['+49 30 123456', '+4930123456'],
    ['+91 98765 43210', '+919876543210'],
    ['+61 2 9876 5432', '+61298765432'],
    ['+290 2345', '+2902345'], // Saint Helena: 4-digit numbers
    ['+44 79', null],
    ['+4420794609581234', null],
    ['+999 1234 5678', null], // no such country code
    ['44 20 7946 0958', null],
    ['0044 20 7946 0958', null],
  ])
})

test('FR-GLOBAL-02 nothing, blanks, words and other types are not phone numbers', () => {
  cases([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    ['+1-800-FLOWERS', null],
    [['3125550142'], null],
    [{}, null],
    [true, null],
  ])
})

test('FR-GLOBAL-02 a + number whose digits make a real local number is read locally (the gym’s country wins)', () => {
  cases([
    ['+312 555 0142', '+13125550142'], // a mistyped +: Chicago, not the Netherlands (+31)
    ['+318 555 0142', '+13185550142'], // Louisiana; libphonenumber's min metadata would read it as Dutch
    ['+646 555 0142', '+16465550142'], // real in New Zealand too, but New York wins at a US gym
    ['+201 555 0142', '+12015550142'], // real in Egypt too, but New Jersey wins
  ])
  cases([['+7911 123456', '+447911123456']], 'GB')
  cases([['+0300 1234567', '+923001234567']], 'PK')
  cases([['+050 123 4567', '+971501234567']], 'AE')
  cases([['+416 555 0123', '+14165550123']], 'CA')
})

test('FR-GLOBAL-02 a + number that isn’t local stays international', () => {
  cases([['+44 7911 123456', '+447911123456']], 'CA')
  cases([['+1 312 555 0142', '+13125550142']], 'GB')
  cases([['+1 312 555 0142', '+13125550142']], 'PK')
  cases([['+1 312 555 0142', '+13125550142']], 'AE')
  cases([['+92 300 1234567', '+923001234567']], 'PK')
})

test('FR-GLOBAL-02 a number without + is read in the gym’s country: GB 07…', () => {
  cases(
    [
      ['07911 123456', '+447911123456'],
      ['020 7946 0958', '+442079460958'],
      ['0044 20 7946 0958', '+442079460958'], // the UK's own international prefix
      ['(312) 555-0142', null], // a US number needs its + abroad
    ],
    'GB',
  )
})

test('FR-GLOBAL-02 a number without + is read in the gym’s country: PK 03…', () => {
  cases(
    [
      ['0300 1234567', '+923001234567'],
      ['300 1234567', '+923001234567'],
      ['92 300 1234567', '+923001234567'],
      ['3125550142', '+923125550142'], // a real Pakistani mobile, not Chicago
    ],
    'PK',
  )
})

test('FR-GLOBAL-02 a number without + is read in the gym’s country: AE 05…', () => {
  cases(
    [
      ['050 123 4567', '+971501234567'],
      ['+971 50 123 4567', '+971501234567'],
      ['00971501234567', '+971501234567'],
    ],
    'AE',
  )
})

test('FR-GLOBAL-02 a number without + is read in the gym’s country: CA and the US share +1', () => {
  cases(
    [
      ['(416) 555-0123', '+14165550123'],
      ['(312) 555-0142', '+13125550142'],
      ['+1 416 555 0123', '+14165550123'],
    ],
    'CA',
  )
  cases([
    ['(416) 555-0123', '+14165550123'],
    ['011 44 20 7946 0958', '+442079460958'], // the US's own international prefix
  ])
})

test('FR-GLOBAL-02 unassigned home numbers are refused; foreign ones need only a possible length', () => {
  cases([
    ['555 555 0142', null], // area code 555 is unassigned, though it fits the NANP pattern
    ['+1 555 555 0142', null], // the gym's own code is never kept on length alone
    ['+290 2345', '+2902345'],
  ])
  cases(
    [
      ['07700 900123', null], // the UK's drama range
      ['+44 7700 900123', null],
    ],
    'GB',
  )
})
