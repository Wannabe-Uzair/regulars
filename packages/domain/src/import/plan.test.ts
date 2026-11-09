// Ported from legacy/app/server/import/test/plan.test.mjs: 17 of its 18, at a US gym reading month first. The sample
// check-ins "even at UTC-12" case waits for the polish. Then data-fixes.test.mjs's planner case, and the first
// version's rules: phones in the gym's country, full names, restores and the guards that keep a write from clashing.
import { expect, test } from 'vitest'
import { parseCsv } from './csv.ts'
import { guessMapping, type ImportMapping } from './mapping.ts'
import { type ImportExistingMember, planCheckins, planMembers } from './plan.ts'
import { SAMPLE_CHECKINS_CSV, SAMPLE_MEMBERS_CSV } from './samples.ts'

const M: ImportMapping = {
  external_id: 0,
  first_name: 1,
  last_name: 2,
  phone: 3,
  email: 4,
  joined_on: 5,
  coach_email: 6,
}
const TZ = 'America/Chicago'
const NOW = new Date('2026-11-06T12:00:00Z')
const US = { country: 'US', dateOrder: 'mdy' } as const

/** An existing member, with legacy's blanks for whatever the test leaves out. */
const member = (m: Partial<ImportExistingMember> & { id: number }): ImportExistingMember => ({
  externalId: null,
  phone: null,
  firstName: '',
  lastName: null,
  email: null,
  joinedOn: '2026-01-01',
  coachId: null,
  archivedAt: null,
  ...m,
})

const members = (opts: Partial<Parameters<typeof planMembers>[0]> & { rows: string[][] }) =>
  planMembers({ mapping: M, existing: [], staff: [], ...US, ...opts })

test('FR-IMPORT-06 planMembers creates with normalised fields and spreadsheet row numbers', () => {
  const r = members({
    rows: [['A1', ' maria ', 'Lopez', '(312) 555-0142', 'MARIA@X.COM', '9/3/26', 'Mike@Northside.test']],
    staff: [{ id: 7, email: 'mike@northside.test' }],
  })
  expect(r.creates).toEqual([
    {
      row: 2,
      externalId: 'A1',
      firstName: 'maria',
      lastName: 'Lopez',
      phone: '+13125550142',
      email: 'maria@x.com',
      joinedOn: '2026-09-03',
      coachId: 7,
    },
  ])
  expect(r.problems).toEqual([])
})

test('FR-IMPORT-02 required fields missing from mapping gives problems, no plan', () => {
  const r = members({ rows: [['x']], mapping: { first_name: null, joined_on: null } })
  expect(r.problems).toEqual([
    { code: 'noNameColumn', row: null },
    { code: 'noJoinDateColumn', row: null },
  ])
  expect(r.creates).toHaveLength(0)
})

test('FR-IMPORT-05 rows without first name or readable join date are skipped', () => {
  const r = members({
    rows: [
      ['1', '', 'L', '', '', '2026-01-01', ''],
      ['2', 'B', '', '', '', 'nope', ''],
      ['3', 'C', '', '', '', '', ''],
    ],
  })
  expect(r.creates).toHaveLength(0)
  expect(r.skipped).toEqual([
    { code: 'noFirstName', row: 2 },
    { code: 'badJoinDate', row: 3, value: 'nope' },
    { code: 'noJoinDate', row: 4 },
  ])
})

test('FR-IMPORT-05 bad phone/email/coach: member still created, problem reported', () => {
  const r = members({ rows: [['1', 'A', '', '12', 'bad', '2026-01-01', 'who@x.test']] })
  expect(r.creates).toHaveLength(1)
  expect(r.creates[0]).toMatchObject({ phone: null, email: null, coachId: null })
  expect(r.problems).toEqual([
    { code: 'badPhone', row: 2, value: '12' },
    { code: 'badEmail', row: 2, value: 'bad' },
    { code: 'unknownCoach', row: 2, value: 'who@x.test' },
  ])
})

test('FR-IMPORT-06 match by external_id beats match by phone', () => {
  const existing = [
    member({ id: 1, externalId: 'E1', phone: '+13125550101', firstName: 'One' }),
    member({ id: 2, externalId: 'E2', phone: '+13125550142', firstName: 'Two' }),
  ]
  // The row carries E1 but member 2's phone.
  const r = members({ rows: [['E1', 'Uno', '', '3125550142', '', '2026-01-01', '']], existing })
  expect(r.updates).toHaveLength(1)
  expect(r.updates[0]?.id).toBe(1)
  expect(r.updates[0]?.changes.firstName).toBe('Uno')
  expect(r.creates).toHaveLength(0)
})

