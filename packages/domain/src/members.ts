// The members rules (FR-MEM-04, FR-MEMBER-01): name order, a name as typed, the first-90-days window and the
// member page's 90 days. A name shows as metrics' shortName gives it: "Sam O.", or a single name alone ("Leo").
import { addDays, daysBetween } from './dates.ts'
import { progress, WINDOW_DAYS } from './metrics.ts'

type Named = { id: number; firstName: string; lastName: string | null }

const collators = new Map<string, Intl.Collator>()

const collator = (locale: string) => {
  let c = collators.get(locale)
  if (!c) {
    c = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
    collators.set(locale, c)
  }
  return c
}

/**
 * Members by name in the gym's locale (localeFor(country)): the first name, then the last name with no last name
 * first (so "Sam" comes before "Sam O."), then the id. Case and accents only break ties through the id.
 */
export function byMemberName(locale: string): (a: Named, b: Named) => number {
  const c = collator(locale)
  return (a, b) => {
    const first = c.compare(a.firstName, b.firstName)
    if (first !== 0) return first
    const aLast = a.lastName ?? ''
    const bLast = b.lastName ?? ''
    if (!aLast !== !bLast) return aLast ? 1 : -1
    return c.compare(aLast, bLast) || a.id - b.id
  }
}

/** A name part as typed, cleaned: trimmed, inner runs of spaces collapsed to one, and composed (NFC). */
export const cleanName = (text: string): string => text.normalize('NFC').trim().replace(/\s+/g, ' ')

/** The longest first or last name the add and edit forms take, after cleanName. */
export const NAME_MAX = 80

/** The join dates of the members in their first 90 days on `today`: days 0 to 89. */
export const first90Window = (today: string): { from: string; to: string } => ({
  from: addDays(today, -(WINDOW_DAYS - 1)),
  to: today,
})

/** A real calendar date written 'YYYY-MM-DD', from 1900 on: '2026-02-31' and '1899-12-31' are not. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false
  return addDays(value, 0) === value
}

export type MemberDay = {
  /** 'YYYY-MM-DD'. */
  date: string
  /** 0..89. */
  day: number
  visited: boolean
}

/**
 * The member page's 90 days, day 0 to 89 from the joining date. A day is visited when a check-in falls on it in the
 * gym's time zone, up to today; several on one day count once (the old detail's rule).
 */
export function memberDays(input: { joinedOn: string; checkinAts: readonly string[]; today: string; timeZone: string }): MemberDay[] {
  const { visitedDays } = progress(input)
  return Array.from({ length: WINDOW_DAYS }, (_, day) => ({
    date: addDays(input.joinedOn, day),
    day,
    visited: visitedDays.has(day),
  }))
}

/** Is a join date today or earlier, in the gym's time zone (`today` is the gym's local date)? */
export const joinedByToday = (joinedOn: string, today: string): boolean => daysBetween(joinedOn, today) >= 0
