// Cleaning a row's names, email and cells, ported from legacy/app/server/import/normalize.mjs. Each returns null for
// nothing usable.

/** Trimmed, inner spaces collapsed, and in one Unicode form (NFC), so "José" typed and "José" exported compare equal. */
export function cleanName(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = raw.normalize('NFC').trim().replace(/\s+/g, ' ')
  return t || null
}

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@.,;<>]+$/

/** Lower case, or null when it isn't an email address. */
export function cleanEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const t = raw.trim().toLowerCase()
  return EMAIL.test(t) ? t : null
}

/**
 * A "Full name" cell split (FR-IMPORT-03): the first word is the first name and the rest the last name; "Lopez, Maria"
 * reads as Maria Lopez; a single word is a first name only (FR-GLOBAL-04). Null when the cell holds no name.
 */
export function splitFullName(raw: string | null | undefined): { firstName: string; lastName: string | null } | null {
  let name = cleanName(raw)
  if (!name) return null
  // "Last, First" is read as "First Last"; any further commas are spaces.
  const comma = name.indexOf(',')
  if (comma !== -1) name = cleanName(`${name.slice(comma + 1).replace(/,/g, ' ')} ${name.slice(0, comma)}`)
  if (!name) return null
  const [first, ...rest] = name.split(' ')
  return { firstName: first as string, lastName: rest.length ? rest.join(' ') : null }
}

/**
 * A number a spreadsheet rewrote in scientific notation ("9.71501E+11", "2E+12"). Its digits are no longer the
 * number that was typed, so the import never reads it as a phone or an ID.
 */
export const isRewrittenNumber = (raw: string): boolean => /^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(raw.trim())
