// The laptop board's column sort (FR-BOARD-04): by name, joined, pace or status, each way, over the board's own order.
import type { MemberSummary } from '@tenure/contracts'
import { STATUS_FILTERS } from '@tenure/domain'

export type SortKey = 'name' | 'joined' | 'pace' | 'status'
export type SortDirection = 'ascending' | 'descending'
export type BoardSort = { key: SortKey; direction: SortDirection } | null

type SortRow = Pick<MemberSummary, 'name' | 'daysSinceJoin' | 'pace' | 'status'>

/** COPY §1's order: Slipping, New, On the line, Below the line. */
const statusRank = new Map(STATUS_FILTERS.filter((s) => s !== 'all').map((s, i) => [s, i]))

/** The board's own order (FR-BOARD-01), slipping first: FR-BOARD-04 marks it on Status, ascending. */
const BOARD_ORDER = { key: 'status', direction: 'ascending' } as const

/** The sort the headers show: the one chosen, or the board's own order (`null`), marked on Status. */
export function shownSort(sort: BoardSort): NonNullable<BoardSort> {
  return sort ?? BOARD_ORDER
}

/**
 * A press goes ascending, then descending, then back to the board's order; another column starts ascending. Status's
 * ascending is the board's order, so from there its first press goes descending and its second back.
 */
export function nextSort(current: BoardSort, key: SortKey): BoardSort {
  const shown = shownSort(current)
  if (shown.key !== key) return key === BOARD_ORDER.key ? null : { key, direction: 'ascending' }
  return shown.direction === 'ascending' ? { key, direction: 'descending' } : null
}

/**
 * The rows in `sort`'s order, ties keeping the order given (the board's, FR-BOARD-01). Names compare in the gym's
 * locale; joined is the days since joining (week 1 first when ascending); a pace not known yet goes last either way.
 */
export function sortBoard<M extends SortRow>(rows: readonly M[], sort: BoardSort, locale: string): readonly M[] {
  if (!sort) return rows
  const sign = sort.direction === 'ascending' ? 1 : -1
  const collator = new Intl.Collator(locale, { sensitivity: 'base' })
  return rows.toSorted((a, b) => {
    switch (sort.key) {
      case 'name':
        return sign * collator.compare(a.name, b.name)
      case 'joined':
        return sign * (a.daysSinceJoin - b.daysSinceJoin)
      case 'status':
        return sign * ((statusRank.get(a.status) ?? 0) - (statusRank.get(b.status) ?? 0))
      case 'pace':
        if (a.pace === null || b.pace === null) return (a.pace === null ? 1 : 0) - (b.pace === null ? 1 : 0)
        return sign * (a.pace - b.pace)
    }
  })
}
