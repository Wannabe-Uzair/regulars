// The in-process event bus, one per app. Services publish a LiveEvent after a successful write; realtime (and any
// module's subscribe) listens. Fan-out is synchronous, in subscription order; a subscriber that throws is logged and
// the others still run.
import type { LiveEvent } from '@tenure/contracts'

export type EventHandler = (event: LiveEvent) => void

export type EventBus = {
  publish(event: LiveEvent): void
  /** Returns the unsubscribe function. */
  subscribe(handler: EventHandler): () => void
}

type BusOptions = { onError?: (err: unknown, event: LiveEvent) => void }

const logFailure = (err: unknown, event: LiveEvent) => console.error(`event subscriber failed on ${event.type}`, err)

export function createEventBus({ onError = logFailure }: BusOptions = {}): EventBus {
  const handlers = new Set<EventHandler>()
  return {
    publish(event) {
      // A snapshot, so a handler that unsubscribes (itself or another) mid-fan-out does not skip anyone.
      for (const handler of [...handlers]) {
        try {
          handler(event)
        } catch (err) {
          onError(err, event)
        }
      }
    },
    subscribe(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
  }
}
