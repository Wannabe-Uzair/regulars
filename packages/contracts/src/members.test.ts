import type { Kpis as DomainKpis, MemberSummary as DomainMemberSummary, Status as DomainStatus } from '@tenure/domain'
import { STATUSES } from '@tenure/domain'
import { describe, expect, expectTypeOf, test } from 'vitest'
import type { z } from 'zod'
import {
  MemberCreateRequest,
  MemberDeleteResponse,
  MemberDetailResponse,
  MemberPatchRequest,
  MembersQuery,
  MembersResponse,
  MemberSummary,
  Status,
} from './members.ts'
import { summary } from './test-fixtures.ts'
import { Kpis } from './today.ts'

describe('Status', () => {
  test('is the four domain statuses', () => {
    expect(Status.options).toEqual([...STATUSES])
    expect(Status.safeParse('gone').success).toBe(false)
  })
})

describe('MemberSummary', () => {
  test('accepts a summary like the old app sends, and a brand-new member', () => {
    expect(MemberSummary.safeParse(summary).success).toBe(true)
    const fresh = { ...summary, phone: null, coachId: null, coachName: null, daysSinceJoin: 0, week: 0, weeks: [0], pace: null, status: 'new', lastVisitOn: null, daysSinceLastVisit: null, lastNudgeAt: null }
    expect(MemberSummary.safeParse(fresh).success).toBe(true)
  })

  test.each([
    ['an unknown status', { status: 'gone' }],
    ['a snake_case field', { joinedOn: undefined, joined_on: '2026-09-01' }],
    ['a date with a time', { joinedOn: '2026-09-01T00:00:00Z' }],
    ['a missing last name (the summary sends "")', { lastName: null }],
    ['a week past 12', { week: 13 }],
  ])('rejects %s', (_, patch) => {
    expect(MemberSummary.safeParse({ ...summary, ...patch }).success).toBe(false)
  })

  test('the wire types equal the domain types', () => {
    expectTypeOf<MemberSummary>().toEqualTypeOf<DomainMemberSummary>()
    expectTypeOf<Kpis>().toEqualTypeOf<DomainKpis>()
    expectTypeOf<Status>().toEqualTypeOf<DomainStatus>()
  })
})

const firstCode = (schema: z.ZodType, input: unknown) => {
  const r = schema.safeParse(input)
  if (r.success) throw new Error(`expected ${JSON.stringify(input)} to fail`)
  return r.error.issues[0]?.message
}

describe('the members requests and responses', () => {
  test('FR-MEM-01 the list has three views, first 90 days by default', () => {
    expect(MembersQuery.parse({})).toEqual({ view: 'first90' })
    for (const view of ['first90', 'everyone', 'archived']) expect(MembersQuery.parse({ view })).toEqual({ view })
    expect(firstCode(MembersQuery, { view: 'all' })).toBe('generic')
    expect(MembersResponse.safeParse({ members: [summary] }).success).toBe(true)
  })

  test('FR-MEMBER-01 the member page carries the facts, 90 days, check-ins and nudges with their channel', () => {
    const nudge = { id: 1, at: '2026-11-02T15:04:00.000Z', by: 'Priya S.', body: 'Hey', channel: 'whatsapp', cameBack: false }
    const page = {
      member: { ...summary, email: null, source: 'kiosk', archivedAt: null },
      days: [{ date: '2026-09-01', day: 0, visited: true }],
      checkins: [{ at: '2026-09-01T15:00:00.000Z', source: 'kiosk' }],
      nudges: [nudge, { ...nudge, id: 2, by: null, channel: null, cameBack: true }],
    }
    expect(MemberDetailResponse.strict().safeParse(page).success).toBe(true)
    expect(MemberDetailResponse.safeParse({ ...page, nudges: [{ ...nudge, channel: 'own-phone' }] }).success).toBe(false)
  })

  test('FR-MEMBER-02 an edit takes only the fields sent, cleaning the names; a blank last name is none', () => {
    expect(MemberPatchRequest.parse({})).toEqual({})
    expect(MemberPatchRequest.parse({ firstName: '  Mary   Ann ', lastName: '  ' })).toEqual({ firstName: 'Mary Ann', lastName: null })
    expect(MemberPatchRequest.parse({ coachId: null, phone: null })).toEqual({ coachId: null, phone: null })
    expect(MemberPatchRequest.parse({ phone: '(312) 555-0142', other: 1 })).toEqual({ phone: '(312) 555-0142' })
  })

  test.each([
    ['a blank first name', { firstName: ' ' }, 'memberFirstName'],
    ['a first name of null', { firstName: null }, 'memberFirstName'],
    ['a first name over 80', { firstName: 'x'.repeat(81) }, 'memberFirstName'],
    ['a last name over 80', { lastName: 'x'.repeat(81) }, 'generic'],
    ['a coach that is not an id', { coachId: 'Priya' }, 'coachChoice'],
    ['a coach id of 0', { coachId: 0 }, 'coachChoice'],
    ['a phone that is not text', { phone: 3125550142 }, 'phone'],
  ])('FR-MEMBER-02 an edit refuses %s', (_, body, code) => {
    expect(firstCode(MemberPatchRequest, body)).toBe(code)
  })

  test('FR-MEM-05 an add takes a first name, an optional last name, phone and coach, and a real join date', () => {
    expect(MemberCreateRequest.parse({ firstName: 'Leo', joinedOn: '2026-11-06' })).toEqual({ firstName: 'Leo', joinedOn: '2026-11-06' })
    expect(firstCode(MemberCreateRequest, { joinedOn: '2026-11-06' })).toBe('memberFirstName')
    for (const joinedOn of [undefined, '2026-02-31', '6 Nov 2026']) {
      expect(firstCode(MemberCreateRequest, { firstName: 'Leo', joinedOn })).toBe('joinedOn')
    }
    expect(MemberDeleteResponse.parse({ ok: true })).toEqual({ ok: true })
  })
})
