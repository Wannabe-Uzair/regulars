// GET /api/events: Server-Sent Events for signed-in users, scoped like the data (a coach only hears about their members).
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { requireUser } from '../auth.mjs'

export const PING_MS = 25000

/** (type, data) -> may `user` receive it? Owners get the whole gym; coaches only events about their own members. */
export function eventScope(db, user) {
  if (user.role === 'owner') return () => true
  const coachOf = db.prepare('SELECT coach_id FROM members WHERE id = ? AND gym_id = ?')
  return (type, data) => coachOf.get(data?.memberId ?? -1, user.gym_id)?.coach_id === user.id
}

export function eventRoutes({ db, events, pingMs = PING_MS }) {
  const r = new Hono()
  const userActive = db.prepare('SELECT active FROM users WHERE id = ?')
  r.get('/events', requireUser, (c) => {
    const user = c.get('user')
    const allowed = eventScope(db, user)
    // Re-checked on every event and ping: logging out, an expired session or deactivation closes the stream.
    // loadSession provides the session check; without one (a user set some other way) the user must still be active.
    const signedIn = c.get('signedIn') ?? (() => !!userActive.get(user.id)?.active)
    return streamSSE(c, async (stream) => {
      let unsubscribe = () => {}
      let ping
      let close
      const closed = new Promise((resolve) => {
        let done = false
        close = () => { if (done) return; done = true; unsubscribe(); clearInterval(ping); resolve() }
        stream.onAbort(close)
        c.req.raw.signal?.addEventListener('abort', close)
      })
      await stream.write(': connected\n\n')
      unsubscribe = events.subscribe(user.gym_id, (type, data) => {
        if (!signedIn()) return close()
        if (allowed(type, data)) stream.writeSSE({ event: type, data: JSON.stringify(data) }).catch(() => {})
      })
      ping = setInterval(() => {
        if (!signedIn()) return close()
        stream.write(': ping\n\n').catch(() => {})
      }, pingMs)
      await closed
    })
  })
  return r
}
