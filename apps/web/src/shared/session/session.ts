// The signed-in user and gym (GET /api/auth/me), shared by the shell, the guards and the features.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogoutResponse, MeResponse } from '@tenure/contracts'
import { useNavigate } from 'react-router'
import { ApiRequestError, get, post } from '../api/client.ts'

export const sessionKey = ['session'] as const

/** The session, or null when signed out (a 401). */
export async function fetchSession(): Promise<MeResponse | null> {
  try {
    return await get('/api/auth/me', MeResponse)
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) return null
    throw error
  }
}

/**
 * `data` is the MeResponse, null when signed out, undefined while loading. It stays fresh until something changes
 * it: log-out, a 401 from any app call (see createQueryClient), or a feature invalidating `sessionKey`.
 */
export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: fetchSession, staleTime: Infinity })
}

/** Router state the guard leaves on /login, so log-in can go back to where the user was going. */
export type ReturnState = { from: string }

export function returnState(location: { pathname: string; search: string; hash: string }): ReturnState {
  return { from: location.pathname + location.search + location.hash }
}

/** Where to go after log-in: the guarded page the user was sent away from, else Today. */
export function returnTo(state: unknown): string {
  const from = (state as Partial<ReturnState> | null)?.from
  return typeof from === 'string' && (from === '/app' || from.startsWith('/app/')) ? from : '/app'
}

/**
 * POST /api/auth/logout, then clear every cached query and go to /login. A session that already ended counts. The session is then known to
 * be signed out, so /login doesn't ask the server again (its 401 would only fill the console).
 */
export function useLogout() {
  const client = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async () => {
      try {
        await post('/api/auth/logout', {}, LogoutResponse)
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.sessionEnded)) throw error
      }
    },
    onSuccess: async () => {
      client.clear()
      client.setQueryData(sessionKey, null)
      await navigate('/login', { replace: true })
    },
  })
}
