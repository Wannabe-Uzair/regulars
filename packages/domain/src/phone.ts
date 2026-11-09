// Phone numbers, stored as E.164. One rule on the server for member edits, the kiosk and the CSV import (FR-GLOBAL-02).
// It uses libphonenumber's `max` metadata, which knows each country's assigned ranges: on `min`, a mistyped "+318 555
// 0142" reads as Dutch. The web never calls it (an ESLint rule in packages/config bans the import there), so `max`
// stays out of the bundle; the web shows numbers with phone-format.ts and phone-input.ts, on `min`.
import { getCountryCallingCode, parsePhoneNumberFromString as parse } from 'libphonenumber-js/max'
import type { Country } from './country.ts'

/** A trailing extension: 'x12', 'ext. 12', 'extension 12'. */
const EXTENSION = /\s*(x|ext\.?|extension)\s*\d+$/i

/**
 * The E.164 number for what someone typed at a gym in `country`, or null if it isn't one. A trailing extension is
 * dropped.
 *
 * - Without "+", the number must be real in the gym's country: a trunk 0, the country code and the country's own
 *   international prefix (011 in the US, 00 in the UK) all work. Unassigned numbers are refused.
 * - With "+", the gym's country wins (Uzair's answer, answers.md Q34): if the digits make a real local number, they are
 *   read as local, which rescues a mistyped "+". Otherwise the number is real for its country code, or, for a country
 *   other than the gym's, of a possible length ("+290 2345"). The gym's own code is never kept on length alone.
 */
export function normalizePhone(input: unknown, country: Country): string | null {
  if (typeof input !== 'string' && typeof input !== 'number') return null
  const raw = String(input).trim().replace(EXTENSION, '')
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const local = parse(digits, country)
  if (local?.isValid()) return local.number
  if (!raw.startsWith('+')) return null
  const intl = parse(`+${digits}`)
  if (intl?.isValid()) return intl.number
  return intl?.isPossible() && intl.countryCallingCode !== getCountryCallingCode(country) ? intl.number : null
}
