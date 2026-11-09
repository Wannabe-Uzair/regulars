// Starts the API: HOST (default 127.0.0.1) and PORT (default 5175). `npm run stall` runs `node index.mjs --stall`,
// which listens on all interfaces and sets TENURE_SERVE_CLIENT=1 here (so npm's echoed script line shows no address), which also serves ../client/dist (see client.mjs) and needs a seeded database.
import { serve } from '@hono/node-server'
import { openDb } from './db.mjs'
import { createApp } from './app.mjs'
import { lanAddresses } from './routes/gym.mjs'
import { clientMounter, hasClientBuild, CLIENT_DIST } from './client.mjs'

if (process.argv.includes('--stall')) {
  process.env.HOST ||= '0.0.0.0'
  process.env.TENURE_SERVE_CLIENT = '1'
}

const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.PORT) || 5175
const STALL = process.env.TENURE_SERVE_CLIENT === '1'

const db = openDb(process.env.TENURE_DB || undefined)
const gym = db.prepare('SELECT * FROM gyms ORDER BY is_demo DESC, id LIMIT 1').get()
if (STALL && !gym) {
  console.error('Run npm run seed first')
  db.close()
  process.exit(1)
}
if (STALL && !hasClientBuild()) console.warn(`No client build at ${CLIENT_DIST}; the API runs, the app pages don't. Build the client first.`)

const app = createApp({ db, port: PORT, mountClient: STALL ? clientMounter() : undefined })
const server = serve({ fetch: app.fetch, hostname: HOST, port: PORT }, (info) => {
  // 0.0.0.0 is a listen address, not one a browser can open: the laptop uses localhost, phones and the kiosk the LAN.
  const lan = HOST === '0.0.0.0'
  console.log(`Tenure on http://${lan ? 'localhost' : info.address}:${info.port}${lan ? ' (this computer)' : ''}`)
  if (lan) {
    const ips = lanAddresses()
    for (const ip of ips) console.log(`  on a phone: http://${ip}:${info.port}`)
    if (gym) for (const host of ips.length ? ips : ['localhost']) console.log(`  kiosk: http://${host}:${info.port}/kiosk/${gym.kiosk_token}`)
  }
})

const stop = () => server.close(() => { db.close(); process.exit(0) })
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
