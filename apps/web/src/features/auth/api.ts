// Log-in and sign-up: both answer with the session, which seeds the session query before the app opens.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type MeResponse, SessionResponse } from '@tenure/contracts'
import { useLocation, useNavigate } from 'react-router'
import { get, post, type Schema } from '../../shared/api/client.ts'
import { returnTo, sessionKey } from '../../shared/session/session.ts'

/**
 * The session query for Log In and Set Up, which a signed-out visitor opens: when nothing has asked yet, it asks GET /api/auth/session,
 * which answers 200 with a null session rather than me's 401, so the visit logs no error in the browser's console (B2-24). The same
 * cache entry as useSession, and the same answer.
 */
export function useQuietSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async () => (await get('/api/auth/session', SessionResponse)).session,
    staleTime: Infinity,
  })
}

/**
 * POST the form to `path`. On success: clear every cached query (nothing from an earlier session survives), put the
 * answer into the session query, and go where the guard sent the user from, else Today.
 */
export function useSignIn<Body>(path: '/api/auth/login' | '/api/auth/signup', schema: Schema<MeResponse>) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  return useMutation({
    mutationFn: (body: Body) => post(path, body, schema),
    onSuccess: async (me) => {
      client.clear()
      client.setQueryData(sessionKey, me)
      await navigate(returnTo(location.state), { replace: true })
    },
  })
}

/** A form's text field by name; '' when it's missing. */
export function textOf(data: FormData, name: string): string {
  const value = data.get(name)
  return typeof value === 'string' ? value : ''
}

/** Focus the first field named in `errors` (its keys in form order). */
export function focusFirst(form: HTMLFormElement, errors: Record<string, unknown>): void {
  const first = Object.keys(errors)[0]
  const field = first === undefined ? null : form.elements.namedItem(first)
  if (field instanceof HTMLElement) field.focus()
}
