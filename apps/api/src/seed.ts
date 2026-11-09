// `npm run seed`: delete the database at TENURE_DB (default apps/api/data/tenure.db) and re-seed the Northside demo gym,
// in the zone of TENURE_TZ or this computer, and the country of TENURE_COUNTRY or that zone.
// `npm run demo:reset` (`--reset`): put the demo gym back as seeded, in place, keeping its kiosk link (FR-OPS-03).
import { createDb } from '@tenure/db'
import { DEMO_PASSWORD, resetNorthside, SEED_TIMEZONE, seedNorthside, type SeededNorthside } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES, detectCountry, isOpenMarket, isValidTimeZone, OPEN_MARKETS, type OpenMarket } from '@tenure/domain'
import { closeSync, existsSync, openSync, readSync, rmSync } from 'node:fs'
import { hashPassword } from './platform/auth/password.ts'
import { newToken } from './platform/auth/token.ts'
import { DEFAULT_DB_FILE } from './platform/config.ts'

const SQLITE_HEADER = 'SQLite format 3\0'

/** True when `file` is missing, empty, or starts with the 16-byte SQLite header: the only files the seed may replace. */
function isReplaceable(file: string): boolean {
  let fd: number
  try {
    fd = openSync(file, 'r')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return true
    throw err
  }
  try {
    const head = Buffer.alloc(SQLITE_HEADER.length)
    const n = readSync(fd, head, 0, head.length, 0)
    return n === 0 || (n === head.length && head.toString('latin1') === SQLITE_HEADER)
  } finally {
    closeSync(fd)
  }
}

/**
 * The demo gym's country (FR-GLOBAL-05): TENURE_COUNTRY when set (an open market's code, in any case), otherwise the
 * country of the seed's zone when it is one of the open markets, otherwise the US. The sample members' +1 numbers stay
 * whichever it is. `line` says where it came from; `error` names the codes when TENURE_COUNTRY is not one of them.
 */
export function demoCountry(
  env: Record<string, string | undefined>,
  timezone: string,
): { country: OpenMarket; line: string } | { error: string } {
  const given = env.TENURE_COUNTRY?.trim()
  if (given) {
    const code = given.toUpperCase()
    if (!isOpenMarket(code)) {
      return { error: `"${given}" is not one of the open markets. Set TENURE_COUNTRY to one of ${OPEN_MARKETS.join(', ')} (GB for the UK).` }
    }
    return { country: code, line: `Country: ${code} (from TENURE_COUNTRY).` }
  }
  const detected = detectCountry(timezone)
  if (detected) return { country: detected, line: `Country: ${detected}, from the time zone (set TENURE_COUNTRY to use another).` }
  return { country: 'US', line: `Country: US, since ${timezone} is outside the open markets (set TENURE_COUNTRY to use another).` }
}

/** Where the demo gym is: its zone and country, and the lines that say where each came from. */
export type DemoPlace = { timezone: string; country: OpenMarket; lines: [string, string] }

/**
 * The demo gym's zone and country, for the seed and the demo reset alike. The demo gym runs on this computer's clock,
 * so "today" and every check-in time match the room at the stall; TENURE_TZ overrides it with any IANA zone name (for
 * example America/Chicago), and TENURE_COUNTRY the country (see demoCountry). `error` for a bad value of either.
 */
export function demoPlace(env: Record<string, string | undefined>): DemoPlace | { error: string } {
  const timezone = env.TENURE_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || SEED_TIMEZONE
  if (!isValidTimeZone(timezone)) return { error: `"${timezone}" is not a time zone name. Set TENURE_TZ to one like America/Chicago.` }
  const demo = demoCountry(env, timezone)
  if ('error' in demo) return demo
  const zoneLine = env.TENURE_TZ
    ? `Time zone: ${timezone} (from TENURE_TZ).`
    : `Time zone: ${timezone}, this computer's (set TENURE_TZ to use another).`
  return { timezone, country: demo.country, lines: [zoneLine, demo.line] }
}

