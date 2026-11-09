// GET /api/events: Server-Sent Events for the signed-in, scoped like the data. Each event goes out as
// `event: <type>` with the event JSON as `data`. A heartbeat comment keeps proxies from closing the stream.
import type { LiveEvent } from '@tenure/contracts'
import { streamSSE } from 'hono/streaming'
import { requireActor } from '../../platform/auth/guards.ts'
import { sessionProbe } from '../../platform/auth/session.ts'
import type { AppContext } from '../../platform/context.ts'
import type { Router } from '../../platform/module.ts'
import { inScope } from './scope.ts'

/** The old server's ping interval. */
export const HEARTBEAT_MS = 25_000

export function realtimeRoutes(router: Router, ctx: AppContext, heartbeatMs: number) {
  router.get('/events', requireActor, (c) => {
    const actor = c.var.actor
    // Re-checked before each event and on each heartbeat: logging out, an expired session, deactivation or a changed role or gym ends the
    // stream, and nothing more is sent on it.
    const signedIn = sessionProbe(c, ctx, actor)

    return streamSSE(c, async (stream) => {
      // One queue per stream, so the session checks (async) keep events and heartbeats in order.
      let done = false
      let queue = Promise.resolve()
      const enqueue = (send: () => Promise<unknown>) => {
        queue = queue
          .then(async () => {
            if (done) return
            if (!(await signedIn())) return close()
            if (!done) await send()
          })
          .catch(() => close())
      }

      // Subscribed before ": connected" is written, so a client that has read it misses nothing after.
      const unsubscribe = ctx.bus.subscribe((event: LiveEvent) => {
        if (inScope(actor, event)) enqueue(() => stream.writeSSE({ event: event.type, data: JSON.stringify(event) }))
      })
      const heartbeat = setInterval(() => enqueue(() => stream.write(': ping\n\n')), heartbeatMs)
      let finish = () => {}
      const finished = new Promise<void>((resolve) => (finish = resolve))
      let offStop = () => {}
      function close() {
        if (done) return
        done = true
        unsubscribe()
        clearInterval(heartbeat)
        offStop()
        finish()
      }
      stream.onAbort(close)
      c.req.raw.signal.addEventListener('abort', close)
      // The server stopping ends the stream, so it can close its connections and exit.
      offStop = ctx.shutdown.onStop(close)

      await stream.write(': connected\n\n')
      await finished
    })
  })
}
