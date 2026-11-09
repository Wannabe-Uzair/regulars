// Time zones by country, from the committed table in zones.data.ts (printed by scripts/zones.ts from ICU).
import { type Country, isOpenMarket, type OpenMarket } from './country.ts'
import { ZONE_ALIASES, ZONES } from './zones.data.ts'

/** The old app's Settings list for US gyms (legacy SettingsPanels.jsx:10), east to west. */
export const US_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const

// Built on first use, so a bundle that never asks for a zone's country leaves the table out.
let byZone: Map<string, string> | undefined
const countryOfZone = () =>
  (byZone ??= new Map(Object.entries(ZONES).flatMap(([country, zones]) => zones.map((z) => [z, country]))))

/** The runtime's own name for a zone (US/Central gives America/Chicago), or null if it doesn't know it. */
function runtimeName(tz: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone
  } catch {
    return null
  }
}

/**
 * The country a time zone belongs to, or null (UTC, Etc/GMT+5, Antarctica…). Browsers name some zones differently
 * (Asia/Kolkata in Firefox, Asia/Calcutta in Chrome), so it tries the name, then the alias table, then the runtime's own
 * name for it, which also catches links such as US/Central.
 */
export function countryOfTimeZone(tz: string): Country | null {
  const zones = countryOfZone()
  const name = [tz, ZONE_ALIASES[tz], runtimeName(tz)].find((z) => z !== undefined && z !== null && zones.has(z))
  return name ? (zones.get(name) as Country) : null
}

/**
 * The open market a device's time zone is in, or null when it's outside them, so the owner chooses (FR-AUTH-02).
 * The seed falls back to the US on null (FR-GLOBAL-05).
 */
export function detectCountry(timeZone: string | null | undefined): OpenMarket | null {
  const country = timeZone ? countryOfTimeZone(timeZone) : null
  return isOpenMarket(country) ? country : null
}

/** Each open market's own zone: the one a gym takes when its browser's zone isn't in its country (answers.md, 7 Nov). */
export const COUNTRY_ZONES: Readonly<Record<OpenMarket, string>> = {
  US: 'America/New_York',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  PK: 'Asia/Karachi',
  AE: 'Asia/Dubai',
}

/**
 * The zone a gym in `country` keeps: `zone` when it is one of the country's zones (under any of its names), otherwise
 * the country's own. Sign-up and a Country change in Settings both use it (answers.md, 7 Nov).
 */
export function zoneForCountry(country: OpenMarket, zone: string | null | undefined): string {
  return zone && countryOfTimeZone(zone) === country ? zone : COUNTRY_ZONES[country]
}

/**
 * The Settings zone list (FR-GYM-02): the old 7 for US gyms, with `current` first when it isn't one of them; every other
 * country's zones, east to west. Label each with `zoneCity`.
 *
 * Outside the US the list always holds `current` exactly as given, so a select set to it shows it and never quietly
 * saves another zone: when `current` is another name for a listed zone (America/Atikokan, which a browser may send, for
 * ICU's America/Coral_Harbour) it takes that zone's place; when it isn't one of the country's zones at all, it comes
 * first.
 */
export function zonesFor(country: Country, current?: string): readonly string[] {
  if (country === 'US') {
    return current && !(US_ZONES as readonly string[]).includes(current) ? [current, ...US_ZONES] : US_ZONES
  }
  const zones = ZONES[country] ?? []
  if (!current || zones.includes(current)) return zones
  const listed = [ZONE_ALIASES[current], runtimeName(current)].find(
    (z) => z !== undefined && z !== null && zones.includes(z),
  )
  return listed ? zones.map((z) => (z === listed ? current : z)) : [current, ...zones]
}

/** A zone's city, as its name spells it: 'America/St_Johns' gives 'St Johns'. */
export const zoneCity = (zone: string): string => zone.slice(zone.lastIndexOf('/') + 1).replaceAll('_', ' ')
