import { eq, sql } from 'drizzle-orm'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb, type Db } from './client.ts'
import { gyms, invites, members, nudges, templates, users } from './schema/index.ts'

/** The SQLite error code behind a failed query, wherever Drizzle has put it in the cause chain. */
function sqliteCode(run: () => unknown): string | undefined {
  try {
    run()
  } catch (err) {
    for (let e: unknown = err; e instanceof Error; e = e.cause) {
      if ('code' in e && typeof e.code === 'string') return e.code
    }
    throw err
  }
  return undefined
}

const T = '2026-11-06T00:00:00.000Z'
/** The columns a gym, user, member, template or nudge must have beyond the ones a test is about. */
const gymRest = { timezone: 'America/Chicago', pilotStartedOn: '2026-10-14', createdAt: T }
const userRest = { name: 'Test User', passwordHash: 'hash', createdAt: T }
const memberRest = { joinedOn: '2026-10-14', source: 'seed', createdAt: T }

let db: Db
let close: () => void
let gymA: number
let gymB: number

beforeEach(() => {
  ;({ db, close } = createDb(':memory:'))
  gymA = db.insert(gyms).values({ name: 'Northside', slug: 'northside', kioskToken: 'kn', ...gymRest }).returning().get().id
  gymB = db.insert(gyms).values({ name: 'Southside', slug: 'southside', kioskToken: 'ks', ...gymRest }).returning().get().id
})

afterEach(() => close())

describe('createDb', () => {
  test('turns foreign keys on and waits up to 5 s on a busy database', () => {
    expect(db.get(sql`PRAGMA foreign_keys`)).toEqual({ foreign_keys: 1 })
    expect(db.get(sql`PRAGMA busy_timeout`)).toEqual({ timeout: 5000 })
  })

  test('uses WAL for a file and migrates it only once across reopenings', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'tenure-db-'))
    try {
      const file = path.join(dir, 'nested', 'tenure.db')
      const first = createDb(file)
      expect(first.db.get(sql`PRAGMA journal_mode`)).toEqual({ journal_mode: 'wal' })
      first.db.insert(gyms).values({ name: 'Kept', slug: 'kept', kioskToken: 'kk', ...gymRest }).run()
      first.close()
      const second = createDb(file)
      expect(second.db.select({ name: gyms.name }).from(gyms).all()).toEqual([{ name: 'Kept' }])
      second.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test('applies the defaults the old tables had', () => {
    const gym = db.select().from(gyms).where(eq(gyms.id, gymA)).get()
    expect(gym).toMatchObject({ timezone: 'America/Chicago', isDemo: false, plan: 'pilot' })
    const user = db.insert(users).values({ gymId: gymA, email: 'mike@example.com', role: 'owner', ...userRest }).returning().get()
    expect(user.active).toBe(true)
  })
})

function seedNudgeTargets() {
  const userId = db
    .insert(users)
    .values({ gymId: gymA, email: 'coach@example.com', role: 'coach', ...userRest })
    .returning()
    .get().id
  const memberId = db.insert(members).values({ gymId: gymA, firstName: 'Ana', ...memberRest }).returning().get().id
  return { memberId, userId }
}

