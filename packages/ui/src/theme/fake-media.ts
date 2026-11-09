// Test support: jsdom has no matchMedia, so tests install this one and flip queries by hand.

type Entry = { matches: boolean; listeners: Set<(event: MediaQueryListEvent) => void> }

export type FakeMedia = {
  /** Sets whether a query matches and tells its listeners. */
  set: (query: string, matches: boolean) => void
  restore: () => void
}

export function installFakeMedia(initial: Record<string, boolean> = {}): FakeMedia {
  const entries = new Map<string, Entry>()
  const entry = (query: string): Entry => {
    let found = entries.get(query)
    if (!found) {
      found = { matches: initial[query] ?? false, listeners: new Set() }
      entries.set(query, found)
    }
    return found
  }

  const matchMedia = (query: string) => {
    const e = entry(query)
    return {
      media: query,
      get matches() {
        return e.matches
      },
      addEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => e.listeners.add(listener),
      removeEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) =>
        e.listeners.delete(listener),
    } as unknown as MediaQueryList
  }
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia })

  return {
    set(query, matches) {
      const e = entry(query)
      e.matches = matches
      for (const listener of e.listeners) listener({ matches, media: query } as MediaQueryListEvent)
    },
    restore() {
      Reflect.deleteProperty(window, 'matchMedia')
    },
  }
}

/** Puts a fake `document.startViewTransition` in place that holds the update until the test runs it. */
export function installFakeViewTransition() {
  const updates: (() => void)[] = []
  const start = (update: () => void) => {
    updates.push(update)
    const done = Promise.resolve()
    return { finished: done, ready: done, updateCallbackDone: done, skipTransition: () => {} }
  }
  Object.defineProperty(document, 'startViewTransition', { configurable: true, writable: true, value: start })
  return {
    updates,
    restore: () => Reflect.deleteProperty(document, 'startViewTransition'),
  }
}
