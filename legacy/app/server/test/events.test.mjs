import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serve } from '@hono/node-server'
import { makeWorld, call, HOST } from './fixtures.mjs'
import { createEventBus } from '../events.mjs'
import { openDb } from '../db.mjs'
import { createApp } from '../app.mjs'

/** Read an SSE body until `pred(text)` holds (or time out). */
async function readUntil(reader, pred, ms = 2000) {
  const dec = new TextDecoder()
  let text = ''
  const deadline = Date.now() + ms
  while (!pred(text)) {
    if (Date.now() > deadline) throw new Error(`timed out; got: ${text}`)
    const { value, done } = await Promise.race([reader.read(), new Promise((r) => setTimeout(() => r({ value: undefined }), deadline - Date.now()))])
    if (done) break
    if (value) text += dec.decode(value, { stream: true })
  }
  return text
}

const open = async (w, cookie) => {
  const res = await w.app.request(`http://${HOST}/api/events`, { headers: { host: HOST, cookie } })
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/event-stream/)
  return res.body.getReader()
}

test("a coach hears check-ins of their own members only; the owner hears everyone's", async () => {
  const w = await makeWorld()
  const mine = w.addMember({ first: 'Mine', coachId: w.coach.id, phone: '+13125550111', daysSinceJoin: 10 })
  w.addMember({ first: 'Theirs', coachId: w.coach2.id, phone: '+13125550122', daysSinceJoin: 10 })
  const coach = await open(w, await w.login(w.coach.email))
  const owner = await open(w, await w.login(w.owner.email))
  await readUntil(coach, (t) => t.includes(': connected'))
  await readUntil(owner, (t) => t.includes(': connected'))
  await call(w.app, 'POST', '/api/kiosk/kiosk-token-1/checkin', { body: { phone: '3125550122' } }) // Theirs
  await call(w.app, 'POST', '/api/kiosk/kiosk-token-1/checkin', { body: { phone: '3125550111' } }) // Mine
  const heard = await readUntil(coach, (t) => t.includes('Mine'))
  assert.ok(!heard.includes('Theirs'), heard)
  assert.match(heard, new RegExp(`event: checkin\ndata: \\{"memberId":${mine},"name":"Mine T.","at":"[^"]+"\\}`))
  const all = await readUntil(owner, (t) => t.includes('Mine'))
  assert.ok(all.indexOf('Theirs') < all.indexOf('Mine') && all.includes('Theirs'))
  await coach.cancel()
  await owner.cancel()
  assert.equal((await call(w.app, 'GET', '/api/events')).status, 401)
})

test('live SSE over a real port: events arrive, pings keep it open, and disconnecting unsubscribes', async () => {
  const db = openDb(':memory:')
  const bus = createEventBus()
  let subs = 0
  const events = { emit: bus.emit, subscribe: (g, fn) => { subs++; const off = bus.subscribe(g, fn); return () => { subs--; off() } } }
  const w = await makeWorld()
  void db
  const app = createApp({ db: w.db, now: () => new Date(), events })
  const server = await new Promise((resolve) => { const s = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, () => resolve(s)) })
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: w.owner.email, password: 'correct-horse-battery' }) })
    const cookie = login.headers.get('set-cookie').split(';')[0]
    const ac = new AbortController()
    const res = await fetch(`${base}/api/events`, { headers: { cookie }, signal: ac.signal })
    const reader = res.body.getReader()
    await readUntil(reader, (t) => t.includes(': connected'))
    assert.equal(subs, 1)
    const join = await fetch(`${base}/api/kiosk/kiosk-token-1/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ firstName: 'Live' }) })
    assert.equal(join.status, 200)
    const text = await readUntil(reader, (t) => t.includes('event: checkin'))
    assert.match(text, /event: member\ndata: \{"memberId":\d+\}/)
    assert.match(text, /event: checkin\ndata: \{"memberId":\d+,"name":"Live","at":/)
    ac.abort()
    for (let i = 0; i < 50 && subs > 0; i++) await new Promise((r) => setTimeout(r, 20))
    assert.equal(subs, 0)
  } finally {
    server.close()
  }
})

test('the stream sends a ": ping" comment on its interval', async () => {
  const { Hono } = await import('hono')
  const { eventRoutes } = await import('../routes/events.mjs')
  const w = await makeWorld()
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('user', { id: w.owner.id, gym_id: w.gymId, role: 'owner' }); await next() })
  app.route('/api', eventRoutes({ db: w.db, events: createEventBus(), pingMs: 20 }))
  const res = await app.request('http://x/api/events')
  const reader = res.body.getReader()
  assert.match(await readUntil(reader, (t) => t.includes(': ping')), /: ping\n\n/)
  await reader.cancel()
})
