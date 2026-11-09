// A tiny in-process event bus, one per app. Routes emit; the SSE endpoint (wave 2) subscribes per gym
// and filters by the viewer's scope (look up the member's coach from data.memberId).
export function createEventBus() {
  const subs = new Map() // gymId -> Set<fn>
  return {
    emit(gymId, type, data) {
      for (const fn of subs.get(gymId) ?? []) {
        try { fn(type, data) } catch (err) { console.error('event subscriber failed', err) }
      }
    },
    /** Returns an unsubscribe function. */
    subscribe(gymId, fn) {
      if (!subs.has(gymId)) subs.set(gymId, new Set())
      subs.get(gymId).add(fn)
      return () => {
        const set = subs.get(gymId)
        set?.delete(fn)
        if (set && set.size === 0) subs.delete(gymId)
      }
    },
  }
}