test('FR-IMPORT-06 falls back to phone match and fills in a missing external_id', () => {
  const existing = [member({ id: 2, phone: '+13125550142', firstName: 'Two' })]
  const r = members({ rows: [['NEW9', 'Two', '', '312-555-0142', '', '2026-01-01', '']], existing })
  expect(r.updates).toEqual([{ id: 2, row: 2, changes: { externalId: 'NEW9' }, restore: false }])
})

test('FR-IMPORT-06 unchanged existing member is skipped; blank cells never overwrite', () => {
  const existing = [
    member({ id: 3, externalId: 'E3', phone: '+13125550143', firstName: 'Tre', lastName: 'Q', email: 'q@x.com' }),
  ]
  const r = members({ rows: [['E3', 'Tre', '', '', '', '2026-01-01', '']], existing })
  expect(r.updates).toHaveLength(0)
  expect(r.skipped).toEqual([{ code: 'upToDate', row: 2 }])
})

// Legacy's last row had another ID (D3) on D2's phone and was skipped too. Under IM10 and IM11 two IDs are two people,
// so that row has no ID here: a phone repeats only when one of the two rows has none.
test('FR-IMPORT-06 duplicate rows within the file are skipped', () => {
  const r = members({
    rows: [
      ['D1', 'A', '', '', '', '2026-01-01', ''],
      ['D1', 'A', '', '', '', '2026-01-01', ''],
      ['D2', 'B', '', '312-555-0142', '', '2026-01-01', ''],
      ['', 'C', '', '3125550142', '', '2026-01-01', ''],
    ],
  })
  expect(r.creates).toHaveLength(2)
  expect(r.skipped).toEqual([
    { code: 'repeated', row: 3 },
    { code: 'repeated', row: 5 },
  ])
})

test('FR-IMPORT-06 two new rows with different IDs on one phone are two people: the second has no phone', () => {
  const r = members({
    rows: [
      ['M-2001', 'Ayesha', 'Khan', '312-555-0142', '', '2026-10-01', ''],
      ['M-2002', 'Bilal', 'Khan', '312-555-0142', '', '2026-10-01', ''],
    ],
  })
  expect(r.creates).toMatchObject([
    { row: 2, externalId: 'M-2001', firstName: 'Ayesha', phone: '+13125550142' },
    { row: 3, externalId: 'M-2002', firstName: 'Bilal', phone: null },
  ])
  expect(r.skipped).toEqual([])
  expect(r.problems).toEqual([{ code: 'phoneTaken', row: 3, value: '312-555-0142' }])
})

// ---- check-ins
const checkinMembers = [
  member({ id: 1, externalId: 'E1', phone: '+13125550101', joinedOn: '2026-09-01' }),
  member({ id: 2, externalId: 'E2', phone: '+13125550102', joinedOn: '2026-09-01' }),
]
const C: ImportMapping = { external_id: 0, phone: 1, checked_in_at: 2 }
const checkins = (rows: string[][], existing: { memberId: number; at: string }[] = [], list = checkinMembers) =>
  planCheckins({ rows, mapping: C, timeZone: TZ, members: list, existing, now: NOW, ...US })

test('FR-IMPORT-07 checkins match by external_id then phone', () => {
  const r = checkins([
    ['E1', '', '2026-10-01 06:00'],
    ['', '(312) 555-0102', '2026-10-01 06:00'],
  ])
  expect(r.creates.map((c) => c.memberId)).toEqual([1, 2])
  expect(r.creates[0]?.at).toBe('2026-10-01T11:00:00.000Z')
})

test('FR-IMPORT-07 unknown member and unparseable time are skipped', () => {
  const r = checkins([
    ['ZZ', '', '2026-10-01 06:00'],
    ['E1', '', 'lunchtime'],
    ['E1', '', ''],
  ])
  expect(r.creates).toHaveLength(0)
  expect(r.skipped).toEqual([
    { code: 'noMemberId', row: 2, value: 'ZZ' },
    { code: 'badCheckinTime', row: 3, value: 'lunchtime' },
    { code: 'noCheckinTime', row: 4 },
  ])
})

test("FR-IMPORT-07 an unknown ID doesn't fall back to a phone whose member has another ID", () => {
  const list = [member({ id: 1, externalId: 'M-2001', phone: '+13125550142', joinedOn: '2026-09-01' })]
  const r = checkins([['M-2002', '312-555-0142', '2026-10-05 18:00']], [], list)
  expect(r.creates).toEqual([])
  expect(r.skipped).toEqual([{ code: 'noMemberId', row: 2, value: 'M-2002' }])
})

