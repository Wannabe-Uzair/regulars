// The gym's dates, times, months and phones (FR-GLOBAL-03, FR-MEMBER-03): in its locale, from its country, and in its
// time zone, whatever the device's own. Each browser keeps its own English for the market, so Chrome's "8:05 am" for
// Lahore is Safari's "8:05 AM".
import { t } from '@tenure/copy'
import { type Country, formatPhone, isOpenMarket, localeFor } from '@tenure/domain'

export type GymFormat = {
  /** 'en-US', 'en-GB', or 'en-001' where the browser has no English for the country. */
  locale: string
  timeZone: string
  country: Country
  /** An instant's time of day at the gym: '5:42 PM' (US), '17:42' (UK), '5:42 pm' (Pakistan, in Chrome). */
  time: (at: string) => string
  /**
   * A calendar date ('2026-03-04', as stored) as it is, or an instant's date at the gym: 'Mar 4' (US, Canada), '4 Mar'
   * elsewhere; with the year, 'Mar 4, 2026' or '4 Mar 2026'.
   */
  date: (value: string, options?: { year?: boolean }) => string
  /**
   * An instant's date and time at the gym: 'Nov 6, 5:42 PM' or '6 Nov, 17:42'. The date and the time are joined by
   * `common.dateTime`, not by the browser: Safari's own join is 'Nov 6 at 5:42 PM', Chrome's 'Nov 6, 5:42 PM'.
   */
  dateTime: (at: string) => string
  /** A month ('2026-08') as 'Aug 2026'. */
  month: (yearMonth: string) => string
  /** A stored E.164 phone: national when it's the gym country's calling code, international otherwise. */
  phone: (e164: string) => string
}

/** What the gym's format needs from the signed-in gym (AuthGym). */
export type GymPlace = { country: string; timezone: string }

const calendarDate = /^\d{4}-\d{2}-\d{2}$/

/**
 * The gym's formatters. A country outside the five markets reads as the US, so a gym saved before the country was
 * required still shows its dates.
 */
export function gymFormat({ country: code, timezone: timeZone }: GymPlace): GymFormat {
  const country: Country = isOpenMarket(code) ? code : 'US'
  const locale = localeFor(country)
  // A 24-hour clock writes its hours with two digits ('03:05'); a 12-hour one doesn't ('3:05 AM').
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle
  const hour = cycle === 'h23' || cycle === 'h24' ? '2-digit' : 'numeric'
  const clock = { hour, minute: '2-digit' } as const
  const day = { month: 'short', day: 'numeric' } as const

  const timeOf = new Intl.DateTimeFormat(locale, { ...clock, timeZone })
  // A calendar date is the same day everywhere: it is read at noon UTC and shown in UTC.
  const dayOf = (year: boolean, zone: string) =>
    new Intl.DateTimeFormat(locale, { ...day, ...(year ? { year: 'numeric' } : {}), timeZone: zone })
  const days = {
    calendar: { short: dayOf(false, 'UTC'), long: dayOf(true, 'UTC') },
    gym: { short: dayOf(false, timeZone), long: dayOf(true, timeZone) },
  }
  const monthOf = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' })

  return {
    locale,
    timeZone,
    country,
    time: (at) => timeOf.format(new Date(at)),
    date: (value, { year = false } = {}) => {
      const calendar = calendarDate.test(value)
      const formats = calendar ? days.calendar : days.gym
      return (year ? formats.long : formats.short).format(new Date(calendar ? `${value}T12:00:00Z` : value))
    },
    dateTime: (at) => {
      const when = new Date(at)
      return t('common.dateTime', { date: days.gym.short.format(when), time: timeOf.format(when) })
    },
    month: (yearMonth) => monthOf.format(new Date(`${yearMonth}-15T12:00:00Z`)),
    phone: (e164) => formatPhone(e164, country),
  }
}
