import { t } from '@tenure/copy'
import { Button, Card, EmptyState, MagnifyingGlassIcon, Skeleton, SkeletonGroup, UserPlusIcon } from '@tenure/ui'
import { BoardSkeleton } from '../../../shared/board/BoardSkeleton.tsx'
import { BoardTable } from '../../../shared/board/BoardTable.tsx'
import { useFreshCheckins } from '../../../shared/board/fresh.ts'
import { useCheckinToasts } from '../../../shared/board/useCheckinToasts.ts'
import { FilterBar } from '../../../shared/filters/FilterBar.tsx'
import { useMemberFilters } from '../../../shared/filters/useMemberFilters.ts'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSession } from '../../../shared/session/session.ts'
import { useBoard } from '../api.ts'
import styles from './Board.module.css'

/** The board's placeholder rows while it loads. */
const LOADING_ROWS = 8

/** The line over the table (FR-BOARD-01): the rows shown, and how many of them are slipping. */
function countLine(rows: readonly { status: string }[]): string {
  const s = rows.filter((m) => m.status === 'slipping').length
  return rows.length === 1 ? t('board.count.one', { s }) : t('board.count', { n: rows.length, s })
}

/**
 * /app/board (FR-BOARD-01 to 04): every member in their first 90 days, slipping first and then the newest, narrowed by
 * the filter bar kept in the URL (FR-MEM-02). Each row's name opens the member; the row has 13 week marks, pace and
 * status, and the headers sort it. A check-in toasts, pops its week mark and tints its row.
 */
export default function Board() {
  const role = useSession().data?.user.role ?? 'owner'
  const board = useBoard()
  const d = board.data
  const filters = useMemberFilters(d?.board)
  useCheckinToasts(d?.checkinsToday)
  const fresh = useFreshCheckins(d?.checkinsToday)

  let body
  if (d) {
    const clear = (
      <Button variant="primary" onClick={filters.clear}>
        {t('board.emptyClear')}
      </Button>
    )
    const query = filters.bar.query.trim()
    if (filters.rows.length > 0) {
      body = (
        <div className={styles.results}>
          <p className={styles.count}>{countLine(filters.rows)}</p>
          <Card className={styles.card}>
            <BoardTable members={filters.rows} fresh={fresh} pace legend="full" sortable />
          </Card>
        </div>
      )
    } else if (filters.filtered && query !== '') {
      body = (
        <Card>
          <EmptyState
            symbol={<MagnifyingGlassIcon />}
            title={t('board.empty.search', { query })}
            body={t('board.empty.searchBody')}
            action={clear}
          />
        </Card>
      )
    } else if (filters.filtered) {
      body = (
        <Card>
          <EmptyState title={t('board.empty')} body={t('board.emptyBody')} action={clear} />
        </Card>
      )
    } else if (!d.hasMembers) {
      const coach = role === 'coach'
      body = (
        <Card>
          <EmptyState
            symbol={<UserPlusIcon />}
            title={coach ? t('today.empty.coachTitle') : t('today.empty.title')}
            body={coach ? t('today.empty.coach') : t('today.empty.kioskBody')}
          />
        </Card>
      )
    } else {
      body = (
        <Card>
          <EmptyState title={t('board.empty.none')} />
        </Card>
      )
    }
  } else if (board.isError) {
    body = (
      <div className={styles.error}>
        <p role="alert">{board.error.message}</p>
        <Button variant="primary" loading={board.isFetching} onClick={() => void board.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  } else {
    // The count line and the board's own card, with placeholder rows (FR-BOARD-01), so nothing moves when it lands.
    body = (
      <SkeletonGroup label={t('common.loading')} className={styles.results}>
        <Skeleton width="11em" className={styles.count} />
        <Card className={styles.card}>
          <BoardSkeleton rows={LOADING_ROWS} pace legend="full" sortable />
        </Card>
      </SkeletonGroup>
    )
  }

  return (
    <div className={styles.page}>
      <PageTitle title={t('board.title')} />
      <FilterBar bar={filters.bar} searchPlaceholder={t('board.search')} />
      {body}
    </div>
  )
}
