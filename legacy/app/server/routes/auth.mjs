// /api/auth/* and the public side of invites (/api/invites/:token).
import { Hono } from 'hono'
import { readJson, text, email as emailOf, password as passwordOf, fail } from '../http.mjs'
import {
  hashPassword, verifyPassword, startSession, endSession, userJson, gymJson, newToken, sha256, clientIp,
  createLoginLimiter, requireUser, dummyPasswordHash,
} from '../auth.mjs'
import { tx } from '../db.mjs'
import { todayIn } from '../metrics.mjs'
import { DEFAULT_TEMPLATES } from '../templates.mjs'
import { MSG } from '../messages.mjs'

export const INVITE_DAYS = 7
export const inviteExpiresAt = (createdAt) => new Date(Date.parse(createdAt) + INVITE_DAYS * 86400000).toISOString()

const DEFAULT_TZ = 'America/Chicago'
export const SIGNUPS_PER_WINDOW = 5

function slugify(name) {
  const s = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return s || 'gym'
}

export function authRoutes(deps) {
  const { db, now } = deps
  const limiter = createLoginLimiter({ now })
  const signupLimiter = createLoginLimiter({ now, limit: SIGNUPS_PER_WINDOW }) // per IP, per 10 minutes
  const r = new Hono()
  const userByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
  const gymById = db.prepare('SELECT * FROM gyms WHERE id = ?')

  r.post('/auth/signup', async (c) => {
    const b = await readJson(c)
    const gymName = text(b.gymName, { max: 80, message: MSG.gymName })
    const name = text(b.name, { max: 80, message: MSG.yourName })
    const email = emailOf(b.email)
    const pw = passwordOf(b.password)
    const ip = clientIp(c)
    if (signupLimiter.blocked(ip)) fail(429, MSG.signupTooMany)
    signupLimiter.fail(ip)
    if (userByEmail.get(email)) fail(409, MSG.duplicate) // before the hash, so a duplicate costs no scrypt
    const hash = await hashPassword(pw)
    const t = now().toISOString()
    const userId = tx(db, () => {
      if (userByEmail.get(email)) fail(409, MSG.duplicate) // the same email may have signed up while we hashed
      const base = slugify(gymName)
      let slug = base
      for (let i = 2; db.prepare('SELECT 1 FROM gyms WHERE slug = ?').get(slug); i++) slug = `${base}-${i}`
      const gymId = Number(db.prepare(
        `INSERT INTO gyms (name, slug, timezone, is_demo, pilot_started_on, plan, kiosk_token, created_at)
         VALUES (?, ?, ?, 0, ?, 'pilot', ?, ?)`,
      ).run(gymName, slug, DEFAULT_TZ, todayIn(DEFAULT_TZ, now()), newToken(), t).lastInsertRowid)
      const uid = Number(db.prepare(
        `INSERT INTO users (gym_id, email, name, role, password_hash, active, created_at) VALUES (?, ?, ?, 'owner', ?, 1, ?)`,
      ).run(gymId, email, name, hash, t).lastInsertRowid)
      const addTpl = db.prepare('INSERT INTO templates (gym_id, name, body, sort, updated_at) VALUES (?, ?, ?, ?, ?)')
      DEFAULT_TEMPLATES.forEach((tpl, i) => addTpl.run(gymId, tpl.name, tpl.body, i + 1, t))
      return uid
    })
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    startSession(c, deps, userId)
    return c.json({ user: userJson(user), gym: gymJson(gymById.get(user.gym_id)) })
  })

  r.post('/auth/login', async (c) => {
    const b = await readJson(c)
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
    const key = `${clientIp(c)}|${email}`
    // Count the attempt before the slow verify, so parallel tries can't all get past blocked().
    if (limiter.blocked(key)) fail(429, MSG.loginTooMany)
    limiter.fail(key)
    const user = email ? userByEmail.get(email) : null
    const real = user && user.active && typeof b.password === 'string'
    // An unknown email still costs one scrypt, so timing doesn't reveal which emails exist.
    const verified = await verifyPassword(real ? b.password : '', real ? user.password_hash : await dummyPasswordHash())
    if (!(real && verified)) fail(401, MSG.loginMismatch)
    limiter.clear(key)
    startSession(c, deps, user.id)
    return c.json({ user: userJson(user), gym: gymJson(gymById.get(user.gym_id)) })
  })

  r.post('/auth/logout', (c) => {
    endSession(c, deps)
    return c.json({ ok: true })
  })

  r.get('/auth/me', requireUser, (c) => c.json({ user: userJson(c.get('user')), gym: gymJson(c.get('gym')) }))

  // Public invite lookups. An invite is good for one use within INVITE_DAYS.
  const liveInvite = (token) => {
    const inv = db.prepare('SELECT * FROM invites WHERE token_hash = ?').get(sha256(String(token)))
    if (!inv || inv.used_at || inviteExpiresAt(inv.created_at) <= now().toISOString()) {
      fail(404, MSG.linkInvalid)
    }
    return inv
  }

  r.get('/invites/:token', (c) => {
    const inv = liveInvite(c.req.param('token'))
    return c.json({ gymName: gymById.get(inv.gym_id).name, name: inv.name, role: inv.role })
  })

  r.post('/invites/:token/accept', async (c) => {
    const b = await readJson(c)
    const name = text(b.name, { max: 80, message: MSG.yourName })
    const email = emailOf(b.email)
    const password = passwordOf(b.password)
    const inv = liveInvite(c.req.param('token'))
    const hash = await hashPassword(password)
    if (userByEmail.get(email)) fail(409, MSG.duplicate)
    const t = now().toISOString()
    const userId = tx(db, () => {
      const used = db.prepare('UPDATE invites SET used_at = ? WHERE token_hash = ? AND used_at IS NULL').run(t, inv.token_hash)
      if (used.changes !== 1) fail(404, MSG.linkInvalid)
      return Number(db.prepare(
        `INSERT INTO users (gym_id, email, name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      ).run(inv.gym_id, email, name, inv.role, hash, t).lastInsertRowid)
    })
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    startSession(c, deps, userId)
    return c.json({ user: userJson(user), gym: gymJson(gymById.get(user.gym_id)) })
  })

  return r
}
