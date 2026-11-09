// One stall-mode server per browser engine, each on its own port with its own seeded database, so a flow that writes
// in Chrome never changes what WebKit sees.
import path from 'node:path'
import { DATA_DIR } from './paths.ts'

export const BROWSERS = ['chrome', 'webkit'] as const
export type Browser = (typeof BROWSERS)[number]

/** The first server's port; the next browser gets the next one. E2E_BASE_PORT moves them all (default 5191). */
const basePort = Number(process.env.E2E_BASE_PORT || 5191)

export function portOf(browser: Browser): number {
  return basePort + BROWSERS.indexOf(browser)
}

export function baseURLOf(browser: Browser): string {
  return `http://127.0.0.1:${portOf(browser)}`
}

/** apps/e2e/.data/<browser>.db */
export function dbFileOf(browser: Browser): string {
  return path.join(DATA_DIR, `${browser}.db`)
}

/** The demo gym's zone, so "today" and the seeded weeks are the same on every machine. */
export const E2E_TZ = 'America/Chicago'
