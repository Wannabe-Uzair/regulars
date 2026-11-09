import { expect, test } from 'vitest'
import { countryName, isOpenMarket, marketOptions, OPEN_MARKETS } from './country.ts'
import { isValidTimeZone } from './dates.ts'
import { ZONE_ALIASES, ZONES } from './zones.data.ts'
import {
  COUNTRY_ZONES,
  countryOfTimeZone,
  detectCountry,
  US_ZONES,
  zoneCity,
  zoneForCountry,
  zonesFor,
} from './zones.ts'

/** Zones ICU lists that belong to no country (Antarctic bases and empty islands). */
const NO_COUNTRY = [
  'Antarctica/Casey',
  'Antarctica/Davis',
  'Antarctica/DumontDUrville',
  'Antarctica/Mawson',
  'Antarctica/McMurdo',
  'Antarctica/Palmer',
  'Antarctica/Rothera',
  'Antarctica/Syowa',
  'Antarctica/Troll',
  'Antarctica/Vostok',
  'Atlantic/South_Georgia',
  'Indian/Kerguelen',
  'Pacific/Midway',
  'Pacific/Pitcairn',
  'Pacific/Wake',
]

/** Minutes east of UTC, the smaller of mid-January and mid-July: the zone's standard offset. */
function standardOffset(timeZone: string): number {
  const at = [Date.UTC(2026, 0, 15), Date.UTC(2026, 6, 15)].map((ms) => {
    const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(new Date(ms))
      .find((p) => p.type === 'timeZoneName')!.value
    const m = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(name)!
    return m[1] ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  })
  return Math.min(...at)
}

test('FR-GLOBAL-01 five markets are open: the US, Canada, the UK, Pakistan and the UAE, named by Intl', () => {
  expect(OPEN_MARKETS).toEqual(['US', 'CA', 'GB', 'PK', 'AE'])
  expect(OPEN_MARKETS.map(countryName)).toEqual([
    'United States',
    'Canada',
    'United Kingdom',
    'Pakistan',
    'United Arab Emirates',
  ])
  expect(marketOptions().map((o) => o.country)).toEqual(['CA', 'PK', 'AE', 'GB', 'US']) // sorted by name
})

test('FR-AUTH-02 only an open market counts as one', () => {
  for (const c of OPEN_MARKETS) expect(isOpenMarket(c)).toBe(true)
  for (const c of ['IN', 'ZZ', 'us', '', null, undefined, 1]) expect(isOpenMarket(c)).toBe(false)
})

test('FR-AUTH-02 detectCountry gives the open market a time zone is in, and null outside them', () => {
  expect(detectCountry('Asia/Karachi')).toBe('PK')
  expect(detectCountry('Asia/Dubai')).toBe('AE')
  expect(detectCountry('Europe/London')).toBe('GB')
  expect(detectCountry('America/Toronto')).toBe('CA')
  expect(detectCountry('America/Chicago')).toBe('US')
  expect(detectCountry('US/Central')).toBe('US') // a link, through the runtime's own name
  expect(detectCountry('America/Indiana/Indianapolis')).toBe('US') // the IANA name, through the alias table
  expect(detectCountry('Asia/Kolkata')).toBeNull() // India isn't open
  expect(detectCountry('UTC')).toBeNull()
  expect(detectCountry('Not/A_Zone')).toBeNull()
  expect(detectCountry('')).toBeNull()
  expect(detectCountry(undefined)).toBeNull()
})

test('FR-GLOBAL-01 countryOfTimeZone reads both a browser’s names for a zone', () => {
  expect(countryOfTimeZone('Asia/Calcutta')).toBe('IN') // Chrome and Node
  expect(countryOfTimeZone('Asia/Kolkata')).toBe('IN') // Firefox
  expect(countryOfTimeZone('Europe/Kyiv')).toBe('UA')
  expect(countryOfTimeZone('Antarctica/Troll')).toBeNull()
})

test('FR-GLOBAL-01 every alias names a listed zone, in the same country', () => {
  expect(Object.keys(ZONE_ALIASES)).toHaveLength(19)
  for (const [iana, icu] of Object.entries(ZONE_ALIASES)) {
    expect(countryOfTimeZone(icu), icu).not.toBeNull()
    expect(countryOfTimeZone(iana), iana).toBe(countryOfTimeZone(icu))
  }
})

