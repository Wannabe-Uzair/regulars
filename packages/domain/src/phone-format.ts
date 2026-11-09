// Showing a stored phone (FR-MEMBER-03). On `min` metadata, so the web may call it.
import { getCountryCallingCode, parsePhoneNumberFromString as parse } from 'libphonenumber-js/min'
import type { Country } from './country.ts'

/**
 * An E.164 number as the gym reads it: national format when its calling code is the gym country's ('(312) 555-0142' at
 * a US gym, and a Toronto number too), international otherwise ('+44 7911 123456'). What doesn't parse comes back as
 * given.
 */
export function formatPhone(e164: string, country: Country): string {
  const phone = parse(e164)
  if (!phone) return e164
  return phone.countryCallingCode === getCountryCallingCode(country)
    ? phone.formatNational()
    : phone.formatInternational()
}
