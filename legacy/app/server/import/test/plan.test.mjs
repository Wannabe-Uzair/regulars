import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../csv.mjs';
import { guessMapping } from '../mapping.mjs';
import { planMembers, planCheckins } from '../plan.mjs';

const M = { external_id: 0, first_name: 1, last_name: 2, phone: 3, email: 4, joined_on: 5, coach_email: 6 };
const TZ = 'America/Chicago';
const NOW = new Date('2026-11-06T12:00:00Z');

test('planMembers creates with normalised fields and spreadsheet row numbers', () => {
  const r = planMembers({
    rows: [['A1', ' maria ', 'Lopez', '(312) 555-0142', 'MARIA@X.COM', '9/3/26', 'Mike@Northside.test']],
    mapping: M, existing: [], coaches: [{ id: 7, email: 'mike@northside.test' }],
  });
  assert.deepEqual(r.creates, [{ row: 2, externalId: 'A1', firstName: 'maria', lastName: 'Lopez', phone: '+13125550142', email: 'maria@x.com', joinedOn: '2026-09-03', coachId: 7 }]);
  assert.deepEqual(r.problems, []);
});
test('required fields missing from mapping gives problems, no plan', () => {
  const r = planMembers({ rows: [['x']], mapping: { first_name: null, joined_on: null }, existing: [], coaches: [] });
  assert.equal(r.problems.length, 2);
  assert.equal(r.creates.length, 0);
});
test('rows without first name or readable join date are skipped', () => {
  const r = planMembers({ rows: [['1', '', 'L', '', '', '2026-01-01', ''], ['2', 'B', '', '', '', 'nope', ''], ['3', 'C', '', '', '', '', '']], mapping: M });
  assert.equal(r.creates.length, 0);
  assert.deepEqual(r.skipped.map((s) => s.row), [2, 3, 4]);
  assert.match(r.skipped[0].reason, /^Row 2: /);
});
test('bad phone/email/coach: member still created, problem reported', () => {
  const r = planMembers({ rows: [['1', 'A', '', '12', 'bad', '2026-01-01', 'who@x.test']], mapping: M });
  assert.equal(r.creates.length, 1);
  assert.equal(r.creates[0].phone, null);
  assert.equal(r.creates[0].email, null);
  assert.equal(r.creates[0].coachId, null);
  assert.equal(r.problems.length, 3);
});
test('match by external_id beats match by phone', () => {
  const existing = [
    { id: 1, externalId: 'E1', phone: '+13125550101', firstName: 'One' },
    { id: 2, externalId: 'E2', phone: '+13125550142', firstName: 'Two' },
  ];
  // row carries E1 but member 2's phone
  const r = planMembers({ rows: [['E1', 'Uno', '', '3125550142', '', '2026-01-01', '']], mapping: M, existing });
  assert.equal(r.updates.length, 1);
  assert.equal(r.updates[0].id, 1);
  assert.equal(r.updates[0].changes.firstName, 'Uno');
  assert.equal(r.creates.length, 0);
});
test('falls back to phone match and fills in a missing external_id', () => {
  const existing = [{ id: 2, externalId: null, phone: '+13125550142', firstName: 'Two', joinedOn: '2026-01-01' }];
  const r = planMembers({ rows: [['NEW9', 'Two', '', '312-555-0142', '', '2026-01-01', '']], mapping: M, existing });
  assert.deepEqual(r.updates, [{ id: 2, row: 2, changes: { externalId: 'NEW9' } }]);
});
test('unchanged existing member is skipped; blank cells never overwrite', () => {
  const existing = [{ id: 3, externalId: 'E3', phone: '+13125550143', firstName: 'Tre', lastName: 'Q', email: 'q@x.com', joinedOn: '2026-01-01' }];
  const r = planMembers({ rows: [['E3', 'Tre', '', '', '', '2026-01-01', '']], mapping: M, existing });
  assert.equal(r.updates.length, 0);
  assert.equal(r.skipped.length, 1);
});
test('duplicate rows within the file are skipped', () => {
  const r = planMembers({ rows: [['D1', 'A', '', '', '', '2026-01-01', ''], ['D1', 'A', '', '', '', '2026-01-01', ''], ['D2', 'B', '', '312-555-0142', '', '2026-01-01', ''], ['D3', 'C', '', '3125550142', '', '2026-01-01', '']], mapping: M });
  assert.equal(r.creates.length, 2);
  assert.deepEqual(r.skipped.map((s) => s.row), [3, 5]);
});

// ---- check-ins
const members = [{ id: 1, externalId: 'E1', phone: '+13125550101', joinedOn: '2026-09-01' }, { id: 2, externalId: 'E2', phone: '+13125550102', joinedOn: '2026-09-01' }];
const C = { external_id: 0, phone: 1, checked_in_at: 2 };
const plan = (rows, existing = []) => planCheckins({ rows, mapping: C, timezone: TZ, members, existing, now: NOW });

