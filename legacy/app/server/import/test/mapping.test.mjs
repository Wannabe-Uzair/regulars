import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessMapping } from '../mapping.mjs';

const one = (kind, field, name) => {
  const others = kind === 'members' ? ['First Name', 'Join Date'] : ['Member ID'];
  const r = guessMapping(kind, [name, ...others]);
  return r.mapping[field];
};

for (const h of ['Member ID', 'ID', 'Barcode', 'Client ID', 'member_id', 'MEMBER-ID'])
  test(`external_id synonym: ${h}`, () => assert.equal(one('members', 'external_id', h), 0));
for (const h of ['First Name', 'Given Name', 'first_name'])
  test(`first_name synonym: ${h}`, () => assert.equal(guessMapping('members', [h, 'Join Date']).mapping.first_name, 0));
for (const h of ['Last Name', 'Surname', 'LAST-NAME'])
  test(`last_name synonym: ${h}`, () => assert.equal(one('members', 'last_name', h), 0));
for (const h of ['Mobile', 'Cell', 'Phone Number', 'Phone'])
  test(`phone synonym: ${h}`, () => assert.equal(one('members', 'phone', h), 0));
for (const h of ['Join Date', 'Start Date', 'Member Since', 'Signup Date'])
  test(`joined_on synonym: ${h}`, () => assert.equal(guessMapping('members', ['First Name', h]).mapping.joined_on, 1));
for (const h of ['Coach', 'Coach Email', 'Trainer Email'])
  test(`coach_email synonym: ${h}`, () => assert.equal(one('members', 'coach_email', h), 0));
for (const h of ['Check-in Time', 'Checked In', 'Visit Date', 'Timestamp', 'Date/Time'])
  test(`checked_in_at synonym: ${h}`, () => assert.equal(guessMapping('checkins', ['Member ID', h]).mapping.checked_in_at, 1));

test('Email and Coach Email stay separate', () => {
  const r = guessMapping('members', ['Email', 'Coach Email', 'First Name', 'Join Date']);
  assert.equal(r.mapping.email, 0);
  assert.equal(r.mapping.coach_email, 1);
  assert.deepEqual(r.problems, []);
});
test('missing required fields produce user-facing problems', () => {
  const r = guessMapping('members', ['Last Name', 'Mobile']);
  assert.equal(r.problems.length, 2);
  assert.match(r.problems[0], /first name/);
  assert.match(r.problems[1], /join date/);
  assert.equal(r.mapping.first_name, null);
});
test('checkins need a time and an id or phone', () => {
  assert.equal(guessMapping('checkins', ['Foo', 'Bar']).problems.length, 2);
  assert.equal(guessMapping('checkins', ['Mobile', 'Timestamp']).problems.length, 0);
});
