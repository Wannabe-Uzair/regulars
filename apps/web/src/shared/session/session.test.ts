import { expect, test } from 'vitest'
import { returnTo } from './session.ts'

test.each([
  ['another site', { from: '//evil.com' }],
  ['a full URL', { from: 'https://evil.com/app' }],
  ['log-in itself', { from: '/login' }],
  ['a path that only starts like /app', { from: '/appx' }],
  ['a non-string', { from: 42 }],
  ['no state', null],
  ['state without from', {}],
])('returnTo refuses %s and falls back to /app', (_name, state) => {
  expect(returnTo(state)).toBe('/app')
})

test.each(['/app', '/app/reports', '/app/reports?week=3#top'])('returnTo keeps the app path %s', (from) => {
  expect(returnTo({ from })).toBe(from)
})