/**
 * The demo reset on the database at `file`, through a connection of its own (WAL lets it run beside a server that has
 * the same file open): resetNorthside for today, in `place`. Undefined when the database holds no demo gym.
 */
export async function resetDemo(file: string, place: Pick<DemoPlace, 'timezone' | 'country'>, now = new Date()): Promise<SeededNorthside | undefined> {
  const { db, close } = createDb(file)
  try {
    return await resetNorthside(db, { ...place, now, hashPassword, templates: DEFAULT_TEMPLATES })
  } finally {
    close()
  }
}

type Io = { log: (line: string) => void; error?: (line: string) => void }

/**
 * Run the seed command against `env`. Resolves to the exit code: 0, or 1 for a bad TENURE_TZ or TENURE_COUNTRY or a
 * TENURE_DB that is not a SQLite file.
 */
export async function seedCommand(env: Record<string, string | undefined>, { log, error = log }: Io): Promise<number> {
  const file = env.TENURE_DB || DEFAULT_DB_FILE
  const place = demoPlace(env)
  if ('error' in place) {
    error(place.error)
    return 1
  }
  const { timezone, country } = place
  if (file !== ':memory:') {
    if (!isReplaceable(file)) {
      error(`${file} is not a Tenure database (it is not a SQLite file), so the seed will not delete it. Point TENURE_DB at a database file, or move that file away.`)
      return 1
    }
    for (const f of [file, `${file}-wal`, `${file}-shm`]) rmSync(f, { force: true })
  }
  const { db, close } = createDb(file)
  let seeded
  try {
    seeded = await seedNorthside(db, { timezone, country, hashPassword, newToken, templates: DEFAULT_TEMPLATES })
  } finally {
    close()
  }
  const { kioskToken, users, data } = seeded
  log(
    `Seeded ${data.gym.name} into ${file}: ${data.members.length} members, ${data.checkins.length} check-ins, ${data.nudges.length} nudges.`,
  )
  for (const line of place.lines) log(line)
  log(`Logins (password for all three): ${DEMO_PASSWORD}`)
  for (const u of users) log(`  ${u.email.padEnd(24)} ${u.name} (${u.role})`)
  log(`Kiosk: /kiosk/${kioskToken}`)
  return 0
}

/**
 * Run `npm run demo:reset` against `env`: the demo reset on TENURE_DB, with the server running or not. Resolves to the
 * exit code: 0, or 1 for a bad TENURE_TZ or TENURE_COUNTRY, a TENURE_DB that is missing or not a SQLite file, or a
 * database without the demo gym. The demo is laid out for `now`'s day.
 */
export async function demoResetCommand(
  env: Record<string, string | undefined>,
  { log, error = log }: Io,
  now = new Date(),
): Promise<number> {
  const file = env.TENURE_DB || DEFAULT_DB_FILE
  const place = demoPlace(env)
  if ('error' in place) {
    error(place.error)
    return 1
  }
  if (!existsSync(file) || !isReplaceable(file)) {
    error(`${file} is not a Tenure database, so there is no demo to reset. Run npm run seed first, or point TENURE_DB at the database.`)
    return 1
  }
  const reset = await resetDemo(file, place, now)
  if (!reset) {
    error(`${file} has no demo gym to reset. Run npm run seed to make one (it replaces the whole database).`)
    return 1
  }
  const { kioskToken, data } = reset
  log(`Reset ${data.gym.name} in ${file}: ${data.members.length} members, ${data.checkins.length} check-ins, ${data.nudges.length} nudges.`)
  for (const line of place.lines) log(line)
  log('Every demo device is signed out: each one taps "Try the demo" again.')
  log(`Kiosk (kept): /kiosk/${kioskToken}`)
  return 0
}

if (import.meta.main) {
  const io = { log: console.log, error: console.error }
  process.exitCode = await (process.argv.includes('--reset') ? demoResetCommand(process.env, io) : seedCommand(process.env, io))
}