test('FR-GLOBAL-01 the committed zone table matches this runtime (else rerun scripts/zones.ts)', () => {
  const listed = Object.values(ZONES).flat()
  expect(new Set(listed).size, 'no zone is in two countries').toBe(listed.length)
  for (const zone of listed) expect(isValidTimeZone(zone), zone).toBe(true)
  const unlisted = Intl.supportedValuesOf('timeZone').filter((z) => countryOfTimeZone(z) === null)
  expect(unlisted).toEqual(NO_COUNTRY)
})

test('FR-GYM-02 US gyms get the old app’s 7 zones, with the current one first if it isn’t among them', () => {
  expect(zonesFor('US')).toEqual([
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
  ])
  expect(zonesFor('US', 'America/Chicago')).toEqual(US_ZONES)
  expect(zonesFor('US', 'America/Detroit')).toEqual(['America/Detroit', ...US_ZONES])
})

test('FR-GYM-02 every other country gets all its zones, east to west', () => {
  expect(zonesFor('GB')).toEqual(['Europe/London'])
  expect(zonesFor('PK')).toEqual(['Asia/Karachi'])
  expect(zonesFor('AE')).toEqual(['Asia/Dubai'])
  const ca = zonesFor('CA')
  expect(ca).toHaveLength(23)
  expect(ca[0]).toBe('America/St_Johns')
  expect(ca.at(-1)).toBe('America/Vancouver')
  const order = ['America/Halifax', 'America/Toronto', 'America/Winnipeg', 'America/Edmonton'].map((z) => ca.indexOf(z))
  expect(order).toEqual([...order].sort((x, y) => x - y))
  expect(order).not.toContain(-1)
  for (const zones of Object.values(ZONES)) {
    const offsets = zones.map(standardOffset)
    expect(offsets, zones.join()).toEqual([...offsets].sort((x, y) => y - x))
  }
})

test('FR-GYM-02 outside the US the list holds the gym’s current zone as stored: in its listed place under another name, else first', () => {
  const ca = zonesFor('CA')
  // Firefox sends America/Atikokan; ICU lists it as America/Coral_Harbour.
  const atikokan = zonesFor('CA', 'America/Atikokan')
  expect(atikokan).toEqual(ca.map((z) => (z === 'America/Coral_Harbour' ? 'America/Atikokan' : z)))
  expect(atikokan).not.toContain('America/Coral_Harbour')
  // A link the runtime resolves to a listed zone (Canada/Eastern is America/Toronto) takes that zone's place too.
  const eastern = zonesFor('CA', 'Canada/Eastern')
  expect(eastern.indexOf('Canada/Eastern')).toBe(ca.indexOf('America/Toronto'))
  expect(eastern).toHaveLength(ca.length)
  // A zone from another country comes first, ahead of the country's own.
  expect(zonesFor('AE', 'Asia/Karachi')).toEqual(['Asia/Karachi', 'Asia/Dubai'])
  expect(zonesFor('GB', 'UTC')).toEqual(['UTC', 'Europe/London'])
  // A listed zone, or none, leaves the list as it is.
  expect(zonesFor('CA', 'America/Toronto')).toEqual(ca)
  expect(zonesFor('PK', 'Asia/Karachi')).toEqual(['Asia/Karachi'])
  expect(zonesFor('PK', '')).toEqual(['Asia/Karachi'])
})

test('FR-GYM-02 the US rule compares names only: another name for one of the 7 still comes first', () => {
  expect(zonesFor('US', 'US/Central')).toEqual(['US/Central', ...US_ZONES])
})

test('FR-GYM-02 a zone is labelled by its city', () => {
  expect(zoneCity('America/St_Johns')).toBe('St Johns')
  expect(zoneCity('America/Indiana/Knox')).toBe('Knox')
  expect(zoneCity('Asia/Karachi')).toBe('Karachi')
})

test("FR-AUTH-01 a gym keeps its browser's zone when it's in the chosen country, and otherwise takes the country's own", () => {
  expect(zoneForCountry('AE', 'Asia/Karachi')).toBe('Asia/Dubai')
  expect(zoneForCountry('PK', 'Etc/UTC')).toBe('Asia/Karachi')
  expect(zoneForCountry('GB', null)).toBe('Europe/London')
  expect(zoneForCountry('US', 'America/Chicago')).toBe('America/Chicago')
  expect(zoneForCountry('CA', 'America/Atikokan')).toBe('America/Atikokan')
  expect(zoneForCountry('CA', 'America/Chicago')).toBe('America/Toronto')
  for (const country of OPEN_MARKETS) expect(countryOfTimeZone(COUNTRY_ZONES[country])).toBe(country)
})
