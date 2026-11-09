import { expect, test } from 'vitest'
import type { Country } from './country.ts'
import { formatPhoneAsTyped } from './phone-input.ts'

test('FR-KIOSK-02 the typed phone shows in the country’s own grouping as it’s typed', () => {
  const rows: [Country, string, string][] = [
    ['US', '3125550142', '(312) 555-0142'],
    ['US', '312555', '(312) 555'],
    ['US', '13125550142', '1 (312) 555-0142'],
    ['US', '+', '+'],
    ['US', '+3125550142', '+31 255 501 42'], // shows as Dutch while typing; the server reads it as local
    ['CA', '4165550123', '(416) 555-0123'],
    ['GB', '07911123456', '07911 123456'],
    ['GB', '+447911123456', '+44 7911 123456'],
    ['PK', '03001234567', '0300 1234567'],
    ['AE', '0501234567', '050 123 4567'],
  ]
  for (const [country, typed, shown] of rows) expect(formatPhoneAsTyped(typed, country), typed).toBe(shown)
})

test('FR-KIOSK-02 an empty number stays empty', () => {
  expect(formatPhoneAsTyped('', 'US')).toBe('')
})
