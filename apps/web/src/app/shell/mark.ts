// Which nav item carries the current mark (pick A2): the sidebar's, the tab bar's and the More sheet's.
import { useLocation, useNavigation } from 'react-router'
import { openedFrom } from '../../shared/page/opened-from.ts'

/**
 * The path the nav marks: the one loading while a lazy screen loads, else the current one, so the tapped item takes
 * the mark at once and the item being left drops it, and a tap over the stall's hotspot never looks missed (F23).
 * A member page opened from Today or the board keeps that page marked, as a pushed detail stays in its tab and as its
 * back link says (visitor check M3); opened from Members, a reload or anywhere else, it marks Members, under which it sits.
 * It re-renders on every navigation, so call it only in a component that holds no queries: a re-render of the shell
 * between log-out's cache clear and /login would ask for them again.
 */
export function useMarkedPath(): string {
  const navigation = useNavigation()
  const current = useLocation()
  const location = navigation.location ?? current
  return openedFrom(location.state)?.page ?? location.pathname
}
