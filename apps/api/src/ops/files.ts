// Where backups go and what they're called.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { DEFAULT_DB_FILE } from '../platform/config.ts'

export type Env = Record<string, string | undefined>

export type Io = { log: (line: string) => void; error?: (line: string) => void }

/** The database the server opens: TENURE_DB, or apps/api/data/tenure.db. */
export const dbFileOf = (env: Env): string => env.TENURE_DB || DEFAULT_DB_FILE

/** TENURE_BACKUP_DIR, or a backups folder beside the database (apps/api/data/backups by default). */
export const backupDirOf = (env: Env, dbFile: string): string =>
  env.TENURE_BACKUP_DIR || path.join(path.dirname(dbFile), 'backups')

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * A new file in `dir` named for this computer's local time, for example tenure-2026-11-07-140322.db, or with -2, -3
 * and so on when a file of that name already exists (two backups in the same second).
 */
export function datedFile(dir: string, prefix: string, now: Date): string {
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  for (let n = 1; ; n++) {
    const file = path.join(dir, `${prefix}-${stamp}${n === 1 ? '' : `-${n}`}.db`)
    if (!existsSync(file)) return file
  }
}

/** The tables and row counts, on one line: "checkins 812, gyms 1, members 40". */
export const countsLine = (counts: Record<string, number>): string =>
  Object.entries(counts)
    .filter(([table]) => table !== '__drizzle_migrations')
    .map(([table, n]) => `${table} ${n}`)
    .join(', ')
