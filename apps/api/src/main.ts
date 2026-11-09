// Starts the API: read the config, open the database, serve. `--stall` listens on every interface (unless HOST is
// set) and turns on stall mode, as the old server did: it also serves apps/web/dist and needs a seeded database.
// SIGTERM and SIGINT stop it cleanly (platform/shutdown.ts).
import { serve } from '@hono/node-server'
import { createDb, createRepositories } from '@tenure/db'
import type { Server } from 'node:http'
import { createDevAdapters } from './adapters/index.ts'
import { createApp } from './app.ts'
import { defaultModules } from './modules/index.ts'
import { loadConfig, type Config } from './platform/config.ts'
import type { AppContext } from './platform/context.ts'
import { createEventBus } from './platform/events.ts'
import { hasWebBuild, WEB_DIST } from './platform/http/client.ts'
import { phoneLinks, serverLan, startupLines } from './platform/lan.ts'
import { createMemoryRateLimitStore, createRateLimits } from './platform/rate-limit.ts'
import { createStopSignal, gracefulStop } from './platform/shutdown.ts'

const env = process.argv.includes('--stall')
  ? { ...process.env, HOST: process.env.HOST || '0.0.0.0', TENURE_SERVE_CLIENT: '1' }
  : process.env

let config: Config
try {
  config = loadConfig(env)
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}

const { db, close } = createDb(config.dbFile)
const repos = createRepositories(db)
const gym = await repos.gyms.findDefault()
if (config.stall && !gym) {
  console.error('Run npm run seed first')
  close()
  process.exit(1)
}
if (config.stall && !hasWebBuild()) {
  console.warn(`No web build at ${WEB_DIST}; the API runs, the app pages don't. Build the web app first.`)
}

const clock = () => new Date()
const shutdown = createStopSignal()
const ctx: AppContext = {
  config,
  clock,
  repos,
  // TENURE_LIMIT_FACTOR is 1 unless an e2e server sets it.
  rateLimits: createRateLimits(createMemoryRateLimitStore(), clock, config.limitFactor),
  bus: createEventBus(),
  // Only the dev stand-ins exist so far; real providers are picked here when they do.
  adapters: createDevAdapters(),
  shutdown,
  lan: serverLan(config.host, env),
}

const modules = defaultModules
// serve() without a createServer option makes a node:http Server.
const server = serve({ fetch: createApp(ctx, modules).fetch, hostname: config.host, port: config.port }, (info) => {
  const hint = config.host === '0.0.0.0' && phoneLinks(env).hint
  const lines = startupLines({ host: config.host, port: info.port, lanIps: ctx.lan(), kioskToken: gym?.kioskToken, hint, modules })
  for (const line of lines) console.log(line)
}) as Server

const stop = gracefulStop({ server, endStreams: shutdown.stop, closeDb: close })
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
