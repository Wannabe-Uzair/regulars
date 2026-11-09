// /api/today and /api/members.
import { Hono } from 'hono'
import { requireUser, requireOwner } from '../auth.mjs'
import { readJson, fail, id as idOf } from '../http.mjs'
import { kpis, boardOrder, slippingOrder, localDate, addDays, daysBetween, shortName, WINDOW_DAYS } from '../metrics.mjs'
import { loadSummaries, memberFor, memberScope, summaryOf, gymToday, cameBackStmt } from '../queries.mjs'
import { normalizePhone } from '../phone.mjs'
import { MSG } from '../messages.mjs'

const STATUSES = ['all', 'slipping', 'on', 'below', 'new']

export function memberRoutes(deps) {
  const { db, now, events } = deps
  const r = new Hono()
  r.use('/today', requireUser)
  r.use('/members', requireUser)
  r.use('/members/*', requireUser)

  r.get('/today', (c) => {
    const user = c.get('user')
    const gym = c.get('gym')
    const today = gymToday(gym, now)
    const list = loadSummaries(db, gym, user, { today })
    const weekAgo = new Date(now().getTime() - 7 * 86400000).toISOString()
    const nudged = user.role === 'owner'
      ? db.prepare('SELECT COUNT(*) AS n FROM nudges WHERE gym_id = ? AND sent_at >= ?').get(gym.id, weekAgo).n
      : db.prepare('SELECT COUNT(*) AS n FROM nudges WHERE gym_id = ? AND user_id = ? AND sent_at >= ?').get(gym.id, user.id, weekAgo).n
    const scope = memberScope(user)
    // Check-ins of the last 36 hours, kept if their gym-local date is today.
    const since = new Date(now().getTime() - 36 * 3600000).toISOString()
    const checkinsToday = db.prepare(
      `SELECT c.member_id, c.at, m.first_name, m.last_name FROM checkins c JOIN members m ON m.id = c.member_id
       WHERE ${scope.sql} AND c.at >= ? ORDER BY c.at DESC`,
    ).all(...scope.params, since)
      .filter((row) => localDate(row.at, gym.timezone) === today)
      .map((row) => ({ memberId: row.member_id, name: shortName(row.first_name, row.last_name), at: row.at }))
    return c.json({
      kpis: kpis(list, nudged),
      // The viewer's own members first (an owner who also coaches sees theirs at the top), then SPEC order.
      slipping: list.filter((s) => s.status === 'slipping')
        .sort((a, b) => (a.coachId !== user.id) - (b.coachId !== user.id) || slippingOrder(a, b)),
      checkinsToday,
      board: [...list].sort(boardOrder),
    })
  })

  r.get('/members', (c) => {
    const user = c.get('user')
    const gym = c.get('gym')
    const status = c.req.query('status') ?? 'all'
    if (!STATUSES.includes(status)) fail(400, MSG.statusFilter)
    const coach = c.req.query('coach')
    const q = (c.req.query('q') ?? '').trim().toLowerCase()
    let list = loadSummaries(db, gym, user, { today: gymToday(gym, now), all: c.req.query('all') === '1' })
    if (status !== 'all') list = list.filter((s) => s.status === status)
    if (coach) list = list.filter((s) => String(s.coachId) === coach)
    if (q) {
      const digits = q.replace(/\D/g, '')
      list = list.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || (digits.length >= 3 && (s.phone ?? '').includes(digits)))
    }
    list.sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName) || a.id - b.id)
    return c.json(list)
  })

  r.get('/members/:id', (c) => {
    const user = c.get('user')
    const gym = c.get('gym')
    const row = memberFor(db, user, idOf(c.req.param('id')))
    const today = gymToday(gym, now)
    const summary = summaryOf(db, gym, user, row.id, today)
    const checkins = db.prepare('SELECT at, source FROM checkins WHERE member_id = ? ORDER BY at DESC').all(row.id)
    const visited = new Set(checkins.map((ch) => localDate(ch.at, gym.timezone)))
    const days = Array.from({ length: WINDOW_DAYS }, (_, day) => {
      const date = addDays(row.joined_on, day)
      return { date, day, visited: visited.has(date) && daysBetween(date, today) >= 0 }
    })
    const came = cameBackStmt(db)
    const nudges = db.prepare(
      `SELECT n.id, n.sent_at, n.body, u.name AS by FROM nudges n LEFT JOIN users u ON u.id = n.user_id
       WHERE n.member_id = ? ORDER BY n.sent_at DESC`,
    ).all(row.id).map((n) => ({ id: n.id, at: n.sent_at, by: n.by, body: n.body, cameBack: came(row.id, n.sent_at) }))
    return c.json({
      member: { ...summary, email: row.email ?? null, source: row.source ?? null },
      days,
      checkins: checkins.map((ch) => ({ at: ch.at, source: ch.source })),
      nudges,
    })
  })

  r.patch('/members/:id', requireOwner, async (c) => {
    const user = c.get('user')
    const gym = c.get('gym')
    const row = memberFor(db, user, idOf(c.req.param('id')))
    const b = await readJson(c)
    // Check every field before writing any, so a refused field leaves the member exactly as it was.
    if ('coachId' in b && b.coachId !== null) {
      const coachId = idOf(b.coachId, { status: 400, message: MSG.coachChoice })
      const coach = db.prepare('SELECT id FROM users WHERE id = ? AND gym_id = ? AND active = 1').get(coachId, gym.id)
      if (!coach) fail(400, MSG.coachChoice)
    }
    let phone = null
    if ('phone' in b) {
      if (b.phone !== null && typeof b.phone !== 'string') fail(400, MSG.phone)
      phone = normalizePhone(b.phone)
      if (b.phone && b.phone.trim() && !phone) fail(400, MSG.phone)
      if (phone && db.prepare('SELECT 1 FROM members WHERE gym_id = ? AND phone = ? AND id != ?').get(gym.id, phone, row.id)) fail(409, MSG.duplicate)
    }
    if ('coachId' in b) db.prepare('UPDATE members SET coach_id = ? WHERE id = ?').run(b.coachId, row.id)
    if ('phone' in b) db.prepare('UPDATE members SET phone = ? WHERE id = ?').run(phone, row.id)
    events.emit(gym.id, 'member', { memberId: row.id })
    const fresh = db.prepare('SELECT email, source FROM members WHERE id = ?').get(row.id)
    return c.json({ member: { ...summaryOf(db, gym, user, row.id, gymToday(gym, now)), email: fresh.email ?? null, source: fresh.source ?? null } })
  })

  return r
}
