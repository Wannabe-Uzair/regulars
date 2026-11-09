// The Northside Strength demo gym (SPEC §8). `npm run seed` recreates the database at TENURE_DB or data/tenure.db.
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openDb, tx, DEFAULT_DB_FILE } from './db.mjs'
import { hashPassword, newToken } from './auth.mjs'
import { todayIn } from './metrics.mjs'
import { buildNorthside, DEMO_PASSWORD } from './seed/northside.mjs'

export const SEED_TIMEZONE = 'America/Chicago'
export { DEMO_PASSWORD }

/** Insert Northside into an empty schema. Returns { gymId, kioskToken, users: [{id, key, email, name, role}], ids: Map(memberKey -> id) }. */
export async function seedNorthside(db, { timezone = SEED_TIMEZONE, now = new Date(), today = todayIn(timezone, now) } = {}) {
  const data = buildNorthside({ today, timezone })
  const hashes = await Promise.all(data.users.map(() => hashPassword(DEMO_PASSWORD)))
  const t = now.toISOString()
  const kioskToken = newToken()
  return tx(db, () => {
    const g = data.gym
    const gymId = Number(db.prepare(
      `INSERT INTO gyms (name, slug, timezone, is_demo, pilot_started_on, plan, kiosk_token, created_at) VALUES (?, ?, ?, 1, ?, 'pilot', ?, ?)`,
    ).run(g.name, g.slug, g.timezone, g.pilotStartedOn, kioskToken, t).lastInsertRowid)
    const userIds = new Map()
    const users = data.users.map((u, i) => {
      const id = Number(db.prepare(
        `INSERT INTO users (gym_id, email, name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      ).run(gymId, u.email, u.name, u.role, hashes[i], t).lastInsertRowid)
      userIds.set(u.key, id)
      return { id, key: u.key, email: u.email, name: u.name, role: u.role }
    })
    const addTpl = db.prepare('INSERT INTO templates (gym_id, name, body, sort, updated_at) VALUES (?, ?, ?, ?, ?)')
    const templateIds = data.templates.map((tp) => Number(addTpl.run(gymId, tp.name, tp.body, tp.sort, t).lastInsertRowid))
    const addMember = db.prepare(
      `INSERT INTO members (gym_id, first_name, last_name, phone, email, joined_on, coach_id, external_id, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'seed', ?)`,
    )
    const ids = new Map()
    for (const m of data.members) {
      ids.set(m.key, Number(addMember.run(gymId, m.firstName, m.lastName, m.phone || null, m.email || null, m.joinedOn,
        userIds.get(m.coachKey), m.externalId, t).lastInsertRowid))
    }
    const addCheckin = db.prepare(`INSERT INTO checkins (gym_id, member_id, at, source) VALUES (?, ?, ?, 'seed')`)
    for (const c of data.checkins) addCheckin.run(gymId, ids.get(c.memberKey), c.at)
    const addNudge = db.prepare(
      `INSERT INTO nudges (gym_id, member_id, user_id, template_id, body, channel, sent_at) VALUES (?, ?, ?, ?, ?, 'own-phone', ?)`,
    )
    for (const n of data.nudges) {
      addNudge.run(gymId, ids.get(n.memberKey), userIds.get(n.userKey), templateIds[n.templateIndex] ?? null, n.body, n.sentAt)
    }
    return { gymId, kioskToken, users, ids, data }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.env.TENURE_DB || DEFAULT_DB_FILE
  // The demo gym runs on this computer's clock, so "today" and every check-in time match the room at the stall.
  // TENURE_TZ overrides it with any IANA zone name (for example America/Chicago).
  const timezone = process.env.TENURE_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || SEED_TIMEZONE
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }) } catch {
    console.error(`"${timezone}" is not a time zone name. Set TENURE_TZ to one like America/Chicago.`)
    process.exit(1)
  }
  for (const f of [file, `${file}-wal`, `${file}-shm`]) rmSync(f, { force: true })
  const db = openDb(file)
  const { kioskToken, users, data } = await seedNorthside(db, { timezone })
  db.close()
  console.log(`Seeded ${data.gym.name} into ${file}: ${data.members.length} members, ${data.checkins.length} check-ins, ${data.nudges.length} nudges.`)
  console.log(process.env.TENURE_TZ ? `Time zone: ${timezone} (from TENURE_TZ).` : `Time zone: ${timezone}, this computer's (set TENURE_TZ to use another).`)
  console.log('Logins (password for all three):', DEMO_PASSWORD)
  for (const u of users) console.log(`  ${u.email.padEnd(24)} ${u.name} (${u.role})`)
  console.log(`Kiosk: /kiosk/${kioskToken}`)
}
