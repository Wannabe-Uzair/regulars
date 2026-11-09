// The SQLite statements behind the backup and restore commands (apps/api/src/ops). They work on database files, not on
// the app's data, so they use the driver directly: createDb would migrate a file that is only being checked or copied.
import Database from 'better-sqlite3'
import { rmSync } from 'node:fs'

/** How long a backup waits for the server's write lock to clear, as the server itself does (busy_timeout). */
const WAIT_MS = 5000

const SQLITE_CORRUPT = /^SQLITE_(CORRUPT|NOTADB)/

/**
 * Copy the database at `from` into the new file `to` with VACUUM INTO: a consistent snapshot, even while it's written.
 * `readonly` opens `from` so that nothing can change it (a backup about to be restored). When the copy fails (a damaged
 * database, a full disk) it throws, and `to` is removed rather than left part-written.
 */
export function vacuumInto(from: string, to: string, { readonly = false } = {}): void {
  const db = new Database(from, { fileMustExist: true, timeout: WAIT_MS, readonly })
  try {
    db.prepare('VACUUM INTO ?').run(to)
  } catch (err) {
    rmSync(to, { force: true })
    throw err
  } finally {
    db.close()
  }
}

/**
 * Take the database at `file` for this process alone, or answer null when another connection has it open: the server
 * keeps a connection open, with a lock on the file, for as long as it runs, and the lock goes with its process even
 * when it's killed. A connection in EXCLUSIVE locking mode keeps its lock until `release`, so no server starts on the
 * file meanwhile, and the lock stays with the file when it's renamed.
 *
 * A file too damaged to lock (not a database, or its first page corrupt) can't be open in a server either: it is
 * handed back unlocked.
 */
export function takeExclusive(file: string): { release(): void } | null {
  const db = new Database(file, { fileMustExist: true, timeout: 0 })
  try {
    db.pragma('locking_mode = EXCLUSIVE')
    db.exec('BEGIN EXCLUSIVE')
    db.exec('ROLLBACK')
  } catch (err) {
    db.close()
    const code = (err as { code?: string }).code ?? ''
    if (code === 'SQLITE_BUSY') return null
    if (SQLITE_CORRUPT.test(code)) return { release: () => {} }
    throw err
  }
  return { release: () => db.close() }
}

export type Inspection =
  | { kind: 'tenure'; counts: Record<string, number> }
  | { kind: 'notSqlite' }
  | { kind: 'damaged'; problems: string[] }
  | { kind: 'notTenure' }

/** Every Tenure database has the migrations' table and the gyms table, whatever migration it is at. */
const TENURE_TABLES = ['__drizzle_migrations', 'gyms']

/** Open `file` read-only and say what it is: a Tenure database (with its row counts), or why it can't be restored. */
export function inspect(file: string): Inspection {
  let db: Database.Database
  try {
    db = new Database(file, { readonly: true, fileMustExist: true })
  } catch (err) {
    if ((err as { code?: string }).code === 'SQLITE_NOTADB') return { kind: 'notSqlite' }
    throw err
  }
  try {
    const result = db.pragma('integrity_check') as { integrity_check: string }[]
    const problems = result.map((r) => r.integrity_check).filter((line) => line !== 'ok')
    if (problems.length > 0) return { kind: 'damaged', problems }
    const tables = new Set(tableNames(db))
    if (!TENURE_TABLES.every((t) => tables.has(t))) return { kind: 'notTenure' }
    return { kind: 'tenure', counts: countRows(db) }
  } catch (err) {
    const code = (err as { code?: string }).code ?? ''
    if (code === 'SQLITE_NOTADB') return { kind: 'notSqlite' }
    if (SQLITE_CORRUPT.test(code)) return { kind: 'damaged', problems: [(err as Error).message] }
    throw err
  } finally {
    db.close()
  }
}

/**
 * The number of rows in each table of the database at `file`. It only reads, but not on a read-only connection: one
 * of those leaves a WAL database's log files behind when it closes.
 */
export function tableCounts(file: string): Record<string, number> {
  const db = new Database(file, { fileMustExist: true, timeout: WAIT_MS })
  try {
    return countRows(db)
  } finally {
    db.close()
  }
}

function tableNames(db: Database.Database): string[] {
  const rows = db
    .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name")
    .all() as { name: string }[]
  return rows.map((r) => r.name)
}

function countRows(db: Database.Database): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const name of tableNames(db)) {
    // A table name can't be a parameter; this one comes from sqlite_schema, quoted as an identifier.
    const row = db.prepare(`SELECT count(*) AS n FROM "${name.replaceAll('"', '""')}"`).get() as { n: number }
    counts[name] = row.n
  }
  return counts
}
