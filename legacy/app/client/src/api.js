import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/* ------------------------------------------------------------------ fetch wrapper
 * api('/today') -> GET /api/today. api('/nudges', { method: 'POST', body: {...} }).
 * Sends the session cookie, JSON in and out. Throws Error(message) using the server's { error } sentence;
 * the thrown error carries .status. Mutating requests always send Content-Type: application/json (SPEC §6). */
export async function api(path, { method = 'GET', body, signal } = {}) {
  const url = path.startsWith('/api/') ? path : '/api' + path
  const mutating = method !== 'GET' && method !== 'HEAD'
  let res
  try {
    res = await fetch(url, {
      method,
      signal,
      credentials: 'include',
      headers: mutating ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: mutating ? JSON.stringify(body ?? {}) : undefined,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw Object.assign(new Error("Can't reach Tenure. Check the connection and try again."), { status: 0 })
  }
  const text = await res.text()
  let data = null
  if (text) { try { data = JSON.parse(text) } catch { data = null } }
  if (!res.ok) {
    const message = data?.error || (res.status >= 500 ? "Can't reach Tenure right now. Try again in a moment." : 'Something went wrong. Try again.')
    if (res.status === 401 && !url.startsWith('/api/auth/')) window.dispatchEvent(new Event('tenure:signed-out'))
    throw Object.assign(new Error(message), { status: res.status, data })
  }
  return data
}

/* ------------------------------------------------------------------ data hook
 * const { data, error, loading, reload, setData } = useApi('/today')   (pass null to skip)
 * Refetches when the path changes; aborts stale requests. */
export function useApi(path) {
  const [state, setState] = useState({ data: undefined, error: null, loading: !!path })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!path) return
    const ac = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    api(path, { signal: ac.signal }).then(
      (data) => setState({ data, error: null, loading: false }),
      (error) => { if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false })) },
    )
    return () => ac.abort()
  }, [path, n])
  const reload = useCallback(() => setN((x) => x + 1), [])
  const setData = useCallback((v) => setState((s) => ({ ...s, data: typeof v === 'function' ? v(s.data) : v })), [])
  return { ...state, reload, setData }
}

/* ------------------------------------------------------------------ auth
 * useMe() -> { status: 'idle'|'loading'|'in'|'out', user, gym, role, login, logout, signup, acceptInvite, refresh, setGym }
 * The session is loaded on first use (so the kiosk and the /_kit gallery never ask the API who is signed in). */
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'idle', user: null, gym: null })
  const signedIn = (r) => { setState({ status: 'in', user: r.user, gym: r.gym }); return r }

  const asked = useRef(false)
  const refresh = useCallback(async () => {
    asked.current = true
    setState((s) => ({ ...s, status: s.status === 'in' ? 'in' : 'loading' }))
    try { return signedIn(await api('/auth/me')) } catch { setState({ status: 'out', user: null, gym: null }); return null }
  }, [])

  useEffect(() => {
    const out = () => setState({ status: 'out', user: null, gym: null })
    window.addEventListener('tenure:signed-out', out)
    return () => window.removeEventListener('tenure:signed-out', out)
  }, [])

  const value = useMemo(() => ({
    ...state,
    role: state.user?.role ?? null,
    ensure: () => { if (state.status === 'idle' && !asked.current) refresh() },
    refresh,
    login: async (email, password) => signedIn(await api('/auth/login', { method: 'POST', body: { email, password } })),
    signup: async (form) => signedIn(await api('/auth/signup', { method: 'POST', body: form })),
    acceptInvite: async (token, form) => signedIn(await api(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST', body: form })),
    logout: async () => { try { await api('/auth/logout', { method: 'POST' }) } finally { setState({ status: 'out', user: null, gym: null }) } },
    setGym: (gym) => setState((s) => ({ ...s, gym: typeof gym === 'function' ? gym(s.gym) : gym })),
  }), [state, refresh])

  return createElement(AuthContext.Provider, { value }, children)
}

export function useMe() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useMe() needs <AuthProvider>')
  const { status, ensure } = ctx
  useEffect(() => { if (status === 'idle') ensure() }, [status, ensure])
  return ctx
}
