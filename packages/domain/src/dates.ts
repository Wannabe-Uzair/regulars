// Calendar dates in a gym's time zone. Dates are 'YYYY-MM-DD' strings; instants are ISO strings or Dates.
// The clock is never read here: "now" and the time zone are always arguments.

const DAY_MS = 86_400_000

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Local calendar date of an instant (ISO string or Date) in `timeZone`, as 'YYYY-MM-DD'. */
export function localDate(at: string | Date, timeZone: string): string {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    formatters.set(timeZone, f)
  }
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const { type, value } of f.formatToParts(at instanceof Date ? at : new Date(at))) parts[type] = value
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Today's date in the gym's time zone. `now` is the current instant, passed in by the caller's clock. */
export const todayIn = (timeZone: string, now: Date): string => localDate(now, timeZone)

const utcDay = (date: string): number => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / DAY_MS

/** b − a in whole days (both 'YYYY-MM-DD'). */
export const daysBetween = (a: string, b: string): number => utcDay(b) - utcDay(a)

/** The date `n` days after `date` ('YYYY-MM-DD'); `n` may be negative. */
export const addDays = (date: string, n: number): string => new Date((utcDay(date) + n) * DAY_MS).toISOString().slice(0, 10)

/** Is `tz` an IANA time zone this runtime knows? */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
