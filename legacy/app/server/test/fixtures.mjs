// Test world: an in-memory DB, the app with a pinned clock, a gym with an owner and two coaches, and helpers
// to add members whose check-ins follow given weekly patterns.
import { openDb } from '../db.mjs'
import { createApp } from '../app.mjs'
import { hashPassword } from '../auth.mjs'
import { addDays } from '../metrics.mjs'
import { DEFAULT_TEMPLATES } from '../templates.mjs'

export const NOW = new Date('2026-11-06T18:00:00.000Z') // noon in Chicago
export const TODAY = '2026-11-06'
export const TZ = 'America/Chicago'
export const PASSWORD = 'correct-horse-battery'
export const HOST = 'tenure.test:5175'
const hashed = hashPassword(PASSWORD)

/** 18:00Z is noon (CST) or 1 pm (CDT) in Chicago: always the same local date. */
export const localNoon = (date) => `${date}T18:00:00.000Z`

/** fetch-like call into the app. Returns { status, body, res }. */
export async function call(app, method, path, { body, cookie, headers = {} } = {}) {
  const h = { host: HOST, ...headers }
  if (cookie) h.cookie = cookie
  if (body !== undefined && !('content-type' in h)) h['content-type'] = 'application/json'
  if (method !== 'GET' && !('content-type' in h)) h['content-type'] = 'application/json'
  const res = await app.request(`http://${HOST}${path}`, {
    method, headers: h, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  })
  const type = res.headers.get('content-type') ?? ''
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text(), res }
}

/** The 'tenure_session=…' pair from a response, for the Cookie header. */
export const cookieOf = (res) => (res.headers.get('set-cookie') ?? '').split(';')[0]

export async function makeWorld({ now = NOW, lan = () => ['192.168.137.1'] } = {}) {
  const db = openDb(':memory:')
  const app = createApp({ db, now: () => now, port: 5175, lan })
  const t = now.toISOString()
  const gymId = Number(db.prepare(
    `INSERT INTO gyms (name, slug, timezone, is_demo, pilot_started_on, plan, kiosk_token, created_at) VALUES (?, ?, ?, 0, ?, 'pilot', ?, ?)`,
  ).run('Northside Strength', 'northside', TZ, addDays(TODAY, -23), 'kiosk-token-1', t).lastInsertRowid)
  const hash = await hashed
  const addUser = (name, email, role) => Number(db.prepare(
    `INSERT INTO users (gym_id, email, name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
  ).run(gymId, email, name, role, hash, t).lastInsertRowid)
  const owner = { id: addUser('Mike R.', 'mike@northside.test', 'owner'), email: 'mike@northside.test' }
  const coach = { id: addUser('Priya S.', 'priya@northside.test', 'coach'), email: 'priya@northside.test' }
  const coach2 = { id: addUser('Jordan T.', 'jordan@northside.test', 'coach'), email: 'jordan@northside.test' }
  DEFAULT_TEMPLATES.forEach((tpl, i) =>
    db.prepare('INSERT INTO templates (gym_id, name, body, sort, updated_at) VALUES (?, ?, ?, ?, ?)').run(gymId, tpl.name, tpl.body, i + 1, t))

  let phoneSeq = 100
  const world = {
    db, app, gymId, owner, coach, coach2,
    /**
     * A member who joined `daysSinceJoin` days before TODAY. `weeks` are the finished weeks' visit counts
     * (visits on the first k days of each week); `current` visits in the current week. `phone: null` for none.
     */
    addMember({ first, last = 'Test', coachId = owner.id, daysSinceJoin, weeks = [], current = 0, phone, extraDays = [] }) {
      const joinedOn = addDays(TODAY, -daysSinceJoin)
      const p = phone === undefined ? `+1312555${String(phoneSeq++).padStart(4, '0')}` : phone
      const mid = Number(db.prepare(
        `INSERT INTO members (gym_id, first_name, last_name, phone, joined_on, coach_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, 'seed', ?)`,
      ).run(gymId, first, last, p, joinedOn, coachId, t).lastInsertRowid)
      const days = []
      weeks.forEach((k, w) => { for (let i = 0; i < k; i++) days.push(w * 7 + i) })
      const cur = Math.floor(daysSinceJoin / 7)
      for (let i = 0; i < current; i++) days.push(cur * 7 + i)
      for (const day of [...days, ...extraDays]) {
        if (day > daysSinceJoin) throw new Error(`fixture: day ${day} is after today for ${first}`)
        world.addCheckin(mid, localNoon(addDays(joinedOn, day)))
      }
      return mid
    },
    addCheckin(memberId, at) {
      db.prepare(`INSERT INTO checkins (gym_id, member_id, at, source) VALUES (?, ?, ?, 'seed')`).run(gymId, memberId, at)
    },
    async login(email) {
      const r = await call(app, 'POST', '/api/auth/login', { body: { email, password: PASSWORD } })
      if (r.status !== 200) throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`)
      return cookieOf(r.res)
    },
  }
  return world
}

/** The expo kit's sample members (SPEC §8): finished weeks plus a partial current week. */
export const KIT = {
  maya: { first: 'Maya', last: 'Reyes', weeks: [3, 4, 3, 3, 4, 3, 3, 4, 3], daysSinceJoin: 66, current: 2 },
  chris: { first: 'Chris', last: 'Lee', weeks: [3, 3, 3, 2, 2, 3, 2, 2, 2, 1, 2], daysSinceJoin: 80, current: 1 },
  hana: { first: 'Hana', last: 'Lin', weeks: [3, 2, 2, 1, 1, 0], daysSinceJoin: 45, current: 1 },
  sam: { first: 'Sam', last: 'Ortiz', weeks: [2, 1, 0], daysSinceJoin: 24, current: 1 },
}
