// Stopping the server cleanly. Long-lived responses (the live stream) end on the stop signal, so `docker compose stop`
// finishes in about a second instead of waiting out Docker's timeout and being killed with the database still open.
import type { Server } from 'node:http'

/** What a long-lived response listens on, to end when the server stops. */
export type StopSignal = {
  /** Call `end` when the server stops, or now if it already has. Returns the call that takes it back. */
  onStop(end: () => void): () => void
}

/** A stop signal, and `stop()`, which calls every `end` still registered on it, once. */
export function createStopSignal(): StopSignal & { stop(): void } {
  const ends = new Set<() => void>()
  let stopped = false
  return {
    onStop(end) {
      if (stopped) {
        end()
        return () => {}
      }
      ends.add(end)
      return () => ends.delete(end)
    },
    stop() {
      stopped = true
      const all = [...ends]
      ends.clear()
      for (const end of all) end()
    },
  }
}

/** How long requests still running get before their connections are closed. */
export const GRACE_MS = 1000
/** When the database is closed and the process exits (1) even if something still hangs. */
export const FALLBACK_MS = 3000
/** How often connections whose response has ended are closed while stopping. */
const SWEEP_MS = 20

/**
 * The SIGTERM/SIGINT handler. It prints one line, stops taking new connections, ends the long-lived responses, closes
 * each connection once its response has ended (all that remain after `graceMs`), then closes the database and exits 0.
 * If the server has still not closed after `fallbackMs` it closes the database and exits 1. Called again, it does
 * nothing.
 */
export function gracefulStop({
  server,
  endStreams,
  closeDb,
  log = console.log,
  exit = (code) => process.exit(code),
  graceMs = GRACE_MS,
  fallbackMs = FALLBACK_MS,
}: {
  server: Pick<Server, 'close' | 'closeIdleConnections' | 'closeAllConnections'>
  endStreams: () => void
  closeDb: () => void
  log?: (line: string) => void
  exit?: (code: number) => void
  graceMs?: number
  fallbackMs?: number
}): () => void {
  let stopping = false
  return () => {
    if (stopping) return
    stopping = true
    log('Stopping Tenure')

    let finished = false
    const finish = (code: number) => {
      if (finished) return
      finished = true
      clearInterval(sweep)
      clearTimeout(grace)
      clearTimeout(fallback)
      closeDb()
      exit(code)
    }
    // Unref'd, so none of them keeps the process up on its own.
    const fallback = setTimeout(() => finish(1), fallbackMs).unref()
    const grace = setTimeout(() => server.closeAllConnections(), graceMs).unref()
    const sweep = setInterval(() => server.closeIdleConnections(), SWEEP_MS).unref()

    server.close(() => finish(0))
    endStreams()
  }
}
