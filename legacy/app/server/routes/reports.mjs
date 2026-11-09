// GET /api/reports (owner): SPEC §6 Reports, computed by reports/reports.mjs from this gym's rows.
import { Hono } from 'hono'
import { requireOwner } from '../auth.mjs'
import { gymToday } from '../queries.mjs'
import { buildReports } from '../reports/reports.mjs'

export function reportRoutes({ db, now }) {
  const r = new Hono()
  r.get('/reports', requireOwner, (c) => {
    const gym = c.get('gym')
    const members = db.prepare('SELECT id, joined_on AS joinedOn FROM members WHERE gym_id = ?').all(gym.id)
    const checkins = db.prepare('SELECT member_id AS memberId, at FROM checkins WHERE gym_id = ?').all(gym.id)
    const nudges = db.prepare('SELECT member_id AS memberId, sent_at AS sentAt FROM nudges WHERE gym_id = ?').all(gym.id)
    const t = now()
    return c.json(buildReports({ today: gymToday(gym, () => t), now: t.toISOString(), timezone: gym.timezone, members, checkins, nudges }))
  })
  return r
}
