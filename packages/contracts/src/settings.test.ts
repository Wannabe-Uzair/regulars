import { OPEN_MARKETS } from '@tenure/domain'
import { describe, expect, test } from 'vitest'
import { ErrorCode } from './errors.ts'
import { QrQuery, SettingsPatch, SettingsResponse } from './settings.ts'

const gym = { id: 1, name: 'Northside Strength', slug: 'northside', isDemo: false, timezone: 'America/Chicago', country: 'US', plan: 'pilot', pilotStartedOn: '2026-10-14' }
const settings = {
  gym,
  kioskPath: '/kiosk/kiosk-token-1',
  kioskUrl: 'http://192.168.137.1:5175/kiosk/kiosk-token-1',
  kioskUrls: ['http://192.168.137.1:5175/kiosk/kiosk-token-1'],
  phoneUrls: ['http://192.168.137.1:5175'],
}

const firstCode = (input: unknown) => {
  const r = SettingsPatch.safeParse(input)
  if (r.success) throw new Error(`expected ${JSON.stringify(input)} to fail`)
  return r.error.issues[0]?.message
}

describe('SettingsResponse', () => {
  test('FR-GYM-03 carries the gym, the kiosk path and links, and the phone links', () => {
    expect(SettingsResponse.strict().parse(settings)).toEqual(settings)
    expect(SettingsResponse.safeParse({ ...settings, phoneUrls: [] }).success).toBe(true)
  })

  test('FR-GYM-03 always has a kiosk link, and never passes on the kiosk token as a field', () => {
    expect(SettingsResponse.safeParse({ ...settings, kioskUrls: [] }).success).toBe(false)
    expect(SettingsResponse.parse({ ...settings, gym: { ...gym, kioskToken: 'secret' } }).gym).not.toHaveProperty('kioskToken')
  })
})

describe('SettingsPatch', () => {
  test('FR-GYM-01 takes any of the name, country and zone, trimming the name, and nothing at all', () => {
    expect(SettingsPatch.parse({ name: '  Northside  ', country: 'GB', timezone: 'Europe/London' })).toEqual({
      name: 'Northside',
      country: 'GB',
      timezone: 'Europe/London',
    })
    expect(SettingsPatch.parse({})).toEqual({})
    for (const country of OPEN_MARKETS) expect(SettingsPatch.parse({ country })).toEqual({ country })
  })

  test.each([
    ['a blank name', { name: ' ' }, 'gymName'],
    ['a name over 80', { name: 'x'.repeat(81) }, 'gymName'],
    ['a null name', { name: null }, 'gymName'],
    ['a country outside the five', { country: 'IN' }, 'country'],
    ['the market as a word', { country: 'UK' }, 'country'],
    ['a null country', { country: null }, 'country'],
    ['an unknown time zone', { timezone: 'Mars/Olympus' }, 'timezone'],
    ['a time zone that is not text', { timezone: 3 }, 'timezone'],
    ['a body that is not an object', 'x', 'generic'],
  ])('FR-GYM-01 rejects %s with its code', (_, input, code) => {
    expect(firstCode(input)).toBe(code)
    expect(ErrorCode.safeParse(code).success).toBe(true)
  })
})

describe('QrQuery', () => {
  test('FR-GYM-03 needs the text to encode, else qrLink', () => {
    expect(QrQuery.parse({ text: 'http://192.168.137.1:5175' })).toEqual({ text: 'http://192.168.137.1:5175' })
    expect(QrQuery.safeParse({}).error?.issues[0]?.message).toBe('qrLink')
  })
})
