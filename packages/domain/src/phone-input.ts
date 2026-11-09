// The kiosk's number as it's typed. On `min` metadata, so the web chunk stays small.
import { AsYouType } from 'libphonenumber-js/min'
import type { Country } from './country.ts'

/**
 * The keypad's digits (and a leading "+") in the country's own grouping as they're typed: '3125550142' shows as
 * '(312) 555-0142' at a US gym, '03001234567' as '0300 1234567' in Pakistan. Display only: the server reads the number
 * with normalizePhone, so a mistyped "+" that shows as foreign here can still read as local there.
 */
export function formatPhoneAsTyped(typed: string, country: Country): string {
  return typed ? new AsYouType(country).input(typed) : ''
}
