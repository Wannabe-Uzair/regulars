import { serve } from '@hono/node-server'
import type { LiveEvent } from '@tenure/contracts'
import { createDb, createRepositories } from '@tenure/db'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, test } from 'vitest'
import { createApp } from '../../app.ts'
import { sha256 } from '../../platform/auth/token.ts'
import { TEST_NOW, type AppContext } from '../../platform/context.ts'
import { createEventBus, type EventBus } from '../../platform/events.ts'
import { createStopSignal, gracefulStop } from '../../platform/shutdown.ts'
import { call, cookieOf } from '../../test/http.ts'
import { openStream, readToEnd, readUntil } from '../../test/sse.ts'
import { makeWorld, PASSWORD, type World } from '../../test/world.ts'
import { defaultModules } from '../index.ts'
import { createRealtimeModule } from './index.ts'

const at = TEST_NOW.toISOString()
const checkin = (w: World, memberId: number, coachId: number | null, name: string): LiveEvent => ({
  type: 'checkin.recorded',
  gymId: w.gym.id,
  memberId,
  coachId,
  name,
  at,
})
const frame = (event: LiveEvent) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
/** The memberIds of the events in an SSE text, in order. */
const heardIds = (text: string) =>
  [...text.matchAll(/^data: (.*)$/gm)].map((m) => (JSON.parse(m[1] ?? '') as { memberId?: number }).memberId)

/** A bus that counts its live subscriptions. */
function countingBus() {
  const bus = createEventBus()
  const counted = {
    subs: 0,
    publish: bus.publish,
    subscribe(handler) {
      counted.subs++
      const off = bus.subscribe(handler)
      return () => {
        counted.subs--
        off()
      }
    },
  } satisfies EventBus & { subs: number }
  return counted
}

const until = async (cond: () => boolean) => {
  for (let i = 0; i < 100 && !cond(); i++) await new Promise((r) => setTimeout(r, 10))
}

/** The world's app with the stream's heartbeat at 20 ms. */
const withFastHeartbeat = (w: World) =>
  createApp(w.ctx, [...defaultModules.filter((m) => m.name !== 'realtime'), createRealtimeModule({ heartbeatMs: 20 })])

const tokenHashOf = (cookie: string) => sha256(cookie.slice(cookie.indexOf('=') + 1))

