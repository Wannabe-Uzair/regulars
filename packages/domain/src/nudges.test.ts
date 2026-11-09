import { describe, expect, test } from 'vitest'
import { NUDGE_CHANNELS, NUDGE_OUTCOMES, nudgeOutcome, OLD_NUDGE_CHANNEL, shownNudgeChannel, STORED_NUDGE_CHANNELS } from './nudges.ts'

const SENT = '2026-11-01T10:00:00.000Z'
const HOUR = 3_600_000
const later = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString()
const WEEK = 7 * 24 * HOUR

describe('the channels', () => {
  test('FR-NUDGE-02 a nudge is recorded as text, whatsapp, copy or in-person; old rows hold own-phone', () => {
    expect(NUDGE_CHANNELS).toEqual(['text', 'whatsapp', 'copy', 'in-person'])
    expect(OLD_NUDGE_CHANNEL).toBe('own-phone')
    expect(STORED_NUDGE_CHANNELS).toEqual([...NUDGE_CHANNELS, 'own-phone'])
    expect(NUDGE_OUTCOMES).toEqual(['cameBack', 'waiting', 'noVisit'])
  })
})

describe('shownNudgeChannel', () => {
  test('FR-NUDGE-06 the four channels show as they are, and own-phone shows none', () => {
    expect(STORED_NUDGE_CHANNELS.map(shownNudgeChannel)).toEqual(['text', 'whatsapp', 'copy', 'in-person', null])
  })
})

describe('nudgeOutcome', () => {
  test('FR-NUDGE-07 a check-in strictly after the nudge and within 7 days is came back, exactly 7 days included', () => {
    const now = new Date(later(SENT, 30 * 24 * HOUR))
    expect(nudgeOutcome(SENT, [later(SENT, 5 * 24 * HOUR)], now)).toBe('cameBack')
    expect(nudgeOutcome(SENT, [later(SENT, WEEK)], now)).toBe('cameBack')
    expect(nudgeOutcome(SENT, [later(SENT, WEEK + 1)], now)).toBe('noVisit')
  })

  test('FR-NUDGE-07 a check-in before the nudge, or at the same instant, does not count', () => {
    const now = new Date(later(SENT, 30 * 24 * HOUR))
    expect(nudgeOutcome(SENT, [later(SENT, -HOUR), SENT], now)).toBe('noVisit')
  })

  test('FR-NUDGE-06 waiting while under 7 days old, no visit from exactly 7 days', () => {
    expect(nudgeOutcome(SENT, [], new Date(later(SENT, WEEK - 60_000)))).toBe('waiting')
    expect(nudgeOutcome(SENT, [], new Date(later(SENT, WEEK)))).toBe('noVisit')
    expect(nudgeOutcome(SENT, [later(SENT, -HOUR)], new Date(later(SENT, HOUR)))).toBe('waiting')
  })

  test('FR-NUDGE-07 the 7 days are 168 hours, across a clock change too (Chicago, 1 Nov 2026)', () => {
    // 18:30 CDT on Saturday 31 Oct, back at 18:00 CST on Saturday 7 Nov: 168.5 hours, so not within 7 days.
    const sent = '2026-10-31T23:30:00.000Z'
    const now = new Date('2026-11-10T00:00:00.000Z')
    expect(nudgeOutcome(sent, ['2026-11-08T00:00:00.000Z'], now)).toBe('noVisit')
    // The same pair a week earlier, with no clock change: 167.5 hours.
    expect(nudgeOutcome('2026-10-24T23:30:00.000Z', ['2026-10-31T23:00:00.000Z'], now)).toBe('cameBack')
  })
})
