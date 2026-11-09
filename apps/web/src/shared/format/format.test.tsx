import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { me } from '../../test/fakes.ts'
import { sessionKey } from '../session/session.ts'
import { gymFormat } from './format.ts'
import { useGymFormat } from './useGymFormat.ts'

// 03:05Z on 7 Nov: the evening of the 6th in North America, the small hours of the 7th elsewhere.
const at = '2026-11-07T03:05:00.000Z'
const markets = {
  US: gymFormat({ country: 'US', timezone: 'America/Chicago' }),
  CA: gymFormat({ country: 'CA', timezone: 'America/Toronto' }),
  GB: gymFormat({ country: 'GB', timezone: 'Europe/London' }),
  PK: gymFormat({ country: 'PK', timezone: 'Asia/Karachi' }),
  AE: gymFormat({ country: 'AE', timezone: 'Asia/Dubai' }),
}

describe('the gym format', () => {
  test("FR-GLOBAL-03 times are the gym's, in its zone and with its country's clock", () => {
    // Each browser keeps its own English for the market, so am and pm are matched in either case (Safari's engine
    // writes AM where Chrome writes am). Intl puts a narrow space before them.
    expect(markets.US.time(at)).toMatch(/^9:05\sPM$/)
    expect(markets.CA.time(at)).toMatch(/^10:05\sp\.?m\.?$/i)
    expect(markets.GB.time(at)).toBe('03:05')
    expect(markets.GB.time('2026-11-06T17:42:00.000Z')).toBe('17:42')
    expect(markets.PK.time(at)).toMatch(/^8:05\sam$/i)
    expect(markets.AE.time(at)).toMatch(/^7:05\sam$/i)
  })

  test("FR-GLOBAL-03 dates follow the gym's locale: month first in North America, day first elsewhere", () => {
    expect(markets.US.date('2026-03-04')).toBe('Mar 4')
    expect(markets.CA.date('2026-03-04')).toBe('Mar 4')
    expect(markets.GB.date('2026-03-04')).toBe('4 Mar')
    expect(markets.PK.date('2026-03-04')).toBe('4 Mar')
    expect(markets.AE.date('2026-03-04')).toBe('4 Mar')
    expect(markets.US.date('2026-03-04', { year: true })).toBe('Mar 4, 2026')
    expect(markets.GB.date('2026-03-04', { year: true })).toBe('4 Mar 2026')
  })

  test("FR-GLOBAL-03 a calendar date is that day everywhere; an instant's date is the gym's day", () => {
    // A stored joining date doesn't move with the zone, even far from UTC.
    expect(gymFormat({ country: 'US', timezone: 'Pacific/Honolulu' }).date('2026-11-07')).toBe('Nov 7')
    expect(gymFormat({ country: 'AE', timezone: 'Pacific/Kiritimati' }).date('2026-11-07')).toBe('7 Nov')
    expect(markets.US.date(at)).toBe('Nov 6')
    expect(markets.GB.date(at)).toBe('7 Nov')
    expect(markets.US.dateTime(at)).toMatch(/^Nov 6, 9:05\sPM$/)
    expect(markets.GB.dateTime(at)).toBe('7 Nov, 03:05')
  })

  test("FR-GLOBAL-03 a date and time read alike in Safari and Chrome: the copy joins them, not the browser's own join", () => {
    // Safari's engine joins a date-and-time format with "at" ('Nov 6 at 9:05 PM'); a stand-in Intl does the same here.
    const Real = Intl.DateTimeFormat
    const asSafari = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions,
    ) {
      const real = new Real(locales, options)
      if (options?.month === undefined || options.hour === undefined) return real
      return Object.assign(Object.create(real) as Intl.DateTimeFormat, {
        format: (date?: Date | number) => real.format(date).replace(', ', ' at '),
      })
    } as unknown as typeof Intl.DateTimeFormat)
    try {
      expect(gymFormat({ country: 'US', timezone: 'America/Chicago' }).dateTime(at)).toMatch(/^Nov 6, 9:05\sPM$/)
      expect(gymFormat({ country: 'GB', timezone: 'Europe/London' }).dateTime(at)).toBe('7 Nov, 03:05')
    } finally {
      asSafari.mockRestore()
    }
  })

  test('FR-GLOBAL-03 months read as the short month and the year', () => {
    expect(markets.US.month('2026-08')).toBe('Aug 2026')
    expect(markets.GB.month('2026-08')).toBe('Aug 2026')
    expect(markets.GB.month('2027-01')).toBe('Jan 2027')
  })

  test("FR-MEMBER-03 a phone is national with the gym country's calling code, international otherwise", () => {
    expect(markets.US.phone('+13125550142')).toBe('(312) 555-0142')
    expect(markets.CA.phone('+13125550142')).toBe('(312) 555-0142') // one calling code for the US and Canada
    expect(markets.US.phone('+447911123456')).toBe('+44 7911 123456')
    expect(markets.GB.phone('+447911123456')).toBe('07911 123456')
    expect(markets.PK.phone('+923001234567')).toBe('0300 1234567')
    expect(markets.AE.phone('+923001234567')).toBe('+92 300 1234567')
  })

  test('FR-GLOBAL-03 a country outside the five markets reads as the US', () => {
    const format = gymFormat({ country: '', timezone: 'America/Chicago' })
    expect(format.country).toBe('US')
    expect(format.locale).toBe('en-US')
  })
})

describe('useGymFormat', () => {
  const wrapper = (client: QueryClient) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }

  test("FR-GLOBAL-03 the formats come from the signed-in gym's country and zone, not the device's", () => {
    const client = new QueryClient()
    const session = me('owner', { country: 'GB' })
    client.setQueryData(sessionKey, { ...session, gym: { ...session.gym, timezone: 'Asia/Dubai' } })
    const { result, rerender } = renderHook(() => useGymFormat(), { wrapper: wrapper(client) })
    expect(result.current.locale).toBe('en-GB')
    expect(result.current.timeZone).toBe('Asia/Dubai')
    expect(result.current.time(at)).toBe('07:05')
    expect(result.current.phone('+447911123456')).toBe('07911 123456')
    // The same formatters on every render, so a list can call them per row.
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