test('FR-IMPORT-07 future times are skipped', () => {
  const r = checkins([
    ['E1', '', '2026-11-06 05:00'],
    ['E1', '', '2026-11-07 08:00'],
  ])
  expect(r.creates).toHaveLength(1)
  expect(r.skipped).toEqual([{ code: 'future', row: 3 }])
})

test('FR-IMPORT-07 times before the member joined are skipped (gym-local day)', () => {
  const r = checkins([
    ['E1', '', '2026-08-31 23:30'],
    ['E1', '', '2026-09-01 00:10'],
  ])
  expect(r.creates).toHaveLength(1)
  expect(r.skipped).toEqual([{ code: 'beforeJoined', row: 2, date: '2026-09-01' }])
})

test('FR-IMPORT-07 duplicates within 1 hour of earlier imported or existing check-ins are skipped', () => {
  const r = checkins(
    [
      ['E1', '', '2026-10-01 06:00'],
      ['E1', '', '2026-10-01 06:59'],
      ['E1', '', '2026-10-01 07:00'],
      ['E2', '', '2026-10-02 06:30'],
      ['E1', '', '2026-10-03 18:00'],
    ],
    [{ memberId: 2, at: '2026-10-02T11:00:00.000Z' }], // 06:00 CDT
  )
  expect(r.creates.map((c) => c.at)).toEqual([
    '2026-10-01T11:00:00.000Z',
    '2026-10-01T12:00:00.000Z',
    '2026-10-03T23:00:00.000Z',
  ])
  expect(r.skipped).toEqual([
    { code: 'withinHour', row: 3 },
    { code: 'withinHour', row: 5 },
  ])
})

test('FR-IMPORT-07 same time for different members is not a duplicate', () => {
  expect(
    checkins([
      ['E1', '', '2026-10-01 06:00'],
      ['E2', '', '2026-10-01 06:00'],
    ]).creates,
  ).toHaveLength(2)
})

test('FR-IMPORT-02 missing checkin columns give problems', () => {
  const r = planCheckins({
    rows: [],
    mapping: { external_id: null, phone: null, checked_in_at: null },
    timeZone: TZ,
    members: [],
    existing: [],
    now: NOW,
    ...US,
  })
  expect(r.problems).toEqual([
    { code: 'noCheckinTimeColumn', row: null },
    { code: 'noMatchColumn', row: null },
  ])
})

// ---- samples
const staff = ['mike', 'priya', 'jordan'].map((n, i) => ({ id: i + 1, email: `${n}@northside.test` }))

/** The sample members, planned as creates, given ids 1 to 12. */
function sampleMembers(): ImportExistingMember[] {
  const p = parseCsv(SAMPLE_MEMBERS_CSV)
  const created = planMembers({ rows: p.rows, mapping: guessMapping('members', p.header), existing: [], staff, ...US })
  return created.creates.map((c, i) => member({ ...c, id: i + 1 }))
}

test('FR-IMPORT-06 sample members.csv plans cleanly: 12 creates, no problems', () => {
  const p = parseCsv(SAMPLE_MEMBERS_CSV)
  expect(p.problems).toEqual([])
  const mapping = guessMapping('members', p.header)
  const r = planMembers({ rows: p.rows, mapping, existing: [], staff, rowNumbers: p.rowNumbers, ...US })
  expect(r.creates).toHaveLength(12)
  expect(r.problems).toEqual([])
  expect(r.skipped).toEqual([])
  expect(r.creates.some((c) => c.lastName === 'Okafor, Jr.')).toBe(true)
})

test('FR-IMPORT-07 sample checkins.csv plans cleanly against those members', () => {
  const cp = parseCsv(SAMPLE_CHECKINS_CSV)
  expect(cp.problems).toEqual([])
  const mapping = guessMapping('checkins', cp.header)
  const r = planCheckins({
    rows: cp.rows,
    mapping,
    timeZone: TZ,
    members: sampleMembers(),
    existing: [],
    now: NOW,
    rowNumbers: cp.rowNumbers,
    ...US,
  })
  expect(r.problems).toEqual([])
  expect(r.skipped).toEqual([])
  expect(r.creates).toHaveLength(cp.rows.length)
  expect(r.creates.length).toBeGreaterThan(100)
})

