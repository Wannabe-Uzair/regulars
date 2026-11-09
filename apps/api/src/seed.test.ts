import { LoginResponse, TodayResponse } from '@tenure/contracts'
import { createDb, createRepositories } from '@tenure/db'
import { DEMO_PASSWORD, SEED_TIMEZONE, seedNorthside } from '@tenure/db/seed'
import { DEFAULT_TEMPLATES, detectCountry } from '@tenure/domain'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { createApp } from './app.ts'
import { hashPassword, verifyPassword } from './platform/auth/password.ts'
import { createTestContext, TEST_NOW } from './platform/context.ts'
import { seedCommand } from './seed.ts'
import { call, cookieOf } from './test/http.ts'
import { scratchDir } from './test/scratch.ts'

const dir = scratchDir('seed')

async function run(env: Record<string, string | undefined>) {
  const out: string[] = []
  const err: string[] = []
  const code = await seedCommand(env, { log: (l) => out.push(l), error: (l) => err.push(l) })
  return { code, out, err }
}

async function kioskTokenIn(file: string) {
  const { db, close } = createDb(file)
  try {
    const repos = createRepositories(db)
    const gym = await repos.gyms.findDefault()
    const users = gym ? await repos.users.listByGym(gym.id) : []
    return { gym, users }
  } finally {
    close()
  }
}

