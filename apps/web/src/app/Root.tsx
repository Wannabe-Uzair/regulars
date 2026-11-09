import { Outlet } from 'react-router'
import { useFocusOnNavigate } from '../shared/page/page.ts'

/** The root of every route: after a navigation, focus goes to the new page's h1. */
export function Root() {
  useFocusOnNavigate()
  return <Outlet />
}
