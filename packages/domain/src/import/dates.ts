// Reading a file's dates and times (FR-IMPORT-04), ported from legacy/app/server/import/normalize.mjs, which read
// month first only. "03/04/2026" reads in the gym country's order unless the file's own dates settle it (a first
// number over 12 can only be a day). ISO dates, and any date that starts with a 4-digit year, are year first.
import type { Country } from '../country.ts'
import { localeFor } from '../locale.ts'

export const DATE_ORDERS = ['mdy', 'dmy'] as const
export type DateOrder = (typeof DATE_ORDERS)[number]

// The open markets' orders, written down so an Intl update can't change them: US-made gym software writes month
// first, and so does Canada's; the UK, Pakistan and the UAE write day first.
const MARKET_ORDERS: Partial<Record<Country, DateOrder>> = { US: 'mdy', CA: 'mdy', GB: 'dmy', PK: 'dmy', AE: 'dmy' }

/** The order a gym in `country` reads "03/04/2026" in: the open markets' own, else its locale's (month before day?). */
export function dateOrderFor(country: Country): DateOrder {
  const known = MARKET_ORDERS[country]
  if (known) return known
  const parts = new Intl.DateTimeFormat(localeFor(country), { timeZone: 'UTC' })
    .formatToParts(new Date(Date.UTC(2026, 2, 4)))
    .map((p) => p.type)
  return parts.indexOf('month') < parts.indexOf('day') ? 'mdy' : 'dmy'
}

// A date with the year last: 3/4/2026, 03.04.26, 3-4-2026, maybe followed by a time.
const YEAR_LAST = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})(?=$|[\sT,])/
// A date with the year first: 2026-03-04, 2026/3/4, 2026.03.04, maybe followed by a time.
const YEAR_FIRST = /^(\d{4})([/.-])(\d{1,2})\2(\d{1,2})(?=$|[\sT])/

/**
 * The order the file's dates settle, or null: a first number over 12 means day first, a second over 12 month first.
 * Null when no date settles it, or when some settle each way.
 */
export function detectDateOrder(values: readonly string[]): DateOrder | null {
  let dayFirst = false
  let monthFirst = false
  for (const raw of values) {
    const m = YEAR_LAST.exec(raw.trim())
    if (!m) continue
    const a = Number(m[1])
    const b = Number(m[3])
    if (a > 12 && b <= 12) dayFirst = true
    else if (b > 12 && a <= 12) monthFirst = true
  }
  if (dayFirst === monthFirst) return null
  return dayFirst ? 'dmy' : 'mdy'
}

const pad = (n: number) => String(n).padStart(2, '0')

function validYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** A 2-digit year: 00 to 69 are 2000s, 70 to 99 1900s, as legacy read them. */
const fullYear = (y: string) => (y.length === 2 ? Number(y) + (Number(y) < 70 ? 2000 : 1900) : Number(y))

/** The year, month and day a date (maybe followed by a time) starts with, in `order`; also the text after it. */
function readYmd(t: string, order: DateOrder): { y: number; m: number; d: number; rest: string } | null {
  let m = YEAR_FIRST.exec(t)
  if (m) return { y: Number(m[1]), m: Number(m[3]), d: Number(m[4]), rest: t.slice(m[0].length) }
  m = YEAR_LAST.exec(t)
  if (!m) return null
  const [a, b] = [Number(m[1]), Number(m[3])]
  const y = fullYear(m[4] as string)
  return order === 'mdy' ? { y, m: a, d: b, rest: t.slice(m[0].length) } : { y, m: b, d: a, rest: t.slice(m[0].length) }
}

/** A join date as 'YYYY-MM-DD', or null when it can't be read in `order`. Any time after the date is ignored. */
export function parseDate(raw: string | null | undefined, order: DateOrder): string | null {
  if (raw == null) return null
  const r = readYmd(raw.trim(), order)
  if (!r || !validYmd(r.y, r.m, r.d)) return null
  return `${r.y}-${pad(r.m)}-${pad(r.d)}`
}

// The offset (ms) of `tz` from UTC at the instant `ms`.
const offsetFormats = new Map<string, Intl.DateTimeFormat>()
function tzOffset(ms: number, tz: string): number {
  let f = offsetFormats.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    offsetFormats.set(tz, f)
  }
  const p: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {}
  for (const { type, value } of f.formatToParts(new Date(ms))) p[type] = Number(value)
  const asUtc = Date.UTC(p.year ?? 0, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0)
  return asUtc - Math.floor(ms / 1000) * 1000
}

// Wall-clock fields in `tz` to UTC ms. An ambiguous (fall-back) time takes the first occurrence; a time in the
// spring-forward gap is read with the offset in force before it.
function localToUtcMs(y: number, mo: number, d: number, h: number, mi: number, sec: number, tz: string): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi, sec)
  const before = tzOffset(wall - 86_400_000, tz)
  const after = tzOffset(wall + 86_400_000, tz)
  const candidates = [...new Set([before, after])]
    .map((o) => wall - o)
    .filter((u) => tzOffset(u, tz) === wall - u)
    .sort((a, b) => a - b)
  return candidates[0] ?? wall - before
}

const OFFSET_ISO = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/i
const TIME = /^[T\s,]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(?:([AaPp])\.?[Mm]?\.?)?$/

/**
 * A check-in time as a UTC ISO instant, or null. An ISO time with an offset or Z is taken as it is; any other date
 * and time is the gym's wall clock in `timeZone`, its date read in `order`, with an optional AM or PM.
 */
export function parseLocalDateTime(raw: string | null | undefined, timeZone: string, order: DateOrder): string | null {
  if (raw == null) return null
  const t = raw.trim()
  if (!t) return null
  const iso = OFFSET_ISO.exec(t)
  if (iso) {
    if (!validYmd(Number(iso[1]), Number(iso[2]), Number(iso[3])) || Number(iso[4]) > 23 || Number(iso[5]) > 59) {
      return null
    }
    const zone = iso[7] as string
    const off = zone.toUpperCase() === 'Z' ? 'Z' : zone.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')
    const dt = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}:${iso[6] ?? '00'}${off}`)
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  const date = readYmd(t, order)
  if (!date) return null
  const time = TIME.exec(date.rest)
  if (!time) return null
  let h = Number(time[1])
  const mi = Number(time[2])
  const sec = Number(time[3] ?? 0)
  if (time[4]) {
    if (h < 1 || h > 12) return null
    h = (h % 12) + (time[4].toLowerCase() === 'p' ? 12 : 0)
  }
  if (!validYmd(date.y, date.m, date.d) || h > 23 || mi > 59 || sec > 59) return null
  try {
    return new Date(localToUtcMs(date.y, date.m, date.d, h, mi, sec, timeZone)).toISOString()
  } catch {
    return null
  }
}
