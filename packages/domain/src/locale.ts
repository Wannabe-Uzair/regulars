// The gym's locale for dates and times (FR-GLOBAL-03). Derived where it's used, by that runtime's Intl, so a browser
// without a country's English formats falls back on its own. Never stored or sent.
import type { Country } from './country.ts'
import { TWELVE_HOUR_COUNTRIES } from './zones.data.ts'

const locales = new Map<string, string>()

const resolves = (locale: string) => new Intl.DateTimeFormat(locale).resolvedOptions().locale === locale

const isTwelveHour = (locale: string) => {
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle
  return cycle === 'h11' || cycle === 'h12'
}

/**
 * 'en-<country>' where this runtime's Intl has English formats for the country, else international English, 'en-001'
 * (day before month). Either way the clock is the country's own, from the committed CLDR data: '-u-hc-h12' or
 * '-u-hc-h23' is added only when the locale's own clock differs. 'en-US', 'en-GB', 'en-001', 'en-001-u-hc-h23' (BR).
 */
export function localeFor(country: Country): string {
  let locale = locales.get(country)
  if (!locale) {
    const base = resolves(`en-${country}`) ? `en-${country}` : 'en-001'
    const twelve = TWELVE_HOUR_COUNTRIES.includes(country)
    locale = isTwelveHour(base) === twelve ? base : `${base}-u-hc-${twelve ? 'h12' : 'h23'}`
    locales.set(country, locale)
  }
  return locale
}
