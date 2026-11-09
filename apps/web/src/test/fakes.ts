// Test doubles for fetch and EventSource.
import type { MeResponse, Role } from '@tenure/contracts'
import { vi } from 'vitest'

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** The signed-in answer for a user of `role`, at a US gym that isn't the demo unless the options say otherwise. */
export const me = (role: Role, { country = 'US', isDemo = false }: { country?: string; isDemo?: boolean } = {}): MeResponse => ({
  user: { id: 1, name: 'Dana R.', email: 'dana@gym.com', role },
  gym: {
    id: 1,
    name: 'Northside Strength',
    slug: 'northside',
    isDemo,
    timezone: 'America/Chicago',
    country,
    plan: 'pilot',
    pilotStartedOn: '2026-10-01',
  },
})

export const signedOut = () => json(401, { error: { code: 'signIn', message: 'Log in to continue.' } })

type Handler = (method: string, path: string) => Response | Promise<Response>

/** Stubs fetch with a handler keyed on method and path; returns the mock so calls can be checked. */
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(init?.method ?? 'GET', String(input)),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

export class FakeEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: FakeEventSource[] = []

  readonly url: string
  readyState = FakeEventSource.CONNECTING
  onopen: ((e: Event) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  private listeners = new Map<string, ((e: MessageEvent) => void)[]>()

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }

  close() {
    this.readyState = FakeEventSource.CLOSED
  }

  // Test drivers
  open() {
    this.readyState = FakeEventSource.OPEN
    this.onopen?.(new Event('open'))
  }

  emit(data: unknown, type = 'message') {
    const message = new MessageEvent(type, { data: typeof data === 'string' ? data : JSON.stringify(data) })
    for (const fn of this.listeners.get(type) ?? []) fn(message)
  }

  /** The server ended the stream for good (the browser won't retry). */
  fail() {
    this.readyState = FakeEventSource.CLOSED
    this.onerror?.(new Event('error'))
  }

  static install() {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  }
}
