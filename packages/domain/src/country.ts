// A gym's country, and the markets open to sign-up and Settings (ARCHITECTURE §2, "Going global").
import type { CountryCode } from 'libphonenumber-js/min'

/** An ISO 3166 region code, as libphonenumber knows it ('US', 'GB'…). */
export type Country = CountryCode

/** The markets open in the first version, in the order the spec names them (FR-GLOBAL-01). */
export const OPEN_MARKETS = ['US', 'CA', 'GB', 'PK', 'AE'] as const satisfies readonly Country[]

export type OpenMarket = (typeof OPEN_MARKETS)[number]

export const isOpenMarket = (value: unknown): value is OpenMarket =>
  typeof value === 'string' && (OPEN_MARKETS as readonly string[]).includes(value)

let regionNames: Intl.DisplayNames | undefined

/** The country's English name, from Intl: 'United Kingdom' for 'GB'. */
export function countryName(country: Country): string {
  regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' })
  return regionNames.of(country) ?? country
}

/** The open markets for a Country choice, named by Intl and sorted by name. */
export const marketOptions = (): { country: OpenMarket; name: string }[] =>
  OPEN_MARKETS.map((country) => ({ country, name: countryName(country) })).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )
