import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneE164, parseDate, parseLocalDateTime, cleanName, cleanEmail, localDate } from '../normalize.mjs';

test('phone formats', () => {
  for (const s of ['(312) 555-0142', '312.555.0142', '1-312-555-0142', '+13125550142', '3125550142', '13125550142', ' 312 555 0142 ', '+1 312-555-0142'])
    assert.equal(phoneE164(s), '+13125550142', s);
});
test('invalid phones are null', () => {
  for (const s of ['', null, undefined, '555-0142', '312555014', '312555014255', '+443125550142', '0125550142', '(312) 155-0142', '23125550142', 'abc'])
    assert.equal(phoneE164(s), null, String(s));
});
test('parseDate formats', () => {
  assert.equal(parseDate('2026-09-13'), '2026-09-13');
  assert.equal(parseDate('09/13/2026'), '2026-09-13');
  assert.equal(parseDate('9/3/26'), '2026-09-03');
  assert.equal(parseDate('2026-09-13T10:00:00Z'), '2026-09-13');
  assert.equal(parseDate('2026-09-13 10:00'), '2026-09-13');
});
test('parseDate rejects invalid', () => {
  for (const s of ['', null, '13/40/2026', '2026-02-30', 'yesterday', '2/29/2027']) assert.equal(parseDate(s), null, String(s));
  assert.equal(parseDate('2/29/2028'), '2028-02-29');
});
test('local datetime, standard and daylight time', () => {
  assert.equal(parseLocalDateTime('2026-01-15 18:00', 'America/Chicago'), '2026-01-16T00:00:00.000Z');
  assert.equal(parseLocalDateTime('2026-07-15 18:00', 'America/Chicago'), '2026-07-15T23:00:00.000Z');
});
test('M/D/YYYY h:mm AM/PM', () => {
  assert.equal(parseLocalDateTime('7/15/2026 6:00 PM', 'America/Chicago'), '2026-07-15T23:00:00.000Z');
  assert.equal(parseLocalDateTime('7/15/2026 12:05 AM', 'America/Chicago'), '2026-07-15T05:05:00.000Z');
  assert.equal(parseLocalDateTime('7/15/2026 12:05 PM', 'America/Chicago'), '2026-07-15T17:05:00.000Z');
});
test('ISO with offset ignores the gym timezone', () => {
  assert.equal(parseLocalDateTime('2026-07-15T18:00:00-04:00', 'America/Chicago'), '2026-07-15T22:00:00.000Z');
  assert.equal(parseLocalDateTime('2026-07-15T18:00:00Z', 'America/Chicago'), '2026-07-15T18:00:00.000Z');
});
test('DST fall back: ambiguous 01:30 takes the first (CDT) occurrence', () => {
  assert.equal(parseLocalDateTime('2026-11-01 01:30', 'America/Chicago'), '2026-11-01T06:30:00.000Z');
  assert.equal(parseLocalDateTime('2026-11-01 00:59', 'America/Chicago'), '2026-11-01T05:59:00.000Z');
  assert.equal(parseLocalDateTime('2026-11-01 02:00', 'America/Chicago'), '2026-11-01T08:00:00.000Z'); // CST
});
test('DST spring forward: offsets either side of the change', () => {
  assert.equal(parseLocalDateTime('2026-03-08 01:30', 'America/Chicago'), '2026-03-08T07:30:00.000Z'); // CST
  assert.equal(parseLocalDateTime('2026-03-08 03:30', 'America/Chicago'), '2026-03-08T08:30:00.000Z'); // CDT
});
test('local datetime invalid inputs', () => {
  for (const s of ['', null, 'soon', '2026-13-01 10:00', '2026-01-01 25:00', '7/15/2026 13:00 PM'])
    assert.equal(parseLocalDateTime(s, 'America/Chicago'), null, String(s));
});
test('localDate converts to gym-local day', () => {
  assert.equal(localDate('2026-07-16T03:00:00.000Z', 'America/Chicago'), '2026-07-15');
});
test('cleanName / cleanEmail', () => {
  assert.equal(cleanName('  Maria   Lopez '), 'Maria Lopez');
  assert.equal(cleanName('  '), null);
  assert.equal(cleanEmail(' Maria@Example.COM '), 'maria@example.com');
  for (const s of ['nope', 'a@b', 'a b@c.com', '', null]) assert.equal(cleanEmail(s), null, String(s));
});