describe('seedCommand', () => {
  test('replaces a SQLite database and its -wal and -shm files, re-seeds Northside and prints the old lines', async () => {
    const file = path.join(dir, 'tenure.db')
    // A real SQLite file (the 16-byte header, then nothing else) with stale side files.
    writeFileSync(file, Buffer.concat([Buffer.from('SQLite format 3\0', 'latin1'), Buffer.alloc(84)]))
    writeFileSync(`${file}-wal`, 'junk')
    writeFileSync(`${file}-shm`, 'junk')

    const { code, out, err } = await run({ TENURE_DB: file, TENURE_TZ: 'America/Chicago' })
    expect([code, err]).toEqual([0, []])
    expect(out[0]).toMatch(new RegExp(`^Seeded Northside Strength into ${file}: \\d+ members, \\d+ check-ins, \\d+ nudges\\.$`))
    expect(out[1]).toBe('Time zone: America/Chicago (from TENURE_TZ).')
    expect(out[2]).toBe('Country: US, from the time zone (set TENURE_COUNTRY to use another).')
    expect(out[3]).toBe(`Logins (password for all three): ${DEMO_PASSWORD}`)
    const logins = out.slice(4, 7)
    expect(logins).toHaveLength(3)
    for (const line of logins) expect(line).toMatch(/^ {2}\S+@\S+ +.+ \((owner|coach)\)$/)
    expect(out[7]).toMatch(/^Kiosk: \/kiosk\/[\w-]{43}$/)
    expect(out).toHaveLength(8)

    const { gym, users } = await kioskTokenIn(file)
    expect(gym?.timezone).toBe('America/Chicago')
    expect(gym?.country).toBe('US')
    expect(out[7]).toBe(`Kiosk: /kiosk/${gym?.kioskToken}`)
    expect(users.map((u) => u.email).sort()).toEqual(logins.map((l) => l.trim().split(' ')[0]).sort())
    // Hashed with the API's real hasher, so the printed password logs in.
    expect(await verifyPassword(DEMO_PASSWORD, users[0]?.passwordHash ?? '')).toBe(true)
  })

  test('an empty file is replaced', async () => {
    const file = path.join(dir, 'empty.db')
    writeFileSync(file, '')
    const { code } = await run({ TENURE_DB: file, TENURE_TZ: 'America/Chicago' })
    expect(code).toBe(0)
    expect((await kioskTokenIn(file)).gym).toBeDefined()
  })

  test('a file that is not SQLite is refused with exit 1 and left in place, with its -wal and -shm files', async () => {
    const file = path.join(dir, 'notes.txt')
    writeFileSync(file, 'junk, not a database')
    writeFileSync(`${file}-wal`, 'wal')
    writeFileSync(`${file}-shm`, 'shm')
    const { code, out, err } = await run({ TENURE_DB: file, TENURE_TZ: 'America/Chicago' })
    expect(code).toBe(1)
    expect(out).toEqual([])
    expect(err).toEqual([expect.stringContaining(`${file} is not a Tenure database`)])
    expect(readFileSync(file, 'utf8')).toBe('junk, not a database')
    expect(existsSync(`${file}-wal`) && existsSync(`${file}-shm`)).toBe(true)
  })

  test('re-running it re-creates the database instead of seeding twice', async () => {
    const file = path.join(dir, 'again.db')
    const first = await run({ TENURE_DB: file, TENURE_TZ: 'America/New_York' })
    const second = await run({ TENURE_DB: file, TENURE_TZ: 'America/New_York' })
    expect([first.code, second.code]).toEqual([0, 0])
    expect(second.out.at(-1)).not.toBe(first.out.at(-1))
    expect((await kioskTokenIn(file)).gym?.kioskToken).toBe(second.out.at(-1)?.slice('Kiosk: /kiosk/'.length))
  })

  test("without TENURE_TZ it uses this computer's zone and says so", async () => {
    const file = path.join(dir, 'local.db')
    const { code, out } = await run({ TENURE_DB: file })
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(code).toBe(0)
    expect(out[1]).toBe(`Time zone: ${zone}, this computer's (set TENURE_TZ to use another).`)
    // FR-GLOBAL-05: and this computer's country, when its zone is in one of the five.
    expect((await kioskTokenIn(file)).gym?.country).toBe(detectCountry(zone) ?? 'US')
  })

  test.each([
    ['Asia/Karachi', 'PK', 'Country: PK, from the time zone (set TENURE_COUNTRY to use another).'],
    ['Europe/London', 'GB', 'Country: GB, from the time zone (set TENURE_COUNTRY to use another).'],
    ['America/Toronto', 'CA', 'Country: CA, from the time zone (set TENURE_COUNTRY to use another).'],
    ['Asia/Dubai', 'AE', 'Country: AE, from the time zone (set TENURE_COUNTRY to use another).'],
    ['America/Los_Angeles', 'US', 'Country: US, from the time zone (set TENURE_COUNTRY to use another).'],
    ['Asia/Kolkata', 'US', 'Country: US, since Asia/Kolkata is outside the open markets (set TENURE_COUNTRY to use another).'],
    ['UTC', 'US', 'Country: US, since UTC is outside the open markets (set TENURE_COUNTRY to use another).'],
  ])('FR-GLOBAL-05 seeded in %s, the demo gym is a %s gym, and the seed says why', async (zone, country, line) => {
    const file = path.join(dir, `zone-${zone.replace('/', '-')}.db`)
    const { code, out, err } = await run({ TENURE_DB: file, TENURE_TZ: zone })
    expect([code, err]).toEqual([0, []])
    expect(out[2]).toBe(line)
    expect((await kioskTokenIn(file)).gym).toMatchObject({ timezone: zone, country })
  })

  test('FR-GLOBAL-05 TENURE_COUNTRY overrides the zone, in any case, and the +1 sample numbers stay', async () => {
    const file = path.join(dir, 'country.db')
    const { code, out } = await run({ TENURE_DB: file, TENURE_TZ: 'Asia/Karachi', TENURE_COUNTRY: ' gb ' })
    expect(code).toBe(0)
    expect(out[2]).toBe('Country: GB (from TENURE_COUNTRY).')
    const { db, close } = createDb(file)
    try {
      const repos = createRepositories(db)
      const gym = await repos.gyms.findDefault()
      expect(gym).toMatchObject({ timezone: 'Asia/Karachi', country: 'GB' })
      const members = gym ? await repos.members.listByName(gym.id) : []
      expect(members.length).toBeGreaterThan(0)
      for (const m of members) if (m.phone !== null) expect(m.phone, m.firstName).toMatch(/^\+1\d{10}$/)
    } finally {
      close()
    }
  })

  test.each(['UK', 'IN', 'ZZ', 'Pakistan'])(
    'FR-GLOBAL-05 a TENURE_COUNTRY of %j outside the five exits 1, naming the codes, and leaves the database alone',
    async (given) => {
      const file = path.join(dir, `bad-country-${given}.db`)
      writeFileSync(file, 'keep')
      const { code, out, err } = await run({ TENURE_DB: file, TENURE_TZ: 'Asia/Karachi', TENURE_COUNTRY: given })
      expect(code).toBe(1)
      expect(out).toEqual([])
      expect(err).toEqual([`"${given}" is not one of the open markets. Set TENURE_COUNTRY to one of US, CA, GB, PK, AE (GB for the UK).`])
      expect(readFileSync(file, 'utf8')).toBe('keep')
    },
  )

  test('a bad TENURE_TZ exits 1 with the old message and leaves the database alone', async () => {
    const file = path.join(dir, 'keep.db')
    writeFileSync(file, 'keep')
    const { code, out, err } = await run({ TENURE_DB: file, TENURE_TZ: 'Mars/Olympus' })
    expect(code).toBe(1)
    expect(out).toEqual([])
    expect(err).toEqual(['"Mars/Olympus" is not a time zone name. Set TENURE_TZ to one like America/Chicago.'])
    expect(existsSync(file)).toBe(true)
  })

  test("':memory:' seeds without touching any file", async () => {
    const { code, out } = await run({ TENURE_DB: ':memory:', TENURE_TZ: 'America/Chicago' })
    expect(code).toBe(0)
    expect(out[0]).toMatch(/^Seeded Northside Strength into :memory:/)
  })
})

