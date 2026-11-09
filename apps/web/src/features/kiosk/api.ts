// The kiosk's calls (packages/contracts/src/kiosk.ts). No session: the token in the path is the gym's secret. Every
// request counts toward the device's 30 a minute, so nothing retries or refetches on its own; the screen offers its
// own Try again.
import { type QueryClient, useMutation, useQuery } from '@tanstack/react-query'
import {
  type KioskCheckinBody,
  KioskGymResponse,
  type KioskJoinBody,
  KioskSearchResponse,
  KioskWelcome,
} from '@tenure/contracts'
import { get, post } from '../../shared/api/client.ts'

export const kioskKeys = {
  gym: (token: string) => ['kiosk', token] as const,
  searches: (token: string) => ['kiosk', token, 'search'] as const,
  search: (token: string, q: string) => ['kiosk', token, 'search', q] as const,
}

const base = (token: string) => `/api/kiosk/${encodeURIComponent(token)}`

const once = { retry: false, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false } as const

export function useKioskGym(token: string) {
  return useQuery({ queryKey: kioskKeys.gym(token), queryFn: () => get(base(token), KioskGymResponse), ...once })
}

/** The name search for `q` (already trimmed and lower-cased); nothing is asked for an empty one. */
export function useKioskSearch(token: string, q: string) {
  return useQuery({
    queryKey: kioskKeys.search(token, q),
    queryFn: () => get(`${base(token)}/search?q=${encodeURIComponent(q)}`, KioskSearchResponse),
    enabled: q !== '',
    ...once,
  })
}

export function useCheckIn(token: string) {
  return useMutation({ mutationFn: (body: KioskCheckinBody) => post(`${base(token)}/checkin`, body, KioskWelcome) })
}

export function useJoin(token: string) {
  return useMutation({ mutationFn: (body: KioskJoinBody) => post(`${base(token)}/join`, body, KioskWelcome) })
}

/** Drop every cached search, so a member who joined since is found next time. */
export function forgetSearches(client: QueryClient, token: string) {
  client.removeQueries({ queryKey: kioskKeys.searches(token) })
}
