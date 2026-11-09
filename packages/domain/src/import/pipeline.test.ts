import { expect, test } from 'vitest'
import { importCounts, importProblems, planImport, readImport } from './pipeline.ts'
import { SAMPLE_MEMBERS_CSV } from './samples.ts'

const US = { country: 'US', timeZone: 'America/Chicago' } as const
const GB = { country: 'GB', timeZone: 'Europe/London' } as const
const NOW = new Date('2026-11-06T18:00:00.000Z')
const empty = { members: [], staff: [], checkins: () => [] }

const csv = (...lines: string[]) => lines.join('\n')

test("FR-IMPORT-04 dates read in the gym country's order when the file doesn't settle it, and the first rows show as read", () => {
  const file = csv('First Name,Join Date', 'Ana,03/04/2026', 'Ben,', 'Cy,05/06/2026', 'Di,07/08/2026', 'Ed,09/10/2026')
  const us = readImport({ kind: 'members', csv: file }, US)
  expect(us?.dates).toEqual({ order: 'mdy', source: 'country', file: null, country: 'mdy' })
  expect(us?.readings).toEqual([
    { row: 2, raw: '03/04/2026', date: '2026-03-04', at: null },
    { row: 4, raw: '05/06/2026', date: '2026-05-06', at: null },
    { row: 5, raw: '07/08/2026', date: '2026-07-08', at: null },
  ])
  const gb = readImport({ kind: 'members', csv: file }, GB)
  expect(gb?.dates).toEqual({ order: 'dmy', source: 'country', file: null, country: 'dmy' })
  expect(gb?.readings[0]).toEqual({ row: 2, raw: '03/04/2026', date: '2026-04-03', at: null })
})

test("FR-IMPORT-04 the file's own dates settle the order, and the owner can flip it", () => {
  const file = csv('First Name,Join Date', 'Ana,03/04/2026', 'Ben,25/04/2026')
  expect(readImport({ kind: 'members', csv: file }, US)?.dates).toEqual({
    order: 'dmy',
    source: 'file',
    file: 'dmy',
    country: 'mdy',
  })
  const flipped = readImport({ kind: 'members', csv: file, dateOrder: 'mdy' }, US)
  expect(flipped?.dates).toEqual({ order: 'mdy', source: 'request', file: 'dmy', country: 'mdy' })
  expect(flipped?.readings.map((r) => r.date)).toEqual(['2026-03-04', null])
})

test("FR-IMPORT-04 a check-ins file's rows read as instants in the gym's zone", () => {
  const read = readImport({ kind: 'checkins', csv: csv('Member ID,Check-in Time', 'M1,03/04/2026 18:30') }, GB)
  expect(read?.readings).toEqual([
    { row: 2, raw: '03/04/2026 18:30', date: '2026-04-03', at: '2026-04-03T17:30:00.000Z' },
  ])
})

test("FR-IMPORT-02 the owner's mapping replaces the suggestion; a column the file lacks is refused", () => {
  const file = csv('Given,Surname,Started', 'Ana,Ruiz,2026-09-01')
  expect(readImport({ kind: 'members', csv: file }, US)?.missing).toEqual(['name', 'joinedOn'])
  const read = readImport({ kind: 'members', csv: file, mapping: { first_name: 'Given', joined_on: 2 } }, US)
  expect(read?.mapping).toMatchObject({ first_name: 0, joined_on: 2, last_name: null })
  expect(read?.missing).toEqual([])
  expect(readImport({ kind: 'members', csv: file, mapping: { first_name: 'Name' } }, US)).toBeUndefined()
})

test("FR-IMPORT-02 without a plan, the problems name the columns to choose after the file's own", () => {
  const read = readImport({ kind: 'checkins', csv: csv('Foo,Bar', '1') }, US)
  if (!read) throw new Error('unread')
  expect(importProblems(read, null)).toEqual([
    { code: 'missingColumns', row: 2, count: 1, columns: 2 },
    { code: 'findCheckinTime', row: null },
    { code: 'findMatch', row: null },
  ])
})

test("FR-IMPORT-05 the plan's lines come row by row, kept rows and skipped ones together", () => {
  const read = readImport(
    { kind: 'members', csv: csv('First Name,Join Date,Mobile', ',2026-09-01,', 'Ana,2026-09-01,12', 'Ben,nope,') },
    US,
  )
  if (!read) throw new Error('unread')
  const planned = planImport(read, empty, US, NOW)
  expect(importProblems(read, planned)).toEqual([
    { code: 'noFirstName', row: 2 },
    { code: 'badPhone', row: 3, value: '12' },
    { code: 'badJoinDate', row: 4, value: 'nope' },
  ])
  expect(importCounts(planned)).toEqual({ created: 1, updated: 0, restored: 0, skipped: 2 })
})

test('FR-IMPORT-06 the sample members plan as 12 creates through the whole pipeline', () => {
  const read = readImport({ kind: 'members', csv: SAMPLE_MEMBERS_CSV }, US)
  if (!read) throw new Error('unread')
  expect(read.dates).toEqual({ order: 'mdy', source: 'file', file: 'mdy', country: 'mdy' })
  const staff = ['mike', 'priya', 'jordan'].map((n, i) => ({ id: i + 1, email: `${n}@northside.test` }))
  const planned = planImport(read, { ...empty, staff }, US, NOW)
  expect(importCounts(planned)).toEqual({ created: 12, updated: 0, restored: 0, skipped: 0 })
  expect(importProblems(read, planned)).toEqual([])
})

test('FR-IMPORT-09 counts: a restore is an update, and is counted as a restore too', () => {
  const archived = {
    id: 1,
    externalId: 'E1',
    phone: null,
    firstName: 'Lena',
    lastName: null,
    email: null,
    joinedOn: '2026-09-01',
    coachId: null,
    archivedAt: '2026-10-15T12:00:00.000Z',
  }
  const snapshot = { members: [archived], staff: [], checkins: () => [] }
  const m = readImport({ kind: 'members', csv: csv('Member ID,First Name,Join Date', 'E1,Lena,2026-09-01') }, US)
  const c = readImport({ kind: 'checkins', csv: csv('Member ID,Check-in Time', 'E1,2026-10-01 06:00') }, US)
  if (!m || !c) throw new Error('unread')
  expect(importCounts(planImport(m, snapshot, US, NOW))).toEqual({ created: 0, updated: 1, restored: 1, skipped: 0 })
  expect(importCounts(planImport(c, snapshot, US, NOW))).toEqual({ created: 1, updated: 1, restored: 1, skipped: 0 })
})
