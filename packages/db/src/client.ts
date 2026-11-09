import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import * as schema from './schema/index.ts'

const migrationsFolder = path.join(import.meta.dirname, '..', 'migrations')

export type Db = BetterSQLite3Database<typeof schema>

/** Open the database at `file` (a path or ':memory:'), set its pragmas and bring it up to the latest migration. */
export function createDb(file: string): { db: Db; close: () => void } {
  const inMemory = file === ':memory:'
  if (!inMemory) mkdirSync(path.dirname(file), { recursive: true })
  const sqlite = new Database(file)
  try {
    if (!inMemory) sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')
    const db = drizzle({ client: sqlite, schema })
    migrate(db, { migrationsFolder })
    return { db, close: () => sqlite.close() }
  } catch (err) {
    sqlite.close()
    throw err
  }
}
