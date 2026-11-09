// The one dependency bag every module receives.
import { createDb, createRepositories, type Repositories } from '@tenure/db'
import { createDevAdapters, type Adapters } from '../adapters/index.ts'
import { loadConfig, type Config } from './config.ts'
import { createEventBus, type EventBus } from './events.ts'
import { createMemoryRateLimitStore, createRateLimits, type RateLimits } from './rate-limit.ts'
import { createStopSignal, type StopSignal } from './shutdown.ts'

export type Clock = () => Date

export type AppContext = {
  config: Config
  clock: Clock
  repos: Repositories
  rateLimits: RateLimits
  bus: EventBus
  adapters: Adapters
  /** Fires when the server starts stopping: the live stream ends on it. */
  shutdown: StopSignal
  /**
   * This computer's LAN addresses, for the kiosk, phone and invite links in stall mode; empty unless the server
   * listens on every address. Read on each call, so a hotspot turned on after the start shows up.
   */
  lan: () => readonly string[]
}

/** The tests' fixed instant: noon in Chicago, the same date in every US time zone. */
export const TEST_NOW = new Date('2026-11-06T18:00:00.000Z')

/** The tests' fixed LAN address (a laptop's hotspot). */
export const TEST_LAN_IP = '192.168.137.1'

/**
 * A context over a fresh in-memory database with the clock fixed at TEST_NOW, fresh in-memory rate limits on the
 * context's clock (an overridden clock included), a fresh bus, silent dev adapters, a stop signal of its own and the
 * one LAN address TEST_LAN_IP.
 */
export function createTestContext(overrides: Partial<AppContext> = {}): AppContext {
  const { db } = createDb(':memory:')
  const clock = overrides.clock ?? (() => new Date(TEST_NOW))
  return {
    config: loadConfig({ TENURE_DB: ':memory:' }),
    clock,
    repos: createRepositories(db),
    rateLimits: createRateLimits(createMemoryRateLimitStore(), clock),
    bus: createEventBus(),
    adapters: createDevAdapters(() => {}),
    shutdown: createStopSignal(),
    lan: () => [TEST_LAN_IP],
    ...overrides,
  }
}
