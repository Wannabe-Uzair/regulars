// /api/nudges: record a nudge sent from the coach's own phone, and the history.
import { Hono } from 'hono'
import { requireUser } from '../auth.mjs'
import { readJson, text, fail, id as idOf } from '../http.mjs'
import { shortName } from '../metrics.mjs'
import { memberFor, cameBackStmt } from '../queries.mjs'
import { MSG } from '../messages.mjs'

/** SPEC §5: 'sms:<E.164>?&body=<encoded>' (the ?& form works on iOS and Android); null without a phone. */
export const smsUrl = (phone, body) => (phone ? `sms:${phone}?&body=${encodeURIComponent(body)}` : null)

export function nudgeRoutes(deps) {
  const { db, now, events } = deps
  const r = new Hono()
  r.use('/nudges', requireUser)

  r.post('/nudges', async (c) => {
    const gym = c.get('gym')
    const user = c.get('user')
    const b = await readJson(c)
    const member = memberFor(db, user, idOf(b.memberId))
    const body = text(b.body, { max: 1000, message: MSG.messageBody })
    let templateId = null
    if (b.templateId !== undefined && b.templateId !== null) {
      templateId = idOf(b.templateId, { status: 400, message: MSG.templateNotFound })
      if (!db.prepare('SELECT 1 FROM templates WHERE id = ? AND gym_id = ?').get(templateId, gym.id)) fail(400, MSG.templateNotFound)
    }
    const at = now().toISOString()
    const res = db.prepare(
      `INSERT INTO nudges (gym_id, member_id, user_id, template_id, body, channel, sent_at) VALUES (?, ?, ?, ?, ?, 'own-phone', ?)`,
    ).run(gym.id, member.id, user.id, templateId, body, at)
    events.emit(gym.id, 'nudge', { memberId: member.id })
    return c.json({ nudge: { id: Number(res.lastInsertRowid), at, body }, smsUrl: smsUrl(member.phone, body) })
  })

  r.get('/nudges', (c) => {
    const gym = c.get('gym')
    const user = c.get('user')
    const raw = Number(c.req.query('days') ?? 30)
    const days = Number.isFinite(raw) ? Math.min(Math.max(Math.round(raw), 1), 365) : 30
    const since = new Date(now().getTime() - days * 86400000).toISOString()
    const own = user.role === 'owner' ? '' : 'AND n.user_id = ? AND m.coach_id = ?'
    const rows = db.prepare(
      `SELECT n.id, n.sent_at, n.member_id, n.body, m.first_name, m.last_name, u.name AS by
       FROM nudges n JOIN members m ON m.id = n.member_id LEFT JOIN users u ON u.id = n.user_id
       WHERE n.gym_id = ? AND n.sent_at >= ? ${own} ORDER BY n.sent_at DESC, n.id DESC`,
    ).all(gym.id, since, ...(own ? [user.id, user.id] : []))
    const came = cameBackStmt(db)
    return c.json(rows.map((n) => ({
      id: n.id, at: n.sent_at, memberId: n.member_id, memberName: shortName(n.first_name, n.last_name), by: n.by, body: n.body,
      cameBack: came(n.member_id, n.sent_at),
    })))
  })

  return r
}
