import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useMe } from './api.js'
import { AppShell, ToastProvider } from './components'
import { safeNext } from './util.js'
import Login from './screens/Login.jsx'
import Signup from './screens/Signup.jsx'
import InviteAccept from './screens/InviteAccept.jsx'
import Today from './screens/Today.jsx'
import Board from './screens/Board.jsx'
import Members from './screens/Members.jsx'
import Member from './screens/Member.jsx'
import Nudges from './screens/Nudges.jsx'
import Reports from './screens/Reports.jsx'
import Templates from './screens/Templates.jsx'
import Settings from './screens/Settings.jsx'
import Billing from './screens/Billing.jsx'
import Me from './screens/Me.jsx'
import Kiosk from './screens/Kiosk.jsx'

// The component gallery: dev builds only (tree-shaken out of `npm run build`).
const Gallery = import.meta.env.DEV ? lazy(() => import('./Gallery.jsx')) : null

// Signed-in routes. roles = which roles may open it; anyone else is sent to Today.
function RequireAuth({ roles }) {
  const { status, role } = useMe()
  const loc = useLocation()
  if (status === 'idle' || status === 'loading') return <p className="sr-only" role="status">Loading</p>
  if (status === 'out') return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />
  return <Outlet />
}
// Login and signup: a signed-in user goes straight to Today, or to the page they were sent from (?next=). Signing in
// flips status before Login's own navigate runs, so this has to honour ?next= too.
function PublicOnly() {
  const { status } = useMe()
  const next = new URLSearchParams(useLocation().search).get('next') || '/'
  if (status === 'in') return <Navigate to={safeNext(next)} replace />
  return <Outlet />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route path="/invite/:token" element={<InviteAccept />} />
          <Route path="/kiosk/:token" element={<Kiosk />} />
          {Gallery && <Route path="/_kit" element={<Suspense fallback={null}><Gallery /></Suspense>} />}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<Today />} />
              <Route path="/board" element={<Board />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/:id" element={<Member />} />
              <Route path="/nudges" element={<Nudges />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/me" element={<Me />} />
              <Route element={<RequireAuth roles={['owner']} />}>
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
