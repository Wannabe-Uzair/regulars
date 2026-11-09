// The backup and restore commands as processes beside a real server (main.ts) that is writing: sign-ups, one after
// another, each writing a gym, its owner, a session and the gym's templates.
import { tableCounts } from '@tenure/db/ops'
import { spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { seedCommand } from '../seed.ts'
import { scratchDir } from '../test/scratch.ts'

const MAIN = path.join(import.meta.dirname, '..', 'main.ts')
const BACKUP = path.join(import.meta.dirname, 'backup.ts')
const RESTORE = path.join(import.meta.dirname, 'restore.ts')
const dir = scratchDir('ops-roundtrip')
const db = path.join(dir, 'tenure.db')
// Sign-ups are limited to 5 in 10 minutes per device; the factor lifts that for this one test server.
const env = { PATH: process.env.PATH, HOME: process.env.HOME, TENURE_DB: db, TENURE_LIMIT_FACTOR: '1000' }

const freePort = () =>
  new Promise<number>((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo
      s.close(() => resolve(port))
    })
  })

const children: ChildProcess[] = []
afterEach(() => {
  for (const c of children.splice(0)) c.kill()
})

/** Run a command to the end without blocking this process, so the sign-ups go on meanwhile. */
function run(script: string, args: string[]) {
  return new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { env })
    children.push(child)
    let out = ''
    let err = ''
    child.stdout.on('data', (b: Buffer) => (out += b.toString()))
    child.stderr.on('data', (b: Buffer) => (err += b.toString()))
    child.on('exit', (code) => resolve({ code, out, err }))
  })
}

/** Start main.ts on the database and wait for its first line. Resolves to its address and its stop. */
async function startServer() {
  const port = await freePort()
  const child = spawn(process.execPath, [MAIN], { env: { ...env, PORT: String(port) } })
  children.push(child)
  let out = ''
  child.stdout.on('data', (b: Buffer) => (out += b.toString()))
  child.stderr.on('data', (b: Buffer) => (out += b.toString()))
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)))
  for (let i = 0; i < 300 && !out.includes('Tenure on'); i++) await new Promise((r) => setTimeout(r, 50))
  if (!out.includes('Tenure on')) throw new Error(`the server didn't start: ${out}`)
  return {
    base: `http://127.0.0.1:${port}`,
    stop: async () => {
      child.kill('SIGTERM')
      return exited
    },
  }
}

/** Sign up gym after gym until stopped. `done` counts the sign-ups the server has answered, so they are stored. */
function keepSigningUp(base: string) {
  const state = { done: 0, stopped: false, failure: undefined as string | undefined }
  const loop = (async () => {
    for (let i = 0; !state.stopped; i++) {
      const res = await fetch(`${base}/api/auth/signup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gymName: `Gym ${i}`, name: 'Ana Ruiz', email: `owner${i}@example.com`, password: 'longenough', country: 'US' }),
      })
      if (res.status !== 200) {
        state.failure = `sign-up ${i}: ${res.status} ${await res.text()}`
        return
      }
      state.done++
    }
  })()
  const until = async (n: number) => {
    while (state.done < n && !state.failure) await new Promise((r) => setTimeout(r, 10))
    if (state.failure) throw new Error(state.failure)
  }
  return { state, until, stop: async () => ((state.stopped = true), await loop) }
}

test('NFR-REL-03 a backup taken while the server writes restores with the same row counts', async () => {
  expect(await seedCommand({ TENURE_DB: db, TENURE_TZ: 'America/Chicago' }, { log: () => {} })).toBe(0)
  const seededGyms = tableCounts(db).gyms!
  const server = await startServer()
  const writes = keepSigningUp(server.base)

  await writes.until(3)
  const storedBefore = writes.state.done
  const backup = await run(BACKUP, [])
  const storedDuring = writes.state.done
  expect(backup.err).toBe('')
  expect(backup.code).toBe(0)
  const file = backup.out.trim()
  expect(file).toMatch(new RegExp(`^${path.join(dir, 'backups', 'tenure-')}\\d{4}-\\d{2}-\\d{2}-\\d{6}\\.db$`))
  // The sign-up in flight as the backup ended may be in it; the one after that isn't.
  await writes.until(storedDuring + 2)

  // FR-OPS-02: no restore while the server runs.
  const refused = await run(RESTORE, [file])
  expect(refused.code).toBe(1)
  expect(refused.err).toMatch(/^The server is running on .*Nothing was changed\.\n$/)

  await writes.stop()
  expect(await server.stop()).toBe(0)
  const final = tableCounts(db)
  const backedUp = tableCounts(file)
  // A snapshot taken mid-writes: everything answered before it, and not what came after.
  expect(backedUp.gyms).toBeGreaterThanOrEqual(seededGyms + storedBefore)
  expect(backedUp.gyms).toBeLessThan(final.gyms!)
  // Each sign-up's rows went in together, so the snapshot holds whole sign-ups only.
  expect(backedUp.users! - backedUp.gyms!).toBe(final.users! - final.gyms!)

  const restored = await run(RESTORE, [file])
  expect(restored.err).toBe('')
  expect(restored.code).toBe(0)
  const kept = /kept as (.*)\.\n/.exec(restored.out)?.[1]
  if (!kept) throw new Error(`no kept copy in: ${restored.out}`)
  expect(tableCounts(db)).toEqual(backedUp)
  expect(tableCounts(kept)).toEqual(final)

  // FR-OPS-04: the next start opens the restored file as usual, and it still holds the gyms signed up before.
  const again = await startServer()
  const login = await fetch(`${again.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'owner0@example.com', password: 'longenough' }),
  })
  expect(login.status).toBe(200)
  expect(await again.stop()).toBe(0)
  expect(tableCounts(db).gyms).toBe(backedUp.gyms)
}, 60000)
