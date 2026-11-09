// Owner-only staff routes: /api/coaches and creating invites (POST /api/invites).
import { Hono } from 'hono'
import { requireOwner, newToken, sha256 } from '../auth.mjs'
import { readJson, text, fail, id as idOf, originOf } from '../http.mjs'
import { loadSummaries, gymToday } from '../queries.mjs'
import { inviteExpiresAt } from './auth.mjs'
import { lanAddresses } from './gym.mjs'
import { MSG } from '../messages.mjs'

export function staffRoutes(deps) {
  const { db, now, port, lan = lanAddresses } = deps
  const r = new Hono()
  r.use('/coaches', requireOwner)
  r.use('/coaches/*', requireOwner)

  r.get('/coaches', (c) => {
    const gym = c.get('gym')
    const list = loadSummaries(db, gym, c.get('user'), { today: gymToday(gym, now) })
    const staff = db.prepare(`SELECT * FROM users WHERE gym_id = ? ORDER BY role = 'owner' DESC, name, id`).all(gym.id)
    return c.json(staff.map((u) => {
      const mine = list.filter((s) => s.coachId === u.id)
      return {
        id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active,
        members: mine.length, slipping: mine.filter((s) => s.status === 'slipping').length,
      }
    }))
  })

  r.patch('/coaches/:id', async (c) => {
    const gym = c.get('gym')
    const target = db.prepare('SELECT * FROM users WHERE id = ? AND gym_id = ?').get(idOf(c.req.param('id')), gym.id)
    if (!target) fail(404, MSG.coachNotFound)
    const b = await readJson(c)
    if (typeof b.active !== 'boolean') fail(400, MSG.coachActive)
    if (target.role === 'owner') fail(400, MSG.ownerActive)
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(b.active ? 1 : 0, target.id)
    if (!b.active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id)
    return c.json({ id: target.id, name: target.name, email: target.email, role: target.role, active: b.active })
  })

  r.post('/invites', requireOwner, async (c) => {
    const b = await readJson(c)
    const name = text(b.name, { max: 80, message: MSG.coachName })
    const token = newToken()
    const t = now().toISOString()
    db.prepare(`INSERT INTO invites (token_hash, gym_id, role, name, created_by, created_at) VALUES (?, ?, 'coach', ?, ?, ?)`)
      .run(sha256(token), c.get('gym').id, name, c.get('user').id, t)
    // A coach opens this on a phone, so it uses the LAN address like the kiosk link; the request origin only when there is none.
    const [ip] = lan()
    const origin = ip ? `http://${ip}:${port}` : originOf(c)
    return c.json({ link: `${origin}/invite/${token}`, expiresAt: inviteExpiresAt(t) })
  })

  return r
}
