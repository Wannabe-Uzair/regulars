// Ported from legacy/app/server/import/test/mapping.test.mjs: 7 of its 10 (4 synonym loops and the 3 named tests).
// The external_id, last_name and coach_email synonym loops wait for the polish; the table already has their words.
import { expect, test } from 'vitest'
import { guessMapping, missingFields, resolveMapping } from './mapping.ts'

for (const h of ['First Name', 'Given Name', 'first_name']) {
  test(`FR-IMPORT-02 first_name synonym: ${h}`, () => {
    expect(guessMapping('members', [h, 'Join Date']).first_name).toBe(0)
  })
}
for (const h of ['Mobile', 'Cell', 'Phone Number', 'Phone']) {
  test(`FR-IMPORT-02 phone synonym: ${h}`, () => {
    expect(guessMapping('members', [h, 'First Name', 'Join Date']).phone).toBe(0)
  })
}
for (const h of ['Join Date', 'Start Date', 'Member Since', 'Signup Date']) {
  test(`FR-IMPORT-02 joined_on synonym: ${h}`, () => {
    expect(guessMapping('members', ['First Name', h]).joined_on).toBe(1)
  })
}
for (const h of ['Check-in Time', 'Checked In', 'Visit Date', 'Timestamp', 'Date/Time']) {
  test(`FR-IMPORT-02 checked_in_at synonym: ${h}`, () => {
    expect(guessMapping('checkins', ['Member ID', h]).checked_in_at).toBe(1)
  })
}

test('FR-IMPORT-02 Email and Coach Email stay separate', () => {
  const mapping = guessMapping('members', ['Email', 'Coach Email', 'First Name', 'Join Date'])
  expect(mapping.email).toBe(0)
  expect(mapping.coach_email).toBe(1)
  expect(missingFields('members', mapping)).toEqual([])
})

test('FR-IMPORT-02 missing required fields are named', () => {
  const mapping = guessMapping('members', ['Last Name', 'Mobile'])
  expect(missingFields('members', mapping)).toEqual(['name', 'joinedOn'])
  expect(mapping.first_name).toBeNull()
})

test('FR-IMPORT-02 checkins need a time and an id or phone', () => {
  expect(missingFields('checkins', guessMapping('checkins', ['Foo', 'Bar']))).toEqual(['checkinTime', 'match'])
  expect(missingFields('checkins', guessMapping('checkins', ['Mobile', 'Timestamp']))).toEqual([])
})

test('FR-IMPORT-03 a Full name column stands in for the first name', () => {
  const mapping = guessMapping('members', ['Name', 'Member Since'])
  expect(mapping.full_name).toBe(0)
  expect(mapping.first_name).toBeNull()
  expect(missingFields('members', mapping)).toEqual([])
  expect(guessMapping('members', ['Full Name', 'Join Date']).full_name).toBe(0)
})

test('FR-IMPORT-02 the suggestion lists every field of the kind', () => {
  expect(Object.keys(guessMapping('checkins', []))).toEqual(['external_id', 'phone', 'checked_in_at'])
  expect(guessMapping('members', [])).toEqual({
    external_id: null,
    first_name: null,
    full_name: null,
    last_name: null,
    phone: null,
    email: null,
    joined_on: null,
    coach_email: null,
  })
})

test('FR-IMPORT-02 the owner maps by index or header name; unknown fields are ignored; a bad column is refused', () => {
  const header = ['ID', 'Who', 'When']
  expect(resolveMapping('checkins', header, { external_id: 0, checked_in_at: 'When', first_name: 1 })).toEqual({
    external_id: 0,
    phone: null,
    checked_in_at: 2,
  })
  expect(resolveMapping('checkins', header, { phone: '' })).toEqual({
    external_id: null,
    phone: null,
    checked_in_at: null,
  })
  expect(resolveMapping('checkins', header, { phone: 3 })).toBeUndefined()
  expect(resolveMapping('checkins', header, { phone: -1 })).toBeUndefined()
  expect(resolveMapping('checkins', header, { phone: 1.5 })).toBeUndefined()
  expect(resolveMapping('checkins', header, { phone: 'Mobile' })).toBeUndefined()
})
