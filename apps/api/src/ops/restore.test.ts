// npm run restore, called in-process (roundtrip.test.ts runs it beside a real server). An open createDb connection
// stands in for the running server: it holds the same lock on the file.
import { createDb, createRepositories } from '@tenure/db'
import { inspect, tableCounts } from '@tenure/db/ops'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, expect, test } from 'vitest'
import { seedCommand } from '../seed.ts'
import { scratchDir } from '../test/scratch.ts'
import { backupCommand } from './backup.ts'
import { restoreCommand } from './restore.ts'

const dir = scratchDir('ops-restore')
const at = new Date(2026, 10, 7, 9, 5, 1)
/** A backup of the seeded Northside gym, and its row counts. */
let backup: string
let counts: Record<string, number>

beforeAll(async () => {
  const seeded = path.join(dir, 'seeded', 'tenure.db')
  expect(await seedCommand({ TENURE_DB: seeded, TENURE_TZ: 'America/Chicago' }, { log: () => {} })).toBe(0)
  const out: string[] = []
  expect(await backupCommand([], { TENURE_DB: seeded }, { log: (l) => out.push(l) }, at)).toBe(0)
  backup = out[0]!
  counts = tableCounts(backup)
})

/** A fresh, migrated database with no gym in it, in a folder of its own. */
function emptyDb(name: string): string {
  const file = path.join(dir, name, 'tenure.db')
  createDb(file).close()
  return file
}

async function restore(args: string[], db: string, env: Record<string, string> = {}) {
  const out: string[] = []
  const err: string[] = []
  const code = await restoreCommand(args, { TENURE_DB: db, ...env }, { log: (l) => out.push(l), error: (l) => err.push(l) }, at)
  return { code, out, err }
}

const listing = (folder: string) => (existsSync(folder) ? readdirSync(folder).sort() : [])

test('FR-OPS-02 restore puts the backup in place and keeps the database it replaced as a dated copy', async () => {
  const db = emptyDb('replace')
  const before = tableCounts(db)
  expect(before.gyms).toBe(0)
  const r = await restore([backup], db)
  const kept = path.join(dir, 'replace', 'backups', 'tenure-before-restore-2026-11-07-090501.db')
  expect(r.code).toBe(0)
  expect(r.err).toEqual([])
  expect(r.out[0]).toMatch(new RegExp(`^Restored ${backup} into ${db}: .*gyms 1, .*members ${counts.members}`))
  expect(r.out.slice(1)).toEqual([`The database it replaced is kept as ${kept}.`, 'The next start brings it up to date.'])
  expect(inspect(db)).toEqual({ kind: 'tenure', counts })
  expect(tableCounts(kept)).toEqual(before)
  expect(listing(path.join(dir, 'replace'))).toEqual(['backups', 'tenure.db'])
})

test('FR-OPS-02 restore replaces a damaged database and keeps its bytes', async () => {
  // Damaged: page 2, the first table's root, zeroed. And not a database at all: a file of other bytes.
  const zeroed = emptyDb('damaged-current')
  const bytes = readFileSync(zeroed)
  bytes.fill(0, bytes.readUInt16BE(16), 2 * bytes.readUInt16BE(16))
  writeFileSync(zeroed, bytes)
  const garbage = path.join(dir, 'garbage-current', 'tenure.db')
  mkdirSync(path.dirname(garbage))
  writeFileSync(garbage, Buffer.alloc(8192, 7))
  for (const db of [zeroed, garbage]) {
    const old = readFileSync(db)
    const r = await restore([backup], db)
    const kept = path.join(path.dirname(db), 'backups', 'tenure-before-restore-2026-11-07-090501.db')
    expect(r).toMatchObject({ code: 0, err: [] })
    expect(r.out[1]).toBe(`The database it replaced is kept as ${kept}.`)
    expect(inspect(db)).toEqual({ kind: 'tenure', counts })
    expect(readFileSync(kept).equals(old)).toBe(true)
    expect(listing(path.dirname(db))).toEqual(['backups', 'tenure.db'])
    expect(listing(path.dirname(kept))).toEqual(['tenure-before-restore-2026-11-07-090501.db'])
  }
})

test('FR-OPS-02 restore keeps the writes a killed server left in its log, with the database it replaced', async () => {
  // A server killed mid-write: its last writes are only in tenure.db-wal. Copied while open, the two files are that.
  const live = emptyDb('killed-live')
  const open = createDb(live)
  const db = path.join(dir, 'killed', 'tenure.db')
  let before: Record<string, number>
  try {
    await createRepositories(open.db).gyms.createWithOwner({
      gym: { name: 'Eastside', slug: 'eastside', timezone: 'America/Chicago', pilotStartedOn: '2026-11-07', kioskToken: 'k' },
      owner: { email: 'owner@example.com', name: 'Ana Ruiz', passwordHash: 'x' },
      templates: [],
      createdAt: '2026-11-07T15:00:00.000Z',
    })
    before = tableCounts(live)
    expect(before.gyms).toBe(1)
    expect(statSync(`${live}-wal`).size).toBeGreaterThan(0)
    mkdirSync(path.dirname(db))
    copyFileSync(live, db)
    copyFileSync(`${live}-wal`, `${db}-wal`)
  } finally {
    open.close()
  }
  const r = await restore([backup], db)
  const kept = path.join(dir, 'killed', 'backups', 'tenure-before-restore-2026-11-07-090501.db')
  expect(r.code).toBe(0)
  expect(listing(path.dirname(kept))).toEqual([path.basename(kept), `${path.basename(kept)}-wal`])
  expect(tableCounts(kept)).toEqual(before)
  expect(listing(path.join(dir, 'killed'))).toEqual(['backups', 'tenure.db'])
  expect(inspect(db)).toEqual({ kind: 'tenure', counts })
})