describe('GET /api/events', () => {
  test("a coach hears events about their own members only; the owner hears everyone's", async () => {
    const w = await makeWorld()
    const coach = await openStream(w.app, await w.login(w.coach.email))
    const owner = await openStream(w.app, await w.login(w.owner.email))
    const theirs = checkin(w, 2, w.coach2.id, 'Theirs J.')
    const mine = checkin(w, 1, w.coach.id, 'Mine T.')
    w.ctx.bus.publish(theirs)
    w.ctx.bus.publish(mine)
    const heard = await readUntil(coach, (t) => t.includes('Mine'))
    expect(heard).not.toContain('Theirs')
    expect(heard).toContain(frame(mine))
    const all = await readUntil(owner, (t) => t.includes('Mine'))
    expect(all).toContain(frame(theirs) + frame(mine))
    await coach.cancel()
    await owner.cancel()
    expect((await call(w.app, 'GET', '/api/events')).status).toBe(401)
  })

  test("the scope: an owner hears their whole gym, a coach their own members, nobody another gym's", async () => {
    const w = await makeWorld()
    const signup = await call(w.app, 'POST', '/api/auth/signup', {
      body: { gymName: 'Southside Iron', name: 'Ana Ruiz', email: 'ana@southside.test', password: PASSWORD, country: 'US' },
    })
    expect(signup.status).toBe(200)
    const otherGymId = (signup.body as { gym: { id: number } }).gym.id
    const streams = {
      owner: await openStream(w.app, await w.login(w.owner.email)),
      coach: await openStream(w.app, await w.login(w.coach.email)),
      coach2: await openStream(w.app, await w.login(w.coach2.email)),
      other: await openStream(w.app, cookieOf(signup.res)),
    }
    const event = (type: LiveEvent['type'], gymId: number, memberId: number, coachId: number | null) =>
      ({ type, gymId, memberId, coachId }) as LiveEvent
    for (const e of [
      event('member.updated', otherGymId, 900, w.coach.id), // another gym, though coachId matches a coach here
      event('member.updated', w.gym.id, 2, w.coach2.id),
      event('member.joined', w.gym.id, 3, null), // no coach: the owner only
      event('nudge.recorded', w.gym.id, 1, w.coach.id),
      // Last, one marker per listener: once a stream has its marker, everything before it has arrived.
      event('member.updated', w.gym.id, 99, w.coach.id),
      event('member.updated', w.gym.id, 98, w.coach2.id),
      event('member.updated', otherGymId, 97, null),
    ])
      w.ctx.bus.publish(e)
    const heard = async (reader: typeof streams.owner, marks: number[]) => {
      const text = await readUntil(reader, (t) => marks.every((m) => heardIds(t).includes(m)))
      await reader.cancel()
      return heardIds(text)
    }
    expect(await heard(streams.owner, [99, 98])).toEqual([2, 3, 1, 99, 98])
    expect(await heard(streams.coach, [99])).toEqual([1, 99])
    expect(await heard(streams.coach2, [98])).toEqual([2, 98])
    expect(await heard(streams.other, [97])).toEqual([900, 97])
  })

  test('live SSE over a real port: events arrive, and disconnecting unsubscribes', async () => {
    const bus = countingBus()
    const w = await makeWorld({ bus })
    const server = await new Promise<ReturnType<typeof serve>>((resolve) => {
      const s = serve({ fetch: w.app.fetch, hostname: '127.0.0.1', port: 0 }, () => resolve(s))
    })
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      const login = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: w.owner.email, password: PASSWORD }),
      })
      expect(login.status).toBe(200)
      const ac = new AbortController()
      const res = await fetch(`${base}/api/events`, { headers: { cookie: cookieOf(login) }, signal: ac.signal })
      expect([res.status, res.headers.get('content-type')]).toEqual([200, 'text/event-stream'])
      if (!res.body) throw new Error('no body')
      const reader = res.body.getReader()
      await readUntil(reader, (t) => t.includes(': connected'))
      expect(bus.subs).toBe(1)
      const live = checkin(w, 7, null, 'Live')
      bus.publish(live)
      expect(await readUntil(reader, (t) => t.includes('event: checkin.recorded'))).toContain(frame(live))
      ac.abort()
      await until(() => bus.subs === 0)
      expect(bus.subs).toBe(0)
    } finally {
      server.close()
    }
  })

  test('the stream sends a ": ping" comment on its heartbeat', async () => {
    const w = await makeWorld()
    const reader = await openStream(withFastHeartbeat(w), await w.login(w.owner.email))
    expect(await readUntil(reader, (t) => t.includes(': ping'))).toMatch(/: ping\n\n/)
    await reader.cancel()
  })
})

