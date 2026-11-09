import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createDb } from './client.ts'
import { createRepositories } from './repositories/index.ts'

const migrationsFolder = path.join(import.meta.dirname, '..', 'migrations')
const journalFile = (folder: string) => path.join(folder, 'meta', '_journal.json')
const journal = JSON.parse(readFileSync(journalFile(migrationsFolder), 'utf8')) as { entries: { tag: string }[] }
const tags = journal.entries.map((e) => e.tag)

let dir: string
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'tenure-migrations-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

/** A database file brought up to migration `upTo` (inclusive) and no further, from a copy of the migrations folder. */
function databaseAt(upTo: number): string {
  const folder = path.join(dir, 'migrations')
  cpSync(migrationsFolder, folder, { recursive: true })
  writeFileSync(journalFile(folder), JSON.stringify({ ...journal, entries: journal.entries.slice(0, upTo + 1) }))
  const file = path.join(dir, 'tenure.db')
  const sqlite = new Database(file)
  try {
    sqlite.pragma('foreign_keys = ON')
    migrate(drizzle({ client: sqlite }), { migrationsFolder: folder })
    // The rows a gym from before the country had, written as the 0000 tables take them.
    sqlite
      .prepare(
        `INSERT INTO gyms (id, name, slug, timezone, is_demo, pilot_started_on, plan, kiosk_token, created_at)
         VALUES (1, 'Northside', 'northside', 'America/Chicago', 0, '2026-10-14', 'pilot', 'kn', '2026-10-14T00:00:00.000Z')`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO members (id, gym_id, first_name, last_name, phone, joined_on, source, created_at)
         VALUES (1, 1, 'Ana', 'B.', '+13125550101', '2026-10-20', 'kiosk', '2026-10-20T00:00:00.000Z')`,
      )
      .run()
    const applied = sqlite.prepare('SELECT COUNT(*) AS n FROM __drizzle_migrations').get() as { n: number }
    expect(applied.n).toBe(upTo + 1)
  } finally {
    sqlite.close()
  }
  return file
}

/** Open the file the way the server does, which runs every migration still to run, and read it back. */
async function reopen(file: string) {
  const { db, close } = createDb(file)
  try {
    const repos = createRepositories(db)
    return { gym: await repos.gyms.findById(1), members: await repos.members.listByGym(1) }
  } finally {
    close()
  }
}

describe('migrations', () => {
  test('FR-OPS-04 a database at 0000 upgrades on start: its gym gets the US and its members no archived date', async () => {
    expect(tags.length).toBeGreaterThanOrEqual(3)
    const { gym, members } = await reopen(databaseAt(0))
    expect(gym).toMatchObject({ id: 1, name: 'Northside', timezone: 'America/Chicago', country: 'US' })
    expect(members).toEqual([expect.objectContaining({ id: 1, firstName: 'Ana', phone: '+13125550101', archivedAt: null })])
  })

  test.each(tags.slice(0, -1).map((tag, i) => [tag, i] as const))(
    'NFR-REL-02 a database at %s upgrades to the latest migration and keeps its rows',
    async (_tag, i) => {
      const file = databaseAt(i)
      const { gym, members } = await reopen(file)
      expect(gym?.slug).toBe('northside')
      expect(members.map((m) => m.firstName)).toEqual(['Ana'])
      const sqlite = new Database(file, { readonly: true })
      try {
        expect(sqlite.prepare('SELECT COUNT(*) AS n FROM __drizzle_migrations').get()).toEqual({ n: tags.length })
      } finally {
        sqlite.close()
      }
    },
  )
})
