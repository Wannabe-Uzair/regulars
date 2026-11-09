import type {
  NudgeChannel as DomainNudgeChannel,
  NudgeOutcome as DomainNudgeOutcome,
  StoredNudgeChannel as DomainStoredNudgeChannel,
} from '@tenure/domain'
import { describe, expect, expectTypeOf, test } from 'vitest'
import type { z } from 'zod'
import {
  NudgeChannel,
  NudgeLogEntry,
  NudgeOutcome,
  nudgeDays,
  NudgesQuery,
  NudgesResponse,
  RecordNudgeRequest,
  RecordNudgeResponse,
  StoredNudgeChannel,
} from './nudges.ts'

const firstCode = (schema: z.ZodType, input: unknown) => {
  const r = schema.safeParse(input)
  if (r.success) throw new Error(`expected ${JSON.stringify(input)} to fail`)
  return r.error.issues[0]?.message
}

const record = { memberId: 12, body: 'Hey Hana', channel: 'text' }

describe('RecordNudgeRequest', () => {
  test.each(['text', 'whatsapp', 'copy', 'in-person'])('FR-NUDGE-02 takes the channel %s and trims the message', (channel) => {
    expect(RecordNudgeRequest.parse({ ...record, body: ' Hey Hana\n', channel })).toEqual({ ...record, channel })
  })

  test('FR-NUDGE-08 takes a template id, or none', () => {
    expect(RecordNudgeRequest.parse({ ...record, templateId: 3 }).templateId).toBe(3)
    expect(RecordNudgeRequest.parse({ ...record, templateId: null }).templateId).toBeNull()
  })

  test.each([
    ['an unknown channel', { ...record, channel: 'fax' }, 'generic'],
    ['own-phone, which only old rows hold', { ...record, channel: 'own-phone' }, 'generic'],
    ['no channel', { memberId: 12, body: 'Hi' }, 'generic'],
    ['no member', { body: 'Hi', channel: 'text' }, 'notFound'],
    ['a member id as text', { ...record, memberId: '12' }, 'notFound'],
    ['a member id of 0', { ...record, memberId: 0 }, 'notFound'],
    ['a blank message', { ...record, body: '   ' }, 'messageBody'],
    ['a message of 1,001', { ...record, body: 'b'.repeat(1001) }, 'messageBody'],
    ['a malformed template id', { ...record, templateId: 'abc' }, 'templateNotFound'],
    ['a template id of -1', { ...record, templateId: -1 }, 'templateNotFound'],
    ['a list', [record], 'generic'],
    ['a bad member before a bad message', { memberId: 'x', body: '', channel: 'fax' }, 'notFound'],
    ['a bad message before a bad channel', { memberId: 12, body: '', channel: 'fax' }, 'messageBody'],
  ])('FR-NUDGE-02 refuses %s with its code', (_, input, code) => {
    expect(firstCode(RecordNudgeRequest, input)).toBe(code)
  })
})

describe('RecordNudgeResponse', () => {
  const nudge = { id: 1, memberId: 12, templateId: null, at: '2026-11-06T18:00:00.000Z', body: 'Hi', channel: 'text' }

  test('FR-NUDGE-03 carries the nudge and both links, null for a member with no phone', () => {
    const links = { smsUrl: 'sms:+13125550142?&body=Hi', whatsappUrl: 'https://wa.me/13125550142?text=Hi' }
    expect(RecordNudgeResponse.safeParse({ nudge, ...links }).success).toBe(true)
    expect(RecordNudgeResponse.safeParse({ nudge: { ...nudge, channel: 'in-person' }, smsUrl: null, whatsappUrl: null }).success).toBe(true)
  })

  test('FR-NUDGE-02 a new nudge is never own-phone', () => {
    expect(RecordNudgeResponse.safeParse({ nudge: { ...nudge, channel: 'own-phone' }, smsUrl: null, whatsappUrl: null }).success).toBe(false)
  })
})

describe('NudgeLogEntry', () => {
  const entry = { id: 1, at: '2026-11-06T18:00:00.000Z', memberId: 12, memberName: 'Sam O.', by: 'Priya S.', body: 'Hi', channel: 'text', outcome: 'waiting' }

  test.each(['text', 'whatsapp', 'copy', 'in-person', null])('FR-NUDGE-06 takes the channel %s', (channel) => {
    expect(NudgesResponse.safeParse([{ ...entry, channel }]).success).toBe(true)
  })

  test('FR-NUDGE-06 the log shows no channel word for an old nudge: own-phone is refused, null is its channel', () => {
    expect(NudgesResponse.safeParse([{ ...entry, channel: 'own-phone' }]).success).toBe(false)
  })

  test.each(['cameBack', 'waiting', 'noVisit'])('FR-NUDGE-06 takes the outcome %s, and a sender who is gone', (outcome) => {
    expect(NudgeLogEntry.safeParse({ ...entry, outcome, by: null }).success).toBe(true)
  })

  test('FR-NUDGE-06 refuses an unknown channel or outcome', () => {
    expect(NudgeLogEntry.safeParse({ ...entry, channel: 'sms' }).success).toBe(false)
    expect(NudgeLogEntry.safeParse({ ...entry, outcome: 'came back' }).success).toBe(false)
  })
})

describe('the days', () => {
  test.each([
    [undefined, 30],
    ['7', 7],
    ['0', 1],
    ['', 1],
    ['abc', 30],
    ['5.6', 6],
    ['1000', 365],
    ['-3', 1],
    ['Infinity', 30],
  ])('FR-NUDGE-06 ?days=%j reads as %d', (raw, days) => {
    expect(nudgeDays(raw)).toBe(days)
    expect(NudgesQuery.parse(raw === undefined ? {} : { days: raw })).toEqual({ days })
  })
})

test('FR-NUDGE-02 the wire types equal the domain types', () => {
  expect(NudgeChannel.options).toEqual(['text', 'whatsapp', 'copy', 'in-person'])
  expect(StoredNudgeChannel.options).toEqual(['text', 'whatsapp', 'copy', 'in-person', 'own-phone'])
  expectTypeOf<NudgeChannel>().toEqualTypeOf<DomainNudgeChannel>()
  expectTypeOf<StoredNudgeChannel>().toEqualTypeOf<DomainStoredNudgeChannel>()
  expectTypeOf<NudgeOutcome>().toEqualTypeOf<DomainNudgeOutcome>()
})
