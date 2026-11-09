// Live updates: one EventSource per tab on /api/events, turning each event into the query invalidations the
// features declared for its type. No screen polls or reloads on its own.
import { hashKey, type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query'
import { LIVE_EVENT_TYPES, LiveEvent, type LiveEventType } from '@tenure/contracts'
import { useEffect } from 'react'
import { sessionKey, useSession } from '../session/session.ts'

/** Event type → the query keys to invalidate. A key invalidates every query it prefixes. */
export type LiveInvalidations = Partial<Record<LiveEventType, readonly QueryKey[]>>

export const LIVE_URL = '/api/events'
const FIRST_DELAY = 1_000
const MAX_DELAY = 30_000

/**
 * Opens the stream and returns the function that closes it. The browser retries a dropped stream by itself; when it
 * gives up (the stream is CLOSED), the session is checked again first, since the server also ends the stream when the
 * session ends (a 401 then signs the tab out and the guard sends it to /login), and a new stream opens after 1 s,
 * 2 s, 4 s … up to 30 s. Events sent while the stream was down are lost, so a stream that opens again after a drop
 * refreshes every declared key.
 *
 * Refreshes are batched (FR-LIVE-03): the keys of every event within one tick, or of a reopen, are queued and each
 * distinct key is invalidated once, so an import's 135 check-ins, or a reconnect, refresh Today once. The flush is a
 * macrotask: the browser dispatches each SSE message as its own task, so a microtask would flush after every event.
 */
export function connectLive(client: QueryClient, invalidations: LiveInvalidations): () => void {
  let source: EventSource | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let delay = FIRST_DELAY
  let dropped = false
  let stopped = false
  // Exact keys only: a key that prefixes another is still its own refresh.
  const pending = new Map<string, QueryKey>()
  let flushTimer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    flushTimer = undefined
    const keys = [...pending.values()]
    pending.clear()
    for (const queryKey of keys) void client.invalidateQueries({ queryKey })
  }

  const queue = (keys: readonly QueryKey[] | undefined) => {
    for (const key of keys ?? []) pending.set(hashKey(key), key)
    if (pending.size && flushTimer === undefined) flushTimer = setTimeout(flush, 0)
  }

  const onMessage = (message: MessageEvent) => {
    let data: unknown
    try {
      data = JSON.parse(String(message.data))
    } catch {
      return
    }
    const event = LiveEvent.safeParse(data)
    if (event.success) queue(invalidations[event.data.type])
  }

  const open = () => {
    const es = new EventSource(LIVE_URL)
    source = es
    // Unnamed events and events named by their type are both accepted.
    es.addEventListener('message', onMessage)
    for (const type of LIVE_EVENT_TYPES) es.addEventListener(type, onMessage)
    es.onopen = () => {
      delay = FIRST_DELAY
      if (!dropped) return
      dropped = false
      for (const keys of Object.values(invalidations)) queue(keys)
    }
    es.onerror = () => {
      dropped = true
      if (stopped || es.readyState !== EventSource.CLOSED) return
      void client.invalidateQueries({ queryKey: sessionKey })
      timer = setTimeout(open, delay)
      delay = Math.min(delay * 2, MAX_DELAY)
    }
  }

  open()
  return () => {
    stopped = true
    clearTimeout(timer)
    clearTimeout(flushTimer)
    pending.clear()
    source?.close()
  }
}

/** Keeps the tab's one stream open while signed in; it closes when the session ends or the caller unmounts. */
export function useLiveEvents(invalidations: LiveInvalidations) {
  const client = useQueryClient()
  const signedIn = Boolean(useSession().data)
  useEffect(() => {
    if (!signedIn) return
    return connectLive(client, invalidations)
  }, [client, invalidations, signedIn])
}
