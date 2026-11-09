// Where a member page was opened from (FR-MEMBER-08, flow-5A): member links put it in their state as `from`, the back
// link reads it for its words and its target, and the shell's nav keeps that page's item marked (visitor check M3).

/** The pages a member opens from, by pathname. */
export const openedFromPages = ['/app', '/app/board', '/app/members'] as const
export type OpenedFromPage = (typeof openedFromPages)[number]

/**
 * The page a link's state says this one was opened from: `to` is `from` itself (its search keeps the view and the
 * filters), `page` its pathname. Null when the state names none of those pages: a reload, or a link from elsewhere.
 */
export function openedFrom(state: unknown): { to: string; page: OpenedFromPage } | null {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from !== 'string') return null
  const pathname = from.split(/[?#]/, 1)[0]!
  const page = openedFromPages.find((p) => p === pathname)
  return page === undefined ? null : { to: from, page }
}