// ---- data-fixes.test.mjs
test('FR-IMPORT-06 a row cannot give an existing member an ID an earlier row already planned', () => {
  const r = members({
    rows: [
      ['X1', 'New', '', '', '', '2026-09-01'],
      ['X1', 'Kiosk', '', '(312) 555-0142', '', '2026-09-01'],
    ],
    mapping: { external_id: 0, first_name: 1, last_name: 2, phone: 3, email: 4, joined_on: 5 },
    existing: [member({ id: 5, phone: '+13125550142', firstName: 'Kiosk', joinedOn: '2026-09-01' })],
  })
  expect(r.creates).toHaveLength(1)
  expect(r.updates).toHaveLength(0)
  expect(r.skipped).toEqual([{ code: 'idUsedEarlier', row: 3, value: 'X1' }])
})

// ---- the first version
test('FR-GLOBAL-02 a US gym reads "+312 555 0142" as a local number, for members and for check-ins', () => {
  const r = members({ rows: [['', 'Ana', '', '+312 555 0142', '', '2026-09-01', '']] })
  expect(r.creates[0]?.phone).toBe('+13125550142')
  const c = checkins([['', '+312 555 0142', '2026-10-01 06:00']], [], [member({ id: 9, phone: '+13125550142' })])
  expect(c.creates.map((x) => x.memberId)).toEqual([9])
})

test('FR-GLOBAL-02 a UK gym reads phones in the UK, and its dates day first', () => {
  const r = members({ rows: [['', 'Ana', '', '020 7946 0958', '', '03/04/2026', '']], country: 'GB', dateOrder: 'dmy' })
  expect(r.creates[0]).toMatchObject({ phone: '+442079460958', joinedOn: '2026-04-03' })
  expect(members({ rows: [['', 'Ana', '', '020 7946 0958', '', '2026-04-03', '']] }).problems).toEqual([
    { code: 'badPhone', row: 2, value: '020 7946 0958' },
  ])
})

test('FR-IMPORT-03 a Full name column is split, and a single word is a first name only', () => {
  const F: ImportMapping = { full_name: 0, joined_on: 1 }
  const r = members({
    rows: [
      ['Mary Ann Smith', '2026-09-01'],
      ['Lopez, Maria', '2026-09-01'],
      ['Cher', '2026-09-01'],
      ['  ', '2026-09-01'],
    ],
    mapping: F,
  })
  expect(r.creates.map((c) => [c.firstName, c.lastName])).toEqual([
    ['Mary', 'Ann Smith'],
    ['Maria', 'Lopez'],
    ['Cher', null],
  ])
  expect(r.skipped).toEqual([{ code: 'noName', row: 5 }])
})

test('FR-IMPORT-03 a first name cell wins over the full name; a blank one falls back to it', () => {
  const r = members({
    rows: [
      ['Maria', 'Lopez', 'Maria Lopez-Diaz', '2026-09-01'],
      ['', '', 'Sam Ortiz', '2026-09-01'],
    ],
    mapping: { first_name: 0, last_name: 1, full_name: 2, joined_on: 3 },
  })
  expect(r.creates.map((c) => [c.firstName, c.lastName])).toEqual([
    ['Maria', 'Lopez'],
    ['Sam', 'Ortiz'],
  ])
})

test('FR-IMPORT-05 a phone that belongs to another member is left as it was, and the row says so', () => {
  const existing = [
    member({ id: 1, externalId: 'E1', phone: '+13125550101', firstName: 'One' }),
    member({ id: 2, externalId: 'E2', phone: '+13125550142', firstName: 'Two' }),
  ]
  const r = members({ rows: [['E1', 'One', '', '312 555 0142', '', '2026-01-01', '']], existing })
  expect(r.updates).toEqual([])
  expect(r.skipped).toEqual([{ code: 'upToDate', row: 2 }])
  expect(r.problems).toEqual([{ code: 'phoneTaken', row: 2, value: '312 555 0142' }])
})

test('FR-IMPORT-06 two different IDs on one phone are two people: the new one is created without the phone', () => {
  const existing = [
    member({ id: 1, externalId: 'M-2001', phone: '+13125550142', firstName: 'Ayesha', lastName: 'Khan' }),
  ]
  const r = members({ rows: [['M-2002', 'Bilal', 'Khan', '312-555-0142', '', '2026-10-01', '']], existing })
  expect(r.updates).toEqual([])
  expect(r.creates).toMatchObject([{ externalId: 'M-2002', firstName: 'Bilal', phone: null }])
  expect(r.problems).toEqual([{ code: 'phoneTaken', row: 2, value: '312-555-0142' }])
})

