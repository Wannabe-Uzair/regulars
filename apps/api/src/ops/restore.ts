// `npm run restore -- <file>`: replace the database at TENURE_DB (default apps/api/data/tenure.db) with a backup.
// It refuses while the server runs: the server holds a lock on its database for as long as it's open. It refuses a
// file that fails PRAGMA integrity_check or isn't a Tenure database. It keeps the bytes of the database it replaces,
// damaged or not, as a dated copy (in TENURE_BACKUP_DIR, or the backups folder beside the database). The next start
// migrates the restored file as usual (FR-OPS-04).
//
// No server opens either file mid-swap. The restore locks the current database before its check and the backup's copy
// before it moves in, and lets both go only once the copy is in place. A server starting meanwhile waits for them (for
// its busy timeout, then it fails to start) and only ever opens the restored file. With no database there yet, the
// copy moves in only if the name is still free, so a server that started meanwhile makes the restore refuse. A
// database too damaged to lock can't have a server on it, so it is replaced unlocked.
import { inspect, takeExclusive, vacuumInto } from '@tenure/db/ops'
import { copyFileSync, existsSync, linkSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { backupDirOf, countsLine, datedFile, dbFileOf, type Env, type Io } from './files.ts'

const USAGE = 'Usage: npm run restore -- <backup file>'
const UNCHANGED = 'Nothing was changed.'

/** Run the restore command. Resolves to the exit code: 0, or 1 when it refuses (and then nothing has changed). */
export async function restoreCommand(args: string[], env: Env, { log, error = log }: Io, now = new Date()): Promise<number> {
  if (args.length !== 1 || !args[0] || args[0].startsWith('-')) {
    error(USAGE)
    return 1
  }
  const source = path.resolve(args[0])
  const dbFile = path.resolve(dbFileOf(env))
  if (!existsSync(source)) {
    error(`No file at ${source}. ${UNCHANGED}`)
    return 1
  }
  if (source === dbFile) {
    error(`${source} is the database itself. Name a backup to restore. ${UNCHANGED}`)
    return 1
  }

  const current = existsSync(dbFile) ? takeExclusive(dbFile) : undefined
  if (current === null) {
    error(running(dbFile))
    return 1
  }

  const incoming = `${dbFile}.restoring`
  let next: { release(): void } | null = null
  const keptFiles: string[] = []
  let swapped = false
  let counts: Record<string, number>
  try {
    const found = inspect(source)
    if (found.kind !== 'tenure') {
      error(refusal(source, found))
      return 1
    }
    counts = found.counts
    mkdirSync(path.dirname(dbFile), { recursive: true })
    rmSync(incoming, { force: true })
    vacuumInto(source, incoming, { readonly: true })
    // A file of this command's own, so nothing else has it open.
    next = takeExclusive(incoming)
    if (current) {
      // Its bytes as they are, damaged or not, with the log of a server that was killed mid-write (its last writes).
      const dir = backupDirOf(env, dbFile)
      mkdirSync(dir, { recursive: true })
      const kept = datedFile(dir, 'tenure-before-restore', now)
      keptFiles.push(kept)
      copyFileSync(dbFile, kept)
      if (statSync(`${dbFile}-wal`, { throwIfNoEntry: false })?.size) {
        keptFiles.push(`${kept}-wal`)
        copyFileSync(`${dbFile}-wal`, `${kept}-wal`)
      }
      renameSync(incoming, dbFile)
    } else {
      try {
        linkSync(incoming, dbFile)
      } catch (err) {
        if ((err as { code?: string }).code !== 'EEXIST') throw err
        error(running(dbFile))
        return 1
      }
      rmSync(incoming)
    }
    swapped = true
    // Log files left beside the database belong to the one replaced. SQLite would replay them into the restored file.
    for (const f of [`${dbFile}-wal`, `${dbFile}-shm`]) rmSync(f, { force: true })
  } finally {
    // The replaced file's lock first: while the restored file's is held, a server waiting to start can't make log files.
    current?.release()
    next?.release()
    if (!swapped) for (const f of [incoming, ...keptFiles]) rmSync(f, { force: true })
  }

  log(`Restored ${source} into ${dbFile}: ${countsLine(counts)}.`)
  log(keptFiles[0] ? `The database it replaced is kept as ${keptFiles[0]}.` : 'There was no database there before.')
  log('The next start brings it up to date.')
  return 0
}

const running = (dbFile: string) =>
  `The server is running on ${dbFile}, or another command has it open. Stop it first, then restore. ${UNCHANGED}`

function refusal(source: string, found: Exclude<ReturnType<typeof inspect>, { kind: 'tenure' }>): string {
  switch (found.kind) {
    case 'notSqlite':
      return `${source} is not a Tenure database (it is not a SQLite file). ${UNCHANGED}`
    case 'notTenure':
      return `${source} is a SQLite file, but not a Tenure database. ${UNCHANGED}`
    case 'damaged':
      return [
        `${source} failed its integrity check, so it can't be restored. ${UNCHANGED}`,
        ...found.problems.slice(0, 5).map((p) => `  ${p}`),
      ].join('\n')
  }
}

if (import.meta.main) {
  process.exitCode = await restoreCommand(process.argv.slice(2), process.env, { log: console.log, error: console.error })
}
