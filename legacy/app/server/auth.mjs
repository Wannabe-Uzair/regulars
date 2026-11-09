// Passwords (scrypt), sessions (cookie token, SHA-256 stored), role middleware, login rate limit, CSRF guard.
import { scrypt as scryptCb, randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { getConnInfo } from '@hono/node-server/conninfo'
import { fail } from './http.mjs'
import { MSG } from './messages.mjs'

const scrypt = (pw, salt, keylen, opts) =>
  new Promise((resolve, reject) => scryptCb(pw, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))))

const SCRYPT = { N: 16384, r: 8, p: 1 }
const KEYLEN = 32

/** 'scrypt$N$r$p$salt$hash' (salt and hash base64url). */
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password, salt, KEYLEN, SCRYPT)
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : []
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [N, r, p] = parts.slice(1, 4).map(Number)
  const salt = Buffer.from(parts[4], 'base64url')
  const expected = Buffer.from(parts[5], 'base64url')
  if (!expected.length) return false
  const key = await scrypt(String(password), salt, expected.length, { N, r, p, maxmem: 256 * N * r })
  return timingSafeEqual(key, expected)
}

export const sha256 = (s) => createHash('sha256').update(s).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

export const SESSION_COOKIE = 'tenure_session'
const SESSION_DAYS = 30

export const userJson = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })
export const gymJson = (g) => ({
  id: g.id, name: g.name, slug: g.slug, isDemo: !!g.is_demo, timezone: g.timezone, plan: g.plan, pilotStartedOn: g.pilot_started_on,
})

/** Create a session for userId, set the cookie, and return the token. */
export function startSession(c, { db, now }, userId) {
  const token = newToken()
  const t = now()
  const expires = new Date(t.getTime() + SESSION_DAYS * 86400000)
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), userId, t.toISOString(), expires.toISOString())
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: SESSION_DAYS * 86400 })
  return token
}

export function endSession(c, { db }) {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

/** Middleware: if the cookie names a live session of an active user, sets c.var.user and c.var.gym. */
export function loadSession({ db, now }) {
  const find = db.prepare(`SELECT s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`)
  const gymById = db.prepare('SELECT * FROM gyms WHERE id = ?')
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) {
      const hash = sha256(token)
      const row = find.get(hash)
      if (row && row.expires_at <= now().toISOString()) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash)
      else if (row && row.active) {
        c.set('user', row)
        c.set('gym', gymById.get(row.gym_id))
        // For long-lived responses (the event stream): is this session still live for this active user?
        c.set('signedIn', () => {
          const live = find.get(hash)
          return !!live && !!live.active && live.id === row.id && live.expires_at > now().toISOString()
        })
      }
    }
    await next()
  }
}

export const requireUser = async (c, next) => {
  if (!c.get('user')) fail(401, MSG.signIn)
  await next()
}

export const requireOwner = async (c, next) => {
  if (!c.get('user')) fail(401, MSG.signIn)
  if (c.get('user').role !== 'owner') fail(403, MSG.role)
  await next()
}

/** Best-effort client IP (absent when the app is called without a socket, as in tests). */
export function clientIp(c) {
  try { return getConnInfo(c).remote.address ?? 'local' } catch { return 'local' }
}

/**
 * Attempts per key (login: IP + email; sign-up: IP): `limit` per `windowMs`. Record an attempt with fail() before
 * the slow work, so parallel requests can't all slip past blocked(); a good login clears the count.
 * Keys whose window has passed are dropped, at most once per window.
 */
export function createLoginLimiter({ now, limit = 10, windowMs = 10 * 60 * 1000 }) {
  const fails = new Map() // key -> [ms]
  let swept = now().getTime()
  const recent = (key) => (fails.get(key) ?? []).filter((t) => t > now().getTime() - windowMs)
  const sweep = () => {
    const t = now().getTime()
    if (t - swept < windowMs) return
    swept = t
    for (const [key, times] of fails) if (times.every((x) => x <= t - windowMs)) fails.delete(key)
  }
  return {
    blocked(key) { sweep(); return recent(key).length >= limit },
    fail(key) { sweep(); fails.set(key, [...recent(key), now().getTime()]) },
    clear(key) { fails.delete(key) },
    get size() { return fails.size },
  }
}

// A real scrypt hash of a random password: logins for unknown or inactive emails verify against it, so they take
// as long as a wrong password for a real account.
let dummyHash
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('base64url')))

/**
 * CSRF guard for /api mutations: the body must be declared JSON (a cross-site form can't send that without CORS),
 * and an Origin header, when present, must match the host the request was sent to.
 */
export const csrfGuard = async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const type = (c.req.header('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (type !== 'application/json') fail(400, MSG.json)
    const origin = c.req.header('origin')
    if (origin !== undefined) {
      let host
      try { host = new URL(origin).host } catch { host = null }
      const allowed = [c.req.header('host'), c.req.header('x-forwarded-host')].filter(Boolean)
      if (!host || !allowed.includes(host)) fail(403, MSG.crossSite)
    }
  }
  await next()
}