test('FR-IMPORT-09 a recycled number on an archived member restores nobody', () => {
  const existing = [
    member({
      id: 1,
      externalId: 'M-0007',
      phone: '+13125550142',
      firstName: 'Sana',
      archivedAt: '2025-06-01T00:00:00.000Z',
    }),
  ]
  const r = members({ rows: [['M-5009', 'Hamza', 'Malik', '3125550142', '', '2026-10-01', '']], existing })
  expect(r.updates).toEqual([])
  expect(r.creates).toMatchObject([{ externalId: 'M-5009', phone: null }])
})

test('FR-IMPORT-09 a members row that matches an archived member restores them, and says so', () => {
  const existing = [
    member({
      id: 4,
      externalId: 'E4',
      firstName: 'Lena',
      joinedOn: '2026-09-01',
      archivedAt: '2026-10-15T12:00:00.000Z',
    }),
    member({
      id: 5,
      externalId: 'E5',
      firstName: 'Omar',
      joinedOn: '2026-09-01',
      archivedAt: '2026-10-15T12:00:00.000Z',
    }),
  ]
  const r = members({
    rows: [
      ['E4', 'Lena', '', '', '', '2026-09-01', ''],
      ['E5', 'Omar', 'Haddad', '', '', '2026-09-01', ''],
    ],
    existing,
  })
  expect(r.updates).toEqual([
    { id: 4, row: 2, changes: {}, restore: true },
    { id: 5, row: 3, changes: { lastName: 'Haddad' }, restore: true },
  ])
  expect(r.skipped).toEqual([])
  expect(r.problems).toEqual([
    { code: 'restored', row: 2 },
    { code: 'restored', row: 3 },
  ])
})

test('FR-IMPORT-09 a check-in row that matches an archived member restores them once', () => {
  const list = [member({ id: 1, externalId: 'E1', joinedOn: '2026-09-01', archivedAt: '2026-10-15T12:00:00.000Z' })]
  const r = checkins(
    [
      ['E1', '', '2026-10-01 06:00'],
      ['E1', '', '2026-10-02 06:00'],
    ],
    [],
    list,
  )
  expect(r.creates).toHaveLength(2)
  expect(r.restores).toEqual([{ row: 2, id: 1 }])
  expect(r.problems).toEqual([{ code: 'restored', row: 2 }])
})

test('FR-IMPORT-05 a phone or ID a spreadsheet rewrote is never read as digits', () => {
  // At a UAE gym "9.71501E+11" would otherwise read as the landline +97197150111.
  const r = members({
    rows: [
      ['2E+12', 'Ali', '', '9.71501E+11', '', '01/10/2026', ''],
      ['2E+12', 'Sara', '', '', '', '01/10/2026', ''],
    ],
    country: 'AE',
    dateOrder: 'dmy',
  })
  expect(r.creates).toMatchObject([
    { firstName: 'Ali', externalId: null, phone: null },
    { firstName: 'Sara', externalId: null, phone: null },
  ])
  expect(r.problems).toEqual([{ code: 'badPhone', row: 2, value: '9.71501E+11' }])
})

test('FR-IMPORT-08 a phone freed by an earlier row is not given to a new member, so the write cannot clash', () => {
  // Row 2 moves M-1001 to a new number; row 3 asks for M-1001's old one. Creates are written first.
  const existing = [member({ id: 1, externalId: 'M-1001', phone: '+17735550110', firstName: 'Maria' })]
  const r = members({
    rows: [
      ['M-1001', 'Maria', '', '773-555-0199', '', '2026-01-01', ''],
      ['M-1013', 'Zara', '', '773-555-0110', '', '2026-01-01', ''],
    ],
    existing,
  })
  expect(r.updates).toEqual([{ id: 1, row: 2, changes: { phone: '+17735550199' }, restore: false }])
  expect(r.creates).toMatchObject([{ firstName: 'Zara', phone: null }])
  expect(r.problems).toEqual([{ code: 'phoneTaken', row: 3, value: '773-555-0110' }])
})

test("FR-IMPORT-08 an update can't take a phone a new member in the file was given", () => {
  const existing = [member({ id: 2, externalId: 'M-1002', phone: '+17735550111', firstName: 'Devon' })]
  const r = members({
    rows: [
      ['', 'Zara', '', '773-555-0177', '', '2026-01-01', ''],
      ['M-1002', 'Devon', '', '773-555-0177', '', '2026-01-01', ''],
    ],
    existing,
  })
  expect(r.creates).toMatchObject([{ firstName: 'Zara', phone: '+17735550177' }])
  expect(r.updates).toEqual([])
  expect(r.skipped).toEqual([{ code: 'upToDate', row: 3 }])
  expect(r.problems).toEqual([{ code: 'phoneTaken', row: 3, value: '773-555-0177' }])
})
