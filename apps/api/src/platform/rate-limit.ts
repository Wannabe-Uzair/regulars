// Rate limits (docs/ARCHITECTURE.md §5): attempts per key in a sliding window, behind a store interface. The store is
// in memory today; a Redis store can implement the same interface when there is more than one server.
import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import type { Clock } from './context.ts'

/** Where attempts are counted. Each method is async, so a networked store can replace the in-memory one. */
export interface RateLimitStore {
  /**
   * One atomic step: if `key` has fewer than `limit` attempts after `now - windowMs`, record one at `now` and answer
   * true; otherwise record nothing and answer false. Atomic, so parallel requests can't all slip past the limit.
   */
  attempt(key: string, limit: number, windowMs: number, now: number): Promise<boolean>
  /** Forget every attempt for `key`. */
  clear(key: string): Promise<void>
}

/** The in-memory store. Keys whose window has passed are dropped, at most once per window. */
export function createMemoryRateLimitStore() {
  const entries = new Map<string, { times: number[]; windowMs: number }>()
  let swept: number | undefined
  const sweep = (now: number, windowMs: number) => {
    swept ??= now
    if (now - swept < windowMs) return
    swept = now
    for (const [key, e] of entries) if (e.times.every((t) => t <= now - e.windowMs)) entries.delete(key)
  }
  return {
    async attempt(key: string, limit: number, windowMs: number, now: number) {
      sweep(now, windowMs)
      const times = (entries.get(key)?.times ?? []).filter((t) => t > now - windowMs)
      if (times.length >= limit) return false
      entries.set(key, { times: [...times, now], windowMs })
      return true
    },
    async clear(key: string) {
      entries.delete(key)
    },
    /** How many keys are held (for tests). */
    get size() {
      return entries.size
    },
  } satisfies RateLimitStore & { readonly size: number }
}

/** One limit over a store: `limit` attempts per `windowMs` for each key. */
export type RateLimiter = {
  /** Count an attempt. False when the key is over the limit (the attempt is not counted). */
  attempt(key: string): Promise<boolean>
  clear(key: string): Promise<void>
}

const MINUTE = 60 * 1000

/** Today's limits, as the old server had them. */
export const RATE_LIMITS = {
  /** Per device and email. A good login clears the count. */
  login: { limit: 10, windowMs: 10 * MINUTE },
  /** Per device. */
  signup: { limit: 5, windowMs: 10 * MINUTE },
  /** Per device; counts every kiosk request, not only failures. */
  kiosk: { limit: 30, windowMs: MINUTE },
} as const

export type RateLimits = Record<keyof typeof RATE_LIMITS, RateLimiter>

/**
 * The three limits over one store; each prefixes its keys with its name. `factor` multiplies every limit (the
 * config's test-only TENURE_LIMIT_FACTOR); the windows stay.
 */
export function createRateLimits(store: RateLimitStore, clock: Clock, factor = 1): RateLimits {
  const limiter = (name: keyof typeof RATE_LIMITS): RateLimiter => {
    const { windowMs } = RATE_LIMITS[name]
    const limit = RATE_LIMITS[name].limit * factor
    return {
      attempt: (key) => store.attempt(`${name}:${key}`, limit, windowMs, clock().getTime()),
      clear: (key) => store.clear(`${name}:${key}`),
    }
  }
  return { login: limiter('login'), signup: limiter('signup'), kiosk: limiter('kiosk') }
}

/** The device a request comes from: its socket's address, or 'local' when there is no socket (as in tests). */
export function deviceKey(c: Context): string {
  try {
    return getConnInfo(c).remote.address ?? 'local'
  } catch {
    return 'local'
  }
}

/** The login key: the device and the (trimmed, lower-cased) email. */
export const loginKey = (device: string, email: string) => `${device}|${email}`
