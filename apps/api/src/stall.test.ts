// main.ts as a process: the stall-mode start checks and the start-up printout, as the old server's stall tests ran it,
// and the clean stop on SIGTERM.
import { DEMO_PASSWORD } from '@tenure/db/seed'
import { spawn, spawnSync } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { GRACE_MS } from './platform/shutdown.ts'
import { seedCommand } from './seed.ts'
import { scratchDir } from './test/scratch.ts'

const MAIN = path.join(import.meta.dirname, 'main.ts')
const dir = scratchDir('stall')
const baseEnv = { PATH: process.env.PATH, HOME: process.env.HOME }

const freePort = () =>
  new Promise<number>((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo
      s.close(() => resolve(port))
    })
  })

const children: ReturnType<typeof spawn>[] = []
afterEach(() => {
  for (const c of children.splice(0)) c.kill()
})

test('stall mode on a database without a gym says "Run npm run seed first" and exits non-zero', async () => {
  const env = { ...baseEnv, TENURE_DB: path.join(dir, 'empty.db'), TENURE_SERVE_CLIENT: '1', PORT: String(await freePort()) }
  const r = spawnSync(process.execPath, [MAIN], { env, encoding: 'utf8', timeout: 15000 })
  expect(r.status).toBe(1)
  expect(r.stderr).toMatch(/Run npm run seed first/)
  expect(r.stdout).not.toMatch(/Tenure on/)
})

test('FR-OPS-01 on 0.0.0.0 the start-up lines give localhost for this computer, TENURE_LAN_IPS for phones, and the kiosk on each', async () => {
  const file = path.join(dir, 'gym.db')
  const seedLines: string[] = []
  expect(await seedCommand({ TENURE_DB: file, TENURE_TZ: 'America/Chicago' }, { log: (l) => seedLines.push(l) })).toBe(0)
  const kiosk = seedLines.map((l) => /^Kiosk: (\/kiosk\/\S+)$/.exec(l)?.[1]).find(Boolean)
  if (!kiosk) throw new Error(`no kiosk line in: ${seedLines.join('\n')}`)

  const port = await freePort()
  const env = {
    ...baseEnv,
    TENURE_DB: file,
    HOST: '0.0.0.0',
    PORT: String(port),
    TENURE_SERVE_CLIENT: '1',
    TENURE_LAN_IPS: '192.168.137.1,10.0.0.5',
  }
  const child = spawn(process.execPath, [MAIN], { env })
  children.push(child)
  let out = ''
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no kiosk lines in: ${out}`)), 15000)
    child.stdout.on('data', (b: Buffer) => {
      out += b.toString()
      if ((out.match(/kiosk:.*\n/g) ?? []).length === 2) {
        clearTimeout(timer)
        resolve()
      }
    })
  })
  const res = await fetch(`http://127.0.0.1:${port}/api/nope`)
  expect(res.status).toBe(404)
  expect(((await res.json()) as { error: { code: string } }).error.code).toBe('notApi')
  // Read after the request, so a line printed after the phone lines would be here too.
  expect(out).toBe(
    [
      `Tenure on http://localhost:${port} (this computer)`,
      `  on a phone: http://192.168.137.1:${port}`,
      `  on a phone: http://10.0.0.5:${port}`,
      `  kiosk: http://192.168.137.1:${port}${kiosk}`,
      `  kiosk: http://10.0.0.5:${port}${kiosk}`,
      '',
    ].join('\n'),
  )
  expect(out).not.toMatch(/0\.0\.0\.0/)
}, 30000)

test('SIGTERM with a live stream open: one "Stopping Tenure" line, then exit 0 well inside the 3 s fallback', async () => {
  const file = path.join(dir, 'stop.db')
  expect(await seedCommand({ TENURE_DB: file, TENURE_TZ: 'America/Chicago' }, { log: () => {} })).toBe(0)
  const port = await freePort()
  const child = spawn(process.execPath, [MAIN], { env: { ...baseEnv, TENURE_DB: file, PORT: String(port) } })
  children.push(child)
  let out = ''
  child.stdout.on('data', (b: Buffer) => (out += b.toString()))
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)))
  for (let i = 0; i < 300 && !out.includes('Tenure on'); i++) await new Promise((r) => setTimeout(r, 50))

  const base = `http://127.0.0.1:${port}`
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'mike@northside.test', password: DEMO_PASSWORD }),
  })
  expect(login.status).toBe(200)
  const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
  const res = await fetch(`${base}/api/events`, { headers: { cookie } })
  expect(res.status).toBe(200)
  const reader = res.body?.getReader()
  if (!reader) throw new Error('the event stream has no body')
  await reader.read()

  const started = Date.now()
  child.kill('SIGTERM')
  // The stop ends the stream cleanly (done). A stream cut when the grace runs out would throw "terminated" here.
  let done = false
  while (!done) ({ done } = await reader.read())
  expect(await exited).toBe(0)
  expect(Date.now() - started).toBeLessThan(GRACE_MS)
  expect(out).toMatch(/\nStopping Tenure\n$/)
}, 30000)