test('checkins match by external_id then phone', () => {
  const r = plan([['E1', '', '2026-10-01 06:00'], ['', '(312) 555-0102', '2026-10-01 06:00']]);
  assert.deepEqual(r.creates.map((c) => c.memberId), [1, 2]);
  assert.equal(r.creates[0].at, '2026-10-01T11:00:00.000Z');
});
test('unknown member and unparseable time are skipped', () => {
  const r = plan([['ZZ', '', '2026-10-01 06:00'], ['E1', '', 'lunchtime'], ['E1', '', '']]);
  assert.equal(r.creates.length, 0);
  assert.deepEqual(r.skipped.map((s) => s.row), [2, 3, 4]);
});
test('future times are skipped', () => {
  const r = plan([['E1', '', '2026-11-06 05:00'], ['E1', '', '2026-11-07 08:00']]);
  assert.equal(r.creates.length, 1);
  assert.match(r.skipped[0].reason, /future/);
});
test('times before the member joined are skipped (gym-local day)', () => {
  const r = plan([['E1', '', '2026-08-31 23:30'], ['E1', '', '2026-09-01 00:10']]);
  assert.equal(r.creates.length, 1);
  assert.match(r.skipped[0].reason, /before the member joined/);
});
test('duplicates within 1 hour of earlier imported or existing check-ins are skipped', () => {
  const r = plan(
    [['E1', '', '2026-10-01 06:00'], ['E1', '', '2026-10-01 06:59'], ['E1', '', '2026-10-01 07:00'], ['E2', '', '2026-10-02 06:30'], ['E1', '', '2026-10-03 18:00']],
    [{ memberId: 2, at: '2026-10-02T11:00:00.000Z' }], // 06:00 CDT
  );
  assert.deepEqual(r.creates.map((c) => c.at), ['2026-10-01T11:00:00.000Z', '2026-10-01T12:00:00.000Z', '2026-10-03T23:00:00.000Z']);
  assert.deepEqual(r.skipped.map((s) => s.row), [3, 5]);
});
test('same time for different members is not a duplicate', () => {
  assert.equal(plan([['E1', '', '2026-10-01 06:00'], ['E2', '', '2026-10-01 06:00']]).creates.length, 2);
});
test('missing columns give problems', () => {
  const r = planCheckins({ rows: [], mapping: { external_id: null, phone: null, checked_in_at: null }, timezone: TZ, members: [], existing: [] });
  assert.equal(r.problems.length, 2);
});

// ---- samples
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'samples');
const coaches = ['mike', 'priya', 'jordan'].map((n, i) => ({ id: i + 1, email: `${n}@northside.test` }));

test('sample members.csv plans cleanly: 12 creates, no problems', () => {
  const p = parseCsv(readFileSync(join(dir, 'members.csv'), 'utf8'));
  assert.deepEqual(p.problems, []);
  const { mapping, problems } = guessMapping('members', p.header);
  assert.deepEqual(problems, []);
  const r = planMembers({ rows: p.rows, mapping, existing: [], coaches, rowNumbers: p.rowNumbers });
  assert.equal(r.creates.length, 12);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.skipped, []);
  assert.ok(r.creates.some((c) => c.lastName === 'Okafor, Jr.'));
});
test('sample checkins.csv plans cleanly against those members', () => {
  const mp = parseCsv(readFileSync(join(dir, 'members.csv'), 'utf8'));
  const mm = guessMapping('members', mp.header).mapping;
  const created = planMembers({ rows: mp.rows, mapping: mm, existing: [], coaches }).creates;
  const members = created.map((c, i) => ({ id: i + 1, externalId: c.externalId, phone: c.phone, joinedOn: c.joinedOn }));
  const cp = parseCsv(readFileSync(join(dir, 'checkins.csv'), 'utf8'));
  assert.deepEqual(cp.problems, []);
  const { mapping, problems } = guessMapping('checkins', cp.header);
  assert.deepEqual(problems, []);
  const r = planCheckins({ rows: cp.rows, mapping, timezone: TZ, members, existing: [], now: NOW, rowNumbers: cp.rowNumbers });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.skipped, []);
  assert.equal(r.creates.length, cp.rows.length);
  assert.ok(r.creates.length > 100);
});
test('sample checkins.csv has nothing in the future right now, even at UTC-12 (the latest clock anywhere)', () => {
  const mp = parseCsv(readFileSync(join(dir, 'members.csv'), 'utf8'));
  const created = planMembers({ rows: mp.rows, mapping: guessMapping('members', mp.header).mapping, existing: [], coaches }).creates;
  const members = created.map((c, i) => ({ id: i + 1, externalId: c.externalId, phone: c.phone, joinedOn: c.joinedOn }));
  const cp = parseCsv(readFileSync(join(dir, 'checkins.csv'), 'utf8'));
  const { mapping } = guessMapping('checkins', cp.header);
  const r = planCheckins({ rows: cp.rows, mapping, timezone: 'Etc/GMT+12', members, existing: [], now: new Date(), rowNumbers: cp.rowNumbers });
  assert.deepEqual(r.skipped.filter((s) => /future/.test(s.reason)), []);
  assert.equal(r.creates.length, cp.rows.length);
});