describe('the stream ends with the session (security fix 3)', () => {
  /** A world whose bus counts subscriptions, so a test can see the stream let go of it. */
  const world = async (overrides: Partial<AppContext> = {}) => {
    const bus = countingBus()
    return { bus, ...(await makeWorld({ bus, ...overrides })) }
  }

  test('after logout the open stream gets no more events and ends', async () => {
    const w = await world()
    const cookie = await w.login(w.coach.email)
    const reader = await openStream(w.app, cookie) // the 25 s heartbeat: the event itself must find the session gone
    expect((await call(w.app, 'POST', '/api/auth/logout', { cookie })).status).toBe(200)
    w.bus.publish(checkin(w, 1, w.coach.id, 'Mine T.'))
    const { text, ended } = await readToEnd(reader)
    expect(text).not.toContain('checkin')
    expect(ended).toBe(true)
    expect(w.bus.subs).toBe(0)
  })

  test('deactivating a coach ends their open stream', async () => {
    const w = await world()
    const reader = await openStream(w.app, await w.login(w.coach.email))
    expect(await w.ctx.repos.users.setActive(w.gym.id, w.coach.id, false)).toBeDefined()
    w.bus.publish(checkin(w, 1, w.coach.id, 'Mine T.'))
    const { text, ended } = await readToEnd(reader)
    expect(text).not.toContain('checkin')
    expect(ended).toBe(true)
    expect(w.bus.subs).toBe(0)
  })

  test.each([
    ['role', { role: 'owner' as const }],
    ['gym', { gymId: 999 }],
  ])("a changed %s ends the coach's open stream", async (_what, change) => {
    // The repositories have no way to edit a user's role or gym yet, so this swaps in a sessions repository that
    // reads the user back changed, which is what the real one returns after such an edit.
    let changed = false
    const w = await world()
    const real = w.ctx.repos.sessions
    w.ctx.repos.sessions = {
      ...real,
      findLive: async (hash, now) => {
        const live = await real.findLive(hash, now)
        return live && changed ? { ...live, user: { ...live.user, ...change } } : live
      },
    }
    const reader = await openStream(w.app, await w.login(w.coach.email))
    changed = true
    w.bus.publish(checkin(w, 1, w.coach.id, 'Mine T.'))
    const { text, ended } = await readToEnd(reader)
    expect(text).not.toContain('checkin')
    expect(ended).toBe(true)
    expect(w.bus.subs).toBe(0)
  })

  test('a ping finds the session gone and ends the stream', async () => {
    const w = await world()
    const cookie = await w.login(w.owner.email)
    const reader = await openStream(withFastHeartbeat(w), cookie)
    await w.ctx.repos.sessions.delete(tokenHashOf(cookie))
    expect(await readToEnd(reader)).toMatchObject({ ended: true })
    expect(w.bus.subs).toBe(0)
  })

  test('a ping finds the session expired and ends the stream', async () => {
    let now = TEST_NOW.getTime()
    const w = await world({ clock: () => new Date(now) })
    const reader = await openStream(withFastHeartbeat(w), await w.login(w.owner.email))
    now += 31 * 86_400_000
    expect(await readToEnd(reader)).toMatchObject({ ended: true })
    expect(w.bus.subs).toBe(0)
  })
})

describe('the server stopping (SIGTERM or SIGINT)', () => {
  test('ends the open stream, refuses new connections, closes the database and exits 0 within 1.5 s', async () => {
    const shutdown = createStopSignal()
    const { db, close } = createDb(':memory:')
    let dbClosed = false
    const w = await makeWorld({ shutdown, repos: createRepositories(db) })
    const server = await new Promise<Server>((resolve) => {
      const s = serve({ fetch: w.app.fetch, hostname: '127.0.0.1', port: 0 }, () => resolve(s as Server))
    })
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      const login = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: w.owner.email, password: PASSWORD }),
      })
      const res = await fetch(`${base}/api/events`, { headers: { cookie: cookieOf(login) } })
      if (!res.body) throw new Error('no body')
      const reader = res.body.getReader()
      await readUntil(reader, (t) => t.includes(': connected'))

      const lines: string[] = []
      let exit: (code: number) => void = () => {}
      const exited = new Promise<number>((resolve) => (exit = resolve))
      const stop = gracefulStop({
        server,
        endStreams: shutdown.stop,
        closeDb: () => {
          close()
          dbClosed = true
        },
        log: (line) => lines.push(line),
        exit: (code) => exit(code),
      })
      const started = Date.now()
      stop()
      expect(lines).toEqual(['Stopping Tenure'])
      // The stream ends cleanly (not cut off), and the stop finishes, both well inside the 3 s fallback.
      expect(await readToEnd(reader, 1500)).toEqual({ text: '', ended: true })
      const code = await Promise.race([exited, new Promise((r) => setTimeout(() => r('still running'), 1500))])
      expect(code).toBe(0)
      expect(Date.now() - started).toBeLessThan(1500)
      expect(dbClosed).toBe(true)
      await expect(w.ctx.repos.gyms.findDefault()).rejects.toThrow(/not open/)
      await expect(fetch(`${base}/api/health`)).rejects.toThrow()
    } finally {
      server.closeAllConnections()
      server.close()
      if (!dbClosed) close()
    }
  })
})
