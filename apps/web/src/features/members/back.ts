// The member page's way back (FR-MEMBER-08, flow-5A): member links say where they came from, and the back link reads it.
import { t } from '@tenure/copy'
import { useLocation } from 'react-router'
import { type OpenedFromPage, openedFrom } from '../../shared/page/opened-from.ts'

/** A member link's state: this page, its search (the view and filters) kept, so the way back returns to it. */
export function useFrom(): { from: string } {
  const { pathname, search } = useLocation()
  return { from: pathname + search }
}

/** The pages a member opens from, by pathname: their back words. */
const pages = {
  '/app': 'member.back.today',
  '/app/board': 'member.back.board',
  '/app/members': 'member.back.members',
} as const satisfies Record<OpenedFromPage, string>

/**
 * Where the back link goes and what it says: `from` itself (so the filters in its search come back) when Today, the
 * board or Members set it in the link's state; anything else, a reload or a link from elsewhere included, is Members.
 */
export function backFrom(state: unknown): { to: string; word: string } {
  const from = openedFrom(state)
  if (from) return { to: from.to, word: t(pages[from.page]) }
  return { to: '/app/members', word: t('member.back.members') }
}
