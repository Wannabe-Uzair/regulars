// /api/templates (everyone reads, owner edits) and /api/templates/render.
import { Hono } from 'hono'
import { requireUser, requireOwner } from '../auth.mjs'
import { readJson, text, fail, id as idOf } from '../http.mjs'
import { renderTemplate, progress, daysBetween } from '../metrics.mjs'
import { memberFor, gymToday } from '../queries.mjs'
import { MSG } from '../messages.mjs'

const json = (t) => ({ id: t.id, name: t.name, body: t.body })
const nameOf = (v) => text(v, { max: 60, message: MSG.templateName })
const bodyOf = (v) => text(v, { max: 1000, message: MSG.messageBody })

/** Variables of SPEC §5 for one member and the sending user. {days} falls back to days since joining if never visited. */
export function templateVars(db, gym, user, member, today) {
  const checkinAts = db.prepare('SELECT at FROM checkins WHERE member_id = ?').all(member.id).map((r) => r.at)
  const p = progress({ joinedOn: member.joined_on, checkinAts, today, timeZone: gym.timezone })
  return {
    first: member.first_name,
    coach: String(user.name ?? '').trim().split(/\s+/)[0],
    gym: gym.name,
    days: p.daysSinceLastVisit ?? Math.max(0, daysBetween(member.joined_on, today)),
  }
}

export function templateRoutes(deps) {
  const { db, now } = deps
  const r = new Hono()
  r.use('/templates', requireUser)
  r.use('/templates/*', requireUser)
  const find = (gymId, tid) => {
    const t = db.prepare('SELECT * FROM templates WHERE id = ? AND gym_id = ?').get(tid, gymId)
    if (!t) fail(404, MSG.templateNotFound)
    return t
  }

  r.get('/templates', (c) =>
    c.json(db.prepare('SELECT * FROM templates WHERE gym_id = ? ORDER BY sort, id').all(c.get('gym').id).map(json)))

  r.post('/templates/render', async (c) => {
    const gym = c.get('gym')
    const user = c.get('user')
    const b = await readJson(c)
    const member = memberFor(db, user, idOf(b.memberId))
    let body
    if (b.body !== undefined && b.body !== null) body = bodyOf(b.body)
    else if (b.templateId !== undefined && b.templateId !== null) body = find(gym.id, idOf(b.templateId)).body
    else fail(400, MSG.templateChoice)
    return c.json({ body: renderTemplate(body, templateVars(db, gym, user, member, gymToday(gym, now))) })
  })

  r.post('/templates', requireOwner, async (c) => {
    const b = await readJson(c)
    const gymId = c.get('gym').id
    const sort = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM templates WHERE gym_id = ?').get(gymId).s
    const res = db.prepare('INSERT INTO templates (gym_id, name, body, sort, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(gymId, nameOf(b.name), bodyOf(b.body), sort, now().toISOString())
    return c.json(json(find(gymId, Number(res.lastInsertRowid))), 201)
  })

  r.patch('/templates/:id', requireOwner, async (c) => {
    const gymId = c.get('gym').id
    const t = find(gymId, idOf(c.req.param('id')))
    const b = await readJson(c)
    const name = b.name === undefined ? t.name : nameOf(b.name)
    const body = b.body === undefined ? t.body : bodyOf(b.body)
    db.prepare('UPDATE templates SET name = ?, body = ?, updated_at = ? WHERE id = ?').run(name, body, now().toISOString(), t.id)
    return c.json(json(find(gymId, t.id)))
  })

  r.delete('/templates/:id', requireOwner, (c) => {
    const t = find(c.get('gym').id, idOf(c.req.param('id')))
    db.prepare('DELETE FROM templates WHERE id = ?').run(t.id)
    return c.json({ ok: true })
  })

  return r
}
