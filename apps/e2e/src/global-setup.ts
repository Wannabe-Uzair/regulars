// Before the flows: build the web app (unless E2E_SKIP_BUILD is set), then per browser seed a fresh demo database and
// start a stall-mode server on 127.0.0.1. The returned function stops the servers after the run.
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { closeSync, mkdirSync, openSync, readFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { DATA_DIR, REPO_DIR } from './paths.ts'
import { BROWSERS, type Browser, baseURLOf, dbFileOf, E2E_TZ, portOf } from './servers.ts'

const HEALTH_TIMEOUT_MS = 30_000

type Server = { browser: Browser; child: ChildProcess; log: string }

function logFileOf(browser: Browser): string {
  return path.join(DATA_DIR, `${browser}.log`)
}

function envFor(browser: Browser): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(portOf(browser)),
    TENURE_DB: dbFileOf(browser),
    TENURE_TZ: E2E_TZ,
    // Lifts the rate limits a hundredfold, so parallel flows don't trip them.
    TENURE_LIMIT_FACTOR: '100',
  }
}

function buildWeb(): void {
  const result = spawnSync('npm', ['run', 'build', '-w', '@tenure/web'], { cwd: REPO_DIR, stdio: 'inherit' })
  if (result.status !== 0) throw new Error('The web build failed (npm run build -w @tenure/web).')
}

/** Seed into a fresh file. Its output (which names the demo logins) goes to the log, and is shown only on failure. */
function seed(browser: Browser): void {
  const result = spawnSync(process.execPath, ['apps/api/src/seed.ts'], {
    cwd: REPO_DIR,
    env: envFor(browser),
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`Seeding ${dbFileOf(browser)} failed:\n${result.stdout}${result.stderr}`)
  }
}

/** True when something already answers on the port: a leftover or another checkout's run. */
function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

function start(browser: Browser): Server {
  const log = logFileOf(browser)
  const fd = openSync(log, 'w')
  const child = spawn(process.execPath, ['apps/api/src/main.ts', '--stall'], {
    cwd: REPO_DIR,
    env: envFor(browser),
    stdio: ['ignore', fd, fd],
  })
  closeSync(fd)
  return { browser, child, log }
}

async function waitForHealth({ browser, child, log }: Server): Promise<void> {
  const url = `${baseURLOf(browser)}/api/health`
  const deadline = Date.now() + HEALTH_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`The ${browser} server stopped before it was ready:\n${readFileSync(log, 'utf8')}`)
    }
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`The ${browser} server did not answer ${url} within ${HEALTH_TIMEOUT_MS / 1000} s. See ${log}.`)
}

/** SIGTERM each server we started (by its pid), then SIGKILL any still running after 5 s. */
async function stop(servers: Server[]): Promise<void> {
  await Promise.all(
    servers.map(({ child }) => {
      if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000)
        child.once('exit', () => {
          clearTimeout(timer)
          resolve()
        })
        child.kill('SIGTERM')
      })
    }),
  )
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  if (!process.env.E2E_SKIP_BUILD) buildWeb()
  mkdirSync(DATA_DIR, { recursive: true })
  for (const browser of BROWSERS) {
    if (await portInUse(portOf(browser))) {
      throw new Error(`Port ${portOf(browser)} is in use. Stop what holds it, or set E2E_BASE_PORT to another port.`)
    }
  }
  const servers: Server[] = []
  try {
    for (const browser of BROWSERS) {
      seed(browser)
      servers.push(start(browser))
    }
    await Promise.all(servers.map(waitForHealth))
  } catch (err) {
    await stop(servers)
    throw err
  }
  return () => stop(servers)
}
