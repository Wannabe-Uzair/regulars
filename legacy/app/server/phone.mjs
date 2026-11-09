// Phone numbers are stored as E.164 (US default). Shared by member edits, CSV import and the kiosk.
/** '+13125550142' from '(312) 555-0142', '312.555.0142', '1 312 555 0142' or '+44…'; null if it isn't a phone number. */
export function normalizePhone(input) {
  if (input === null || input === undefined) return null
  const raw = String(input).trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return null
}
