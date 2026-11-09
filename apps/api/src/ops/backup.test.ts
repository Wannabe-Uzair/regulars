// npm run backup, called in-process (roundtrip.test.ts runs it as a command beside a running server).
import { inspect, tableCounts } from '@tenure/db/ops'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, expect, test } from 'vitest'
import { seedCommand } from '../seed.ts'
import { scratchDir } from '../test/scratch.ts'
import { backupCommand } from './backup.ts'

const dir = scratchDir('ops-backup')
const db = path.join(dir, 'gym', 'tenure.db')
const at = new Date(2026, 10, 7, 14, 3, 22)

beforeAll(async () => {
  expect(await seedCommand({ TENURE_DB: db, TENURE_TZ: 'America/Chicago' }, { log: () => {} })).toBe(0)
})

async function backup(args: string[], env: Record<string, string> = {}) {
  const out: string[] = []
  const err: string[] = []
  const code = await backupCommand(args, { TENURE_DB: db, ...env }, { log: (l) => out.push(l), error: (l) => err.push(l) }, at)
  return { code, out, err }
}

test('FR-OPS-02 npm run backup copies the database to a dated file in the backups folder beside it, and prints its path', async () => {
  const r = await backup([])
  const file = path.join(dir, 'gym', 'backups', 'tenure-2026-11-07-140322.db')
  expect(r).toEqual({ code: 0, out: [file], err: [] })
  const copy = inspect(file)
  expect(copy).toEqual({ kind: 'tenure', counts: tableCounts(db) })
  if (copy.kind === 'tenure') expect(copy.counts.members).toBeGreaterThan(0)
})

test('FR-OPS-02 a second backup in the same second gets a file of its own', async () => {
  const folder = path.join(dir, 'twice')
  const first = await backup([folder])
  const second = await backup([folder])
  expect([first.out, second.out]).toEqual([
    [path.join(folder, 'tenure-2026-11-07-140322.db')],
    [path.join(folder, 'tenure-2026-11-07-140322-2.db')],
  ])
  expect(readdirSync(folder).sort()).toEqual(['tenure-2026-11-07-140322-2.db', 'tenure-2026-11-07-140322.db'])
})

test('FR-OPS-02 a backup goes to the folder it is given, otherwise to TENURE_BACKUP_DIR', async () => {
  const given = path.join(dir, 'given')
  const fromEnv = path.join(dir, 'from-env')
  expect((await backup([given], { TENURE_BACKUP_DIR: fromEnv })).out).toEqual([path.join(given, 'tenure-2026-11-07-140322.db')])
  expect((await backup([], { TENURE_BACKUP_DIR: fromEnv })).out).toEqual([path.join(fromEnv, 'tenure-2026-11-07-140322.db')])
})

test('FR-OPS-02 a backup with no database there says so, writes nothing and exits 1', async () => {
  const missing = path.join(dir, 'nowhere', 'tenure.db')
  const r = await backup([], { TENURE_DB: missing })
  expect(r.code).toBe(1)
  expect(r.err).toEqual([`No database at ${missing}, so there is nothing to back up. Set TENURE_DB to the database file.`])
  expect(r.out).toEqual([])
})

test('FR-OPS-02 a backup of a database that cannot be copied says so in one line, leaves no file and exits 1', async () => {
  // Page 2, the first table's root, zeroed.
  const damaged = path.join(dir, 'damaged', 'tenure.db')
  mkdirSync(path.dirname(damaged))
  const bytes = readFileSync(db)
  bytes.fill(0, bytes.readUInt16BE(16), 2 * bytes.readUInt16BE(16))
  writeFileSync(damaged, bytes)
  const folder = path.join(dir, 'damaged-backups')
  const r = await backup([folder], { TENURE_DB: damaged })
  expect(r).toEqual({
    code: 1,
    out: [],
    err: [`The database at ${damaged} could not be copied, so there is no backup: database disk image is malformed`],
  })
  expect(readdirSync(folder)).toEqual([])
})

test('FR-OPS-02 a backup given more than a folder prints its usage and exits 1', async () => {
  expect(await backup(['a', 'b'])).toEqual({ code: 1, out: [], err: ['Usage: npm run backup [-- <folder>]'] })
  expect(await backup(['--out'])).toEqual({ code: 1, out: [], err: ['Usage: npm run backup [-- <folder>]'] })
})
