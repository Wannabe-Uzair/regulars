// `npm run backup [-- <folder>]`: copy the database at TENURE_DB (default apps/api/data/tenure.db) to a dated file and
// print its path. Safe while the server runs and writes: VACUUM INTO copies one consistent snapshot. The file goes in
// <folder>, or TENURE_BACKUP_DIR, or a backups folder beside the database.
import { vacuumInto } from '@tenure/db/ops'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { backupDirOf, datedFile, dbFileOf, type Env, type Io } from './files.ts'

const USAGE = 'Usage: npm run backup [-- <folder>]'

/**
 * Run the backup command. Resolves to the exit code: 0, or 1 when there is no database, it can't be copied (then no file
 * is left behind), or the arguments are wrong.
 */
export async function backupCommand(args: string[], env: Env, { log, error = log }: Io, now = new Date()): Promise<number> {
  const [folder, ...rest] = args
  if (rest.length > 0 || folder?.startsWith('-')) {
    error(USAGE)
    return 1
  }
  const dbFile = dbFileOf(env)
  if (!existsSync(dbFile)) {
    error(`No database at ${dbFile}, so there is nothing to back up. Set TENURE_DB to the database file.`)
    return 1
  }
  const dir = path.resolve(folder || backupDirOf(env, dbFile))
  mkdirSync(dir, { recursive: true })
  const file = datedFile(dir, 'tenure', now)
  try {
    vacuumInto(dbFile, file)
  } catch (err) {
    error(`The database at ${dbFile} could not be copied, so there is no backup: ${(err as Error).message}`)
    return 1
  }
  log(file)
  return 0
}

if (import.meta.main) {
  process.exitCode = await backupCommand(process.argv.slice(2), process.env, { log: console.log, error: console.error })
}
