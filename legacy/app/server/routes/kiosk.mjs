// /api/kiosk/:token/* (SPEC §6 Kiosk): no login, authorised by the gym's kiosk_token; 30 requests a minute per IP.
import { Hono } from 'hono'
import { clientIp, createLoginLimiter } from '../auth.mjs'
import { readJson, text, fail, id as idOf } from '../http.mjs'
import { tx } from '../db.mjs'
import { progress, localDate, addDays, shortName } from '../metrics.mjs'
import { gymToday } from '../queries.mjs'
import { normalizePhone } from '../phone.mjs'
import { MSG } from '../messages.mjs'

export const KIOSK_LIMIT = 30
const HOUR = 3600000

export function kioskRoutes({ db, now, events }) {
  const limiter = createLoginLimiter({ now, limit: KIOSK_LIMIT, windowMs: 60000 })
  const r = new Hono()
  const gymByToken = db.prepare('SELECT * FROM gyms WHERE kiosk_token = ?')

  const guard = async (c, next) => {
    const ip = clientIp(c)
    if (limiter.blocked(ip)) fail(429, MSG.kioskTooMany)
    limiter.fail(ip) // counts every request, not only failures
    const gym = gymByToken.get(c.req.param('token'))
    if (!gym) fail(404, MSG.linkInvalid)
    c.set('kioskGym', gym)
    await next()
  }
  r.use('/kiosk/:token/*', guard) // also matches /kiosk/:token itself

  /** What the kiosk's welcome needs (COPY §14): day index today, week index, visits in the current week, status. */
  const welcome = (gym, m) => {
    const today = gymToday(gym, now)
    const ats = db.prepare('SELECT at FROM checkins WHERE member_id = ?').all(m.id).map((x) => x.at)
    const p = progress({ joinedOn: m.joined_on, checkinAts: ats, today, timeZone: gym.timezone })
    const weekStart = addDays(m.joined_on, Math.floor(p.daysSinceJoin / 7) * 7)
    const visitsThisWeek = new Set(ats.map((at) => localDate(at, gym.timezone)).filter((d) => d >= weekStart && d <= today)).size
    return { firstName: m.first_name, week: p.week, day: p.daysSinceJoin, visitsThisWeek, status: p.status }
  }

  const checkIn = (gym, m) => {
    const t = now()
    const recent = db.prepare('SELECT 1 FROM checkins WHERE member_id = ? AND at > ? AND at <= ? LIMIT 1')
      .get(m.id, new Date(t.getTime() - HOUR).toISOString(), t.toISOString())
    if (recent) return false // already checked in within the hour: welcome them, store nothing
    const at = t.toISOString()
    db.prepare(`INSERT INTO checkins (gym_id, member_id, at, source) VALUES (?, ?, ?, 'kiosk')`).run(gym.id, m.id, at)
    return at
  }
  const emitCheckin = (gym, m, at) => events.emit(gym.id, 'checkin', { memberId: m.id, name: shortName(m.first_name, m.last_name), at })

  r.get('/kiosk/:token', (c) => {
    const gym = c.get('kioskGym')
    return c.json({ gymName: gym.name, isDemo: !!gym.is_demo })
  })

  r.post('/kiosk/:token/checkin', async (c) => {
    const gym = c.get('kioskGym')
    const b = await readJson(c)
    let m
    if (b.memberId !== undefined && b.memberId !== null) {
      m = db.prepare('SELECT * FROM members WHERE id = ? AND gym_id = ?').get(idOf(b.memberId, { message: MSG.memberNotFound }), gym.id)
      if (!m) fail(404, MSG.memberNotFound)
    } else if (typeof b.phone === 'string') {
      const phone = normalizePhone(b.phone)
      if (!phone) fail(400, MSG.phone)
      m = db.prepare('SELECT * FROM members WHERE phone = ? AND gym_id = ? ORDER BY id DESC').get(phone, gym.id)
      if (!m) fail(404, MSG.kioskNotFound)
    } else fail(400, MSG.generic)
    const at = checkIn(gym, m)
    if (at) emitCheckin(gym, m, at)
    return c.json(welcome(gym, m))
  })

  r.get('/kiosk/:token/search', (c) => {
    const gym = c.get('kioskGym')
    const q = (c.req.query('q') ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
    if (!q) return c.json([])
    const rows = db.prepare('SELECT id, first_name, last_name FROM members WHERE gym_id = ? ORDER BY first_name, last_name, id').all(gym.id)
    const hits = rows.filter((m) => {
      const name = shortName(m.first_name, m.last_name).toLowerCase()
      return name.startsWith(q) || String(m.first_name).toLowerCase().startsWith(q)
    })
    return c.json(hits.slice(0, 6).map((m) => ({ memberId: m.id, name: shortName(m.first_name, m.last_name) })))
  })

  r.post('/kiosk/:token/join', async (c) => {
    const gym = c.get('kioskGym')
    const b = await readJson(c)
    const firstName = text(b.firstName, { max: 40, message: MSG.kioskFirstName })
    const lastRaw = typeof b.lastName === 'string' ? b.lastName.trim() : b.lastName
    const lastName = lastRaw === undefined || lastRaw === null || lastRaw === '' ? null : text(lastRaw, { max: 40, message: MSG.generic })
    let phone = null
    if (b.phone !== undefined && b.phone !== null && b.phone !== '') {
      phone = typeof b.phone === 'string' ? normalizePhone(b.phone) : null
      if (!phone) fail(400, MSG.phone)
      if (db.prepare('SELECT 1 FROM members WHERE gym_id = ? AND phone = ?').get(gym.id, phone)) fail(409, MSG.duplicate)
    }
    const t = now().toISOString()
    const m = tx(db, () => {
      // Round-robin: the active staff member after the one who got the most recent member.
      const staff = db.prepare('SELECT id FROM users WHERE gym_id = ? AND active = 1 ORDER BY id').all(gym.id).map((u) => u.id)
      const last = db.prepare('SELECT coach_id FROM members WHERE gym_id = ? AND coach_id IS NOT NULL ORDER BY id DESC LIMIT 1').get(gym.id)
      const coachId = staff.length ? staff[(staff.indexOf(last?.coach_id ?? -1) + 1) % staff.length] : null
      const id = Number(db.prepare(
        `INSERT INTO members (gym_id, first_name, last_name, phone, joined_on, coach_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, 'kiosk', ?)`,
      ).run(gym.id, firstName, lastName, phone, gymToday(gym, now), coachId, t).lastInsertRowid)
      const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id)
      row.checkedInAt = checkIn(gym, row)
      return row
    })
    events.emit(gym.id, 'member', { memberId: m.id })
    emitCheckin(gym, m, m.checkedInAt)
    return c.json(welcome(gym, m))
  })

  return r
}
