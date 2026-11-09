// Test support for Members and the member page: summaries, the app on a memory router, and the screen width.
import type { QueryClient } from '@tanstack/react-query'
import type { MemberDetailResponse, MemberSummary, MeResponse, Role } from '@tenure/contracts'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter } from 'react-router'
import { App } from '../../app/App.tsx'
import { features } from '../../app/features.ts'
import { createQueryClient } from '../../app/query-client.ts'
import { buildRoutes } from '../../app/router.tsx'
import { json, me, mockFetch } from '../../test/fakes.ts'
import { TABLE_QUERY } from './screens/Members.tsx'

export const summary = (
  over: Partial<MemberSummary> & Pick<MemberSummary, 'id' | 'firstName' | 'lastName'>,
): MemberSummary => ({
  name: over.lastName === '' ? over.firstName : `${over.firstName} ${over.lastName[0]}.`,
  phone: null,
  coachId: 2,
  coachName: 'Priya S.',
  joinedOn: '2026-10-03',
  daysSinceJoin: 35,
  week: 5,
  weeks: [3, 3, 2, 1, 0, 1],
  pace: 1.8,
  status: 'on',
  lastVisitOn: '2026-11-04',
  daysSinceLastVisit: 3,
  lastNudgeAt: null,
  ...over,
})

export const detail = (
  member: MemberSummary,
  over: Partial<Omit<MemberDetailResponse, 'member'>> & { archivedAt?: string | null } = {},
): MemberDetailResponse => ({
  member: { ...member, email: null, source: 'kiosk', archivedAt: over.archivedAt ?? null },
  days: Array.from({ length: 90 }, (_, day) => ({
    date: new Date(Date.parse(`${member.joinedOn}T12:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10),
    day,
    visited: day < member.daysSinceJoin && day % 3 === 0,
  })),
  checkins: [],
  nudges: [],
  ...over,
})

type Handler = (method: string, path: string, body: unknown) => Response | Promise<Response> | undefined

const notApi = () => json(404, { error: { code: 'notApi', message: "That isn't part of the Regulars API." } })

/** The app at `path`, signed in as `role` at a US gym unless `gym` says otherwise; `handler` answers the API. */
export function renderApp(path: string, role: Role, handler: Handler, gym: Partial<MeResponse['gym']> = {}) {
  const session = me(role)
  const fetch = mockFetch((method, url) => {
    if (url === '/api/auth/me') return json(200, { ...session, gym: { ...session.gym, ...gym } })
    const init = fetch.mock.calls.at(-1)?.[1]
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    return handler(method, url, body) ?? notApi()
  })
  const client: QueryClient = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [path] })
  render(createElement(App, { client, router }))
  /** The calls to one method and path, with their bodies. */
  const calls = (method: string, url: string) =>
    fetch.mock.calls
      .filter(([u, init]) => String(u) === url && (init?.method ?? 'GET') === method)
      .map(([, init]) => (typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined))
  return { router, calls }
}

/** jsdom has no matchMedia: this one answers the table's query with `wide`, and every other query with false. */
export function setScreen(wide: boolean) {
  const matchMedia = (query: string) => ({
    matches: query === TABLE_QUERY ? wide : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: matchMedia })
}

export function resetScreen() {
  Reflect.deleteProperty(window, 'matchMedia')
}