describe('constraints', () => {
  test('refuses a member whose gym does not exist', () => {
    expect(sqliteCode(() => db.insert(members).values({ gymId: 999, firstName: 'Ghost', ...memberRest }).run())).toBe(
      'SQLITE_CONSTRAINT_FOREIGNKEY',
    )
  })

  test("refuses a user whose role is not 'owner' or 'coach'", () => {
    const insertAdmin = () =>
      db
        .insert(users)
        .values({ gymId: gymA, email: 'root@example.com', role: 'admin' as 'owner', ...userRest })
        .run()
    expect(sqliteCode(insertAdmin)).toBe('SQLITE_CONSTRAINT_CHECK')
    db.insert(users).values({ gymId: gymA, email: 'priya@example.com', role: 'coach', ...userRest }).run()
  })

  test('keeps phone numbers unique within a gym, not across gyms, and allows many members without one', () => {
    const phone = '+13125550142'
    db.insert(members).values({ gymId: gymA, firstName: 'Ana', phone, ...memberRest }).run()
    expect(sqliteCode(() => db.insert(members).values({ gymId: gymA, firstName: 'Ann', phone, ...memberRest }).run())).toBe(
      'SQLITE_CONSTRAINT_UNIQUE',
    )
    db.insert(members).values({ gymId: gymB, firstName: 'Ana', phone, ...memberRest }).run()
    db.insert(members).values([
      { gymId: gymA, firstName: 'Bo', phone: null, ...memberRest },
      { gymId: gymA, firstName: 'Cy', phone: null, ...memberRest },
    ]).run()
    expect(db.select({ id: members.id }).from(members).all()).toHaveLength(4)
  })

  test('keeps external ids unique within a gym', () => {
    db.insert(members).values({ gymId: gymA, firstName: 'Ana', externalId: 'X1', ...memberRest }).run()
    expect(sqliteCode(() => db.insert(members).values({ gymId: gymA, firstName: 'Ann', externalId: 'X1', ...memberRest }).run())).toBe(
      'SQLITE_CONSTRAINT_UNIQUE',
    )
    db.insert(members).values({ gymId: gymB, firstName: 'Ana', externalId: 'X1', ...memberRest }).run()
  })

  test('treats user emails that differ only in case as the same', () => {
    db.insert(users).values({ gymId: gymA, email: 'Mike@Example.com', role: 'owner', ...userRest }).run()
    expect(
      sqliteCode(() => db.insert(users).values({ gymId: gymB, email: 'mike@example.COM', role: 'owner', ...userRest }).run()),
    ).toBe('SQLITE_CONSTRAINT_UNIQUE')
    expect(db.select({ id: users.id }).from(users).where(eq(users.email, 'MIKE@example.com')).all()).toHaveLength(1)
  })

  test('keeps gym slugs and kiosk tokens unique', () => {
    expect(sqliteCode(() => db.insert(gyms).values({ name: 'Dup', slug: 'northside', kioskToken: 'kd', ...gymRest }).run())).toBe('SQLITE_CONSTRAINT_UNIQUE')
    db.insert(gyms).values({ name: 'East', slug: 'east', kioskToken: 'k1', ...gymRest }).run()
    expect(sqliteCode(() => db.insert(gyms).values({ name: 'West', slug: 'west', kioskToken: 'k1', ...gymRest }).run())).toBe(
      'SQLITE_CONSTRAINT_UNIQUE',
    )
  })

  test('deleting a template keeps its nudges with no template', () => {
    const template = db.insert(templates).values({ gymId: gymA, name: 'Missed you', body: 'Hi', sort: 1, updatedAt: T }).returning().get()
    const { memberId, userId } = seedNudgeTargets()
    const nudge = db
      .insert(nudges)
      .values({ gymId: gymA, memberId, userId, templateId: template.id, body: 'Hi Ana', sentAt: T })
      .returning()
      .get()
    db.delete(templates).where(eq(templates.id, template.id)).run()
    expect(db.select().from(nudges).where(eq(nudges.id, nudge.id)).get()).toMatchObject({
      templateId: null,
      body: 'Hi Ana',
      channel: 'own-phone',
    })
  })

  test('refuses a member with no gym', () => {
    const insert = () => db.insert(members).values({ firstName: 'Orphan', ...memberRest } as never).run()
    expect(sqliteCode(insert)).toBe('SQLITE_CONSTRAINT_NOTNULL')
  })

  test('refuses a user with a NULL role', () => {
    const insert = () =>
      db.insert(users).values({ gymId: gymA, email: 'nobody@example.com', role: null as never, ...userRest }).run()
    expect(sqliteCode(insert)).toBe('SQLITE_CONSTRAINT_NOTNULL')
  })

  test('refuses a nudge whose member or user does not exist', () => {
    const { memberId, userId } = seedNudgeTargets()
    const base = { gymId: gymA, body: 'Hi', sentAt: T }
    expect(sqliteCode(() => db.insert(nudges).values({ ...base, memberId: 999, userId }).run())).toBe(
      'SQLITE_CONSTRAINT_FOREIGNKEY',
    )
    expect(sqliteCode(() => db.insert(nudges).values({ ...base, memberId, userId: 999 }).run())).toBe(
      'SQLITE_CONSTRAINT_FOREIGNKEY',
    )
  })

  test('refuses an invite from a user who does not exist, or for a role that does not exist', () => {
    const { userId } = seedNudgeTargets()
    const base = { tokenHash: 't1', gymId: gymA, name: 'Sam', createdBy: userId, createdAt: T }
    db.insert(invites).values(base).run()
    expect(sqliteCode(() => db.insert(invites).values({ ...base, tokenHash: 't2', createdBy: 999 }).run())).toBe(
      'SQLITE_CONSTRAINT_FOREIGNKEY',
    )
    expect(
      sqliteCode(() => db.insert(invites).values({ ...base, tokenHash: 't3', role: 'admin' as 'owner' }).run()),
    ).toBe('SQLITE_CONSTRAINT_CHECK')
  })

  test('deleting a member deletes their nudges', () => {
    const { memberId, userId } = seedNudgeTargets()
    db.insert(nudges).values({ gymId: gymA, memberId, userId, body: 'Hi', sentAt: T }).run()
    db.delete(members).where(eq(members.id, memberId)).run()
    expect(db.select().from(nudges).all()).toEqual([])
  })
})
