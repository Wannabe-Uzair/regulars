import { Navigate, Outlet } from 'react-router'
import { useSession } from '../../shared/session/session.ts'

/** Owner-only routes: a coach is sent to Today. Rendered inside the shell, so the session is already loaded. */
export function RequireOwner() {
  const role = useSession().data?.user.role
  return role === 'owner' ? <Outlet /> : <Navigate to="/app" replace />
}
