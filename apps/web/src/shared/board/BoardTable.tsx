import type { MemberSummary } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { CaretDownIcon, CaretUpIcon, Mark } from '@tenure/ui'
import { type ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useGymFormat } from '../format/useGymFormat.ts'
import { BoardLegend } from './BoardLegend.tsx'
import styles from './BoardTable.module.css'
import { type FreshCheckins, useLastingFresh } from './fresh.ts'
import { Pace } from './Pace.tsx'
import { type BoardSort, nextSort, type SortKey, shownSort, sortBoard } from './sort.ts'
import { StatusText } from './StatusText.tsx'
import { WEEKS, weekCells } from './weeks.ts'

export type BoardTableProps = {
  /** The rows, in the order given (board order from the server, filtered or cut short by the screen). */
  members: readonly MemberSummary[]
  /** From useFreshCheckins: each fresh member's week in progress pops and their row's tint fades (FR-BOARD-03). */
  fresh?: FreshCheckins
  /** The pace column, on the board's own page (FR-BOARD-01). */
  pace?: boolean
  /** `compact` under Today's short board, `full` on the board's own page. */
  legend?: 'compact' | 'full'
  /** Column headers that sort the rows by name, joined, pace and status, on the board's own page (FR-BOARD-04). */
  sortable?: boolean
  /** @deprecated Ignored: the board has no Nudge (FR-BOARD-02). Kept so Today compiles until it drops the prop. */
  nudge?: boolean
}

/**
 * The 90-day board (FR-BOARD-01 to 04): one row per member, with the name, 13 week marks, the pace when asked and the
 * status. The name is the link to the member, and there is no Open or Nudge on the board (FR-BOARD-02). From 48rem it
 * is a table that scrolls inside its own frame, with the names held at the left edge (compact, with a sticky header,
 * on a laptop); below, its CSS lays each row out as a two-line card that is one link.
 */
export function BoardTable({ members, fresh, pace = false, legend = 'compact', sortable = false }: BoardTableProps) {
  const { pathname, search } = useLocation()
  const { locale } = useGymFormat()
  const [sort, setSort] = useState<BoardSort>(null)
  const lasting = useLastingFresh(fresh)
  // Lasting keys whose tint has run out: such a row drops its fresh look for good, so a remount or a move (a filter
  // chip, a sort) can't replay the tint or the pop. The member's next check-in has a new key and replays both.
  const [settled, setSettled] = useState<ReadonlySet<string>>(new Set())
  const settle = (key: string) => setSettled((now) => (now.has(key) ? now : new Set(now).add(key)))
  const rows = sortable ? sortBoard(members, sort, locale) : members

  // The board's own order shows on Status, ascending (FR-BOARD-04), so one column is always marked.
  const shown = shownSort(sort)

  /** A head cell's words, as a button that sorts by `key` when the board sorts. */
  const head = (key: SortKey, words: string): ReactNode => {
    if (!sortable) return words
    const direction = shown.key === key ? shown.direction : undefined
    const Caret = direction === 'descending' ? CaretDownIcon : CaretUpIcon
    return (
      <button type="button" className={styles.sort} onClick={() => setSort(nextSort(sort, key))}>
        {words}
        <Caret className={direction ? styles.caret : `${styles.caret} ${styles.unsorted}`} />
      </button>
    )
  }
  const ariaSort = (key: SortKey) => (sortable && shown.key === key ? shown.direction : undefined)

  return (
    <div className={styles.wrap}>
      {/* Focusable so the board can be scrolled sideways from the keyboard where it is wider than its column. It names
          the board once. */}
      <div className={styles.scroll} role="region" aria-label={t('board.aria')} tabIndex={0}>
        <table className={styles.board}>
          <thead>
            <tr>
              <th scope="col" className={styles.name} aria-sort={ariaSort('name')}>
                {head('name', t('board.head.member'))}
              </th>
              <th scope="colgroup" colSpan={WEEKS} className={styles.weeksHead} aria-sort={ariaSort('joined')}>
                {head('joined', t('today.board.head.weeks'))}
              </th>
              {pace && (
                <th scope="col" className={styles.paceHead} aria-sort={ariaSort('pace')}>
                  {head('pace', t('members.col.pace'))}
                </th>
              )}
              <th scope="col" className={styles.statusHead} aria-sort={ariaSort('status')}>
                {head('status', t('today.board.head.status'))}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((member) => {
              const key = lasting.get(member.id)
              const live = key !== undefined && !settled.has(key) ? key : undefined
              return (
                <tr
                  key={key ?? member.id}
                  data-status={member.status}
                  className={live === undefined ? undefined : styles.fresh}
                  // The tint's end bubbles up from the cells on a laptop and comes from the row on a phone; the mark's
                  // pop is shorter and is ignored.
                  onAnimationEnd={
                    live === undefined ? undefined : (e) => e.animationName.includes('tint') && settle(live)
                  }
                >
                  <th scope="row" className={styles.name}>
                    <Link to={`/app/members/${member.id}`} state={{ from: pathname + search }} className={styles.link}>
                      {member.name}
                      {member.status === 'slipping' && <span className={styles.hidden}>{t('a11y.slipping')}</span>}
                    </Link>
                  </th>
                  {weekCells(member, live).map((cell) => (
                    <td key={cell.key} className={styles.cell}>
                      <Mark kind={cell.kind} label={cell.label} flag={cell.flag} fresh={cell.fresh} />
                    </td>
                  ))}
                  {pace && (
                    <td className={styles.paceCell}>
                      <Pace pace={member.pace} />
                    </td>
                  )}
                  <td className={styles.statusCell}>
                    <StatusText status={member.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <BoardLegend look={legend} />
    </div>
  )
}
