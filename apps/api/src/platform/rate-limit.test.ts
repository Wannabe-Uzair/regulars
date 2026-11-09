import { describe, expect, test } from 'vitest'
import { createTestContext, TEST_NOW } from './context.ts'
import { createMemoryRateLimitStore, createRateLimits, deviceKey, loginKey, RATE_LIMITS } from './rate-limit.ts'

describe('the in-memory store', () => {
  test('allows `limit` attempts per window and records nothing while blocked', async () => {
    const store = createMemoryRateLimitStore()
    const t = 1_000_000
    expect(await store.attempt('a', 2, 1000, t)).toBe(true)
    expect(await store.attempt('a', 2, 1000, t + 10)).toBe(true)
    expect(await store.attempt('a', 2, 1000, t + 500)).toBe(false)
    // The first attempt leaves the window; the blocked one was never counted, so one more is allowed.
    expect(await store.attempt('a', 2, 1000, t + 1000)).toBe(true)
    expect(await store.attempt('a', 2, 1000, t + 1001)).toBe(false)
    expect(await store.attempt('b', 2, 1000, t + 1001)).toBe(true)
  })

  test('clear forgets a key', async () => {
    const store = createMemoryRateLimitStore()
    await store.attempt('a', 1, 1000, 0)
    expect(await store.attempt('a', 1, 1000, 1)).toBe(false)
    await store.clear('a')
    expect(await store.attempt('a', 1, 1000, 2)).toBe(true)
  })

  test('fix 5: the limiter drops keys whose window has passed', async () => {
    let t = Date.parse('2026-11-06T18:00:00Z')
    const store = createMemoryRateLimitStore()
    await store.attempt('a', 2, 1000, t)
    await store.attempt('b', 2, 1000, t)
    expect(store.size).toBe(2)
    t += 1001
    await store.attempt('c', 2, 1000, t)
    expect(store.size).toBe(1)
    expect(await store.attempt('a', 2, 1000, t)).toBe(true)
  })

  test('a sweep drops each key by its own window', async () => {
    const store = createMemoryRateLimitStore()
    await store.attempt('long', 1, 10_000, 0)
    await store.attempt('short', 1, 1000, 0)
    await store.attempt('short', 1, 1000, 1500) // sweeps at 1500: 'long' is still inside its window
    expect(store.size).toBe(2)
    await store.attempt('other', 1, 1000, 10_001)
    expect(store.size).toBe(1)
  })
})

describe('createRateLimits', () => {
  test("today's limits: login 10 and sign-up 5 per 10 minutes, kiosk 30 per minute", () => {
    expect(RATE_LIMITS).toEqual({
      login: { limit: 10, windowMs: 600_000 },
      signup: { limit: 5, windowMs: 600_000 },
      kiosk: { limit: 30, windowMs: 60_000 },
    })
  })

  test('each limit counts on its own, on the clock, and the window passes', async () => {
    let now = TEST_NOW.getTime()
    const limits = createRateLimits(createMemoryRateLimitStore(), () => new Date(now))
    for (let i = 0; i < 5; i++) expect(await limits.signup.attempt('ip')).toBe(true)
    expect(await limits.signup.attempt('ip')).toBe(false)
    expect(await limits.login.attempt('ip')).toBe(true)
    for (let i = 0; i < 30; i++) expect(await limits.kiosk.attempt('ip')).toBe(true)
    expect(await limits.kiosk.attempt('ip')).toBe(false)
    now += 60_001
    expect(await limits.kiosk.attempt('ip')).toBe(true)
    expect(await limits.signup.attempt('ip')).toBe(false)
    now += 540_000
    expect(await limits.signup.attempt('ip')).toBe(true)
  })

  test('NFR-SEC-03 a limit factor (the e2e servers\') multiplies every limit and keeps the windows', async () => {
    let now = TEST_NOW.getTime()
    const limits = createRateLimits(createMemoryRateLimitStore(), () => new Date(now), 3)
    for (let i = 0; i < 15; i++) expect(await limits.signup.attempt('ip')).toBe(true)
    expect(await limits.signup.attempt('ip')).toBe(false)
    for (let i = 0; i < 90; i++) expect(await limits.kiosk.attempt('ip')).toBe(true)
    expect(await limits.kiosk.attempt('ip')).toBe(false)
    for (let i = 0; i < 30; i++) expect(await limits.login.attempt('ip')).toBe(true)
    expect(await limits.login.attempt('ip')).toBe(false)
    now += 60_001
    expect(await limits.kiosk.attempt('ip')).toBe(true)
    expect(await limits.signup.attempt('ip')).toBe(false)
  })

  test('createTestContext has fresh limits on its own clock', async () => {
    let now = TEST_NOW.getTime()
    const ctx = createTestContext({ clock: () => new Date(now) })
    for (let i = 0; i < 5; i++) await ctx.rateLimits.signup.attempt('ip')
    expect(await ctx.rateLimits.signup.attempt('ip')).toBe(false)
    now += 600_001
    expect(await ctx.rateLimits.signup.attempt('ip')).toBe(true)
    expect(await createTestContext().rateLimits.signup.attempt('ip')).toBe(true)
  })
})

describe('keys', () => {
  test("a request without a socket is the device 'local'; a login key is device|email", () => {
    expect(deviceKey({ env: undefined } as never)).toBe('local')
    const socket = { env: { incoming: { socket: { remoteAddress: '192.168.137.20' } } } }
    expect(deviceKey(socket as never)).toBe('192.168.137.20')
    expect(loginKey('local', 'mike@northside.test')).toBe('local|mike@northside.test')
  })
})