/** The app over a fresh database holding the Northside demo, seeded for TEST_NOW's day with the real password hasher. */
async function demoApp(country?: string) {
  const { db } = createDb(':memory:')
  await seedNorthside(db, {
    timezone: SEED_TIMEZONE,
    ...(country === undefined ? {} : { country }),
    now: TEST_NOW,
    hashPassword,
    newToken: () => 'kiosk-token-demo',
    templates: DEFAULT_TEMPLATES,
  })
  return createApp(createTestContext({ repos: createRepositories(db) }))
}

const login = (app: Awaited<ReturnType<typeof demoApp>>, email: string, password = DEMO_PASSWORD) =>
  call(app, 'POST', '/api/auth/login', { body: { email, password } })

// Ported from legacy/app/server/test/seed.test.mjs:26.
describe('the demo logins', () => {
  test('FR-STAFF-07 the three demo logins work and see the right scope', async () => {
    const app = await demoApp()
    for (const email of ['mike@northside.test', 'priya@northside.test', 'jordan@northside.test']) {
      const r = await login(app, email)
      expect(r.status, email).toBe(200)
      const today = await call(app, 'GET', '/api/today', { cookie: cookieOf(r.res) })
      expect(today.status, email).toBe(200)
      const { kpis } = TodayResponse.parse(today.body)
      if (email.startsWith('mike')) {
        expect(kpis.newMembers).toBe(60)
        expect(kpis.slipping, `slipping ${kpis.slipping}`).toBeGreaterThanOrEqual(10)
        expect(kpis.slipping, `slipping ${kpis.slipping}`).toBeLessThanOrEqual(14)
      } else {
        expect(kpis.newMembers, email).toBeGreaterThan(10)
        expect(kpis.newMembers, email).toBeLessThan(30)
      }
    }
    expect((await login(app, 'mike@northside.test', 'wrong-password')).status).toBe(401)
  })

  test("FR-GLOBAL-05 a demo login answers the demo gym's country, US unless the seed was given another", async () => {
    for (const [country, expected] of [[undefined, 'US'], ['GB', 'GB']] as const) {
      const r = await login(await demoApp(country), 'mike@northside.test')
      expect(r.status).toBe(200)
      expect(LoginResponse.strict().parse(r.body).gym).toMatchObject({ slug: 'northside', isDemo: true, country: expected })
    }
  })
})