test('FR-OPS-02 restore keeps the replaced database in TENURE_BACKUP_DIR when it is set', async () => {
  const db = emptyDb('keep-elsewhere')
  const elsewhere = path.join(dir, 'kept-here')
  const r = await restore([backup], db, { TENURE_BACKUP_DIR: elsewhere })
  expect(r.code).toBe(0)
  expect(listing(elsewhere)).toEqual(['tenure-before-restore-2026-11-07-090501.db'])
})

test('FR-OPS-02 restore with no database there yet puts the backup in place and keeps nothing', async () => {
  const db = path.join(dir, 'fresh', 'tenure.db')
  const r = await restore([backup], db)
  expect(r.code).toBe(0)
  expect(r.out[1]).toBe('There was no database there before.')
  expect(tableCounts(db)).toEqual(counts)
  expect(listing(path.join(dir, 'fresh'))).toEqual(['tenure.db'])
})

test('FR-OPS-02 restore refuses while the server has the database open, and changes nothing', async () => {
  const db = emptyDb('running')
  const server = createDb(db)
  try {
    const r = await restore([backup], db)
    expect(r.code).toBe(1)
    expect(r.err).toEqual([
      `The server is running on ${db}, or another command has it open. Stop it first, then restore. Nothing was changed.`,
    ])
    expect(r.out).toEqual([])
  } finally {
    server.close()
  }
  expect(tableCounts(db).gyms).toBe(0)
  expect(listing(path.join(dir, 'running'))).toEqual(['tenure.db'])
  // Once it has stopped, the same restore goes ahead.
  expect((await restore([backup], db)).code).toBe(0)
  expect(tableCounts(db)).toEqual(counts)
})

test('FR-OPS-02 restore refuses a file that fails its integrity check, and changes nothing', async () => {
  const damaged = path.join(dir, 'damaged.db')
  const bytes = readFileSync(backup)
  const pageSize = bytes.readUInt16BE(16)
  // Page 2 is the first table's root page: zeroed, it is no longer a b-tree page.
  bytes.fill(0, pageSize, 2 * pageSize)
  writeFileSync(damaged, bytes)
  const db = emptyDb('damaged')
  const r = await restore([damaged], db)
  expect(r.code).toBe(1)
  expect(r.err[0]).toMatch(new RegExp(`^${damaged} failed its integrity check, so it can't be restored. Nothing was changed.\n  `))
  expect(tableCounts(db).gyms).toBe(0)
  expect(listing(path.join(dir, 'damaged'))).toEqual(['tenure.db'])
})

test("FR-OPS-02 restore refuses a file that isn't a Tenure database, and changes nothing", async () => {
  const text = path.join(dir, 'members.csv')
  writeFileSync(text, 'first_name,last_name,phone\nMaya,Lopez,3125550101\n'.repeat(20))
  // SQLite reads an empty file as an empty database: a SQLite file, but without Tenure's tables.
  const empty = path.join(dir, 'empty.db')
  writeFileSync(empty, '')
  const db = emptyDb('foreign')
  expect(await restore([text], db)).toEqual({
    code: 1,
    out: [],
    err: [`${text} is not a Tenure database (it is not a SQLite file). Nothing was changed.`],
  })
  expect(await restore([empty], db)).toEqual({
    code: 1,
    out: [],
    err: [`${empty} is a SQLite file, but not a Tenure database. Nothing was changed.`],
  })
  expect(tableCounts(db).gyms).toBe(0)
  expect(listing(path.join(dir, 'foreign'))).toEqual(['tenure.db'])
})

test('FR-OPS-02 restore refuses a missing file, the database itself, and a call without one file', async () => {
  const db = emptyDb('args')
  const missing = path.join(dir, 'no-such.db')
  expect((await restore([missing], db)).err).toEqual([`No file at ${missing}. Nothing was changed.`])
  expect((await restore([db], db)).err).toEqual([`${db} is the database itself. Name a backup to restore. Nothing was changed.`])
  for (const args of [[], [backup, backup], ['--force']]) {
    expect(await restore(args, db)).toEqual({ code: 1, out: [], err: ['Usage: npm run restore -- <backup file>'] })
  }
  expect(listing(path.join(dir, 'args'))).toEqual(['tenure.db'])
})

test('FR-OPS-02 restore clears log files left beside the database, so SQLite never replays them into the backup', async () => {
  // A server killed mid-write leaves tenure.db-wal behind. Here one is left beside a database that has since gone.
  const other = path.join(dir, 'other', 'tenure.db')
  const open = createDb(other)
  const db = path.join(dir, 'stale-log', 'tenure.db')
  try {
    expect(statSync(`${other}-wal`).size).toBeGreaterThan(0)
    mkdirSync(path.dirname(db), { recursive: true })
    copyFileSync(`${other}-wal`, `${db}-wal`)
  } finally {
    open.close()
  }
  const r = await restore([backup], db)
  expect(r.code).toBe(0)
  expect(listing(path.join(dir, 'stale-log'))).toEqual(['tenure.db'])
  expect(inspect(db)).toEqual({ kind: 'tenure', counts })
})
