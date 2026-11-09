// A world built from the real demo seed (seed.mjs), with the fixtures' pinned clock.
import { openDb } from '../db.mjs'
import { createApp } from '../app.mjs'
import { seedNorthside, DEMO_PASSWORD } from '../seed.mjs'
import { NOW, TODAY, call, cookieOf } from './fixtures.mjs'

export async function seededWorld({ today = TODAY, now = NOW } = {}) {
  const db = openDb(':memory:')
  const seeded = await seedNorthside(db, { today, now })
  const app = createApp({ db, now: () => now, port: 5175, lan: () => ['192.168.137.1'] })
  const login = async (email, password = DEMO_PASSWORD) => {
    const r = await call(app, 'POST', '/api/auth/login', { body: { email, password } })
    return { status: r.status, cookie: cookieOf(r.res) }
  }
  return { db, app, ...seeded, login }
}
