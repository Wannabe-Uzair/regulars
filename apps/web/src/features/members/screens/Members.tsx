import { MEMBER_VIEWS, type MemberView } from '@tenure/contracts'
import { t } from '@tenure/copy'
import {
  Button,
  Card,
  ChoiceGroup,
  type ChoiceOption,
  EmptyState,
  MagnifyingGlassIcon,
  Skeleton,
  SkeletonGroup,
  UserPlusIcon,
  useMediaQuery,
} from '@tenure/ui'
import { useSearchParams } from 'react-router'
import { FilterBar } from '../../../shared/filters/FilterBar.tsx'
import { useMemberFilters } from '../../../shared/filters/useMemberFilters.ts'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSession } from '../../../shared/session/session.ts'
import { useMemberList } from '../api.ts'
import { MemberCards } from '../components/MemberCards.tsx'
import { MembersSkeleton } from '../components/MembersSkeleton.tsx'
import { MemberTable } from '../components/MemberTable.tsx'
import styles from './Members.module.css'

/** The table from 48 rem, the cards below (FR-MEM-03). */
export const TABLE_QUERY = '(width >= 48rem)'

/** The URL parameter for the view; the default, First 90 days, leaves it out. */
const VIEW_PARAM = 'view'
const DEFAULT_VIEW: MemberView = 'first90'

const viewOptions: ChoiceOption<MemberView>[] = MEMBER_VIEWS.map((view) => ({
  value: view,
  label: t(`members.view.${view}`),
}))

const readView = (value: string | null): MemberView =>
  (MEMBER_VIEWS as readonly (string | null)[]).includes(value) ? (value as MemberView) : DEFAULT_VIEW

/**
 * /app/members (FR-MEM-01 to 04, 06): the view, the shared filter bar, and the members as a table or cards. The server
 * scopes and sorts each view; the filter bar narrows it here. A coach sees only their own members, with no coach
 * column or filter.
 */
export default function Members() {
  const owner = useSession().data?.user.role === 'owner'
  const [params, setParams] = useSearchParams()
  const view = readView(params.get(VIEW_PARAM))
  const list = useMemberList(view)
  const filters = useMemberFilters(list.data?.members)
  const wide = useMediaQuery(TABLE_QUERY)

  const setView = (next: MemberView) =>
    setParams(
      (now) => {
        const out = new URLSearchParams(now)
        if (next === DEFAULT_VIEW) out.delete(VIEW_PARAM)
        else out.set(VIEW_PARAM, next)
        return out
      },
      { replace: true },
    )

  let body
  if (list.data) {
    const { rows } = filters
    if (rows.length > 0) {
      const List = wide ? MemberTable : MemberCards
      body = (
        <>
          <p className={styles.count}>
            {rows.length === 1 ? t('members.count.one') : t('members.count', { n: rows.length })}
          </p>
          <List members={rows} showCoach={owner} />
        </>
      )
    } else if (filters.filtered) {
      const query = filters.bar.query.trim()
      body = (
        <Card>
          <EmptyState
            symbol={query === '' ? undefined : <MagnifyingGlassIcon />}
            title={query === '' ? t('board.empty') : t('board.empty.search', { query })}
            body={query === '' ? t('board.emptyBody') : t('board.empty.searchBody')}
            action={
              <Button variant="primary" onClick={filters.clear}>
                {t('board.emptyClear')}
              </Button>
            }
          />
        </Card>
      )
    } else {
      // The Archived view's empty state is no invitation to add someone, so it has no symbol.
      const archived = view === 'archived'
      body = (
        <Card>
          <EmptyState
            symbol={archived ? undefined : <UserPlusIcon />}
            title={t(archived ? 'members.empty.archived' : 'members.empty')}
            body={t(archived ? 'members.emptyArchived' : 'members.emptyNone')}
          />
        </Card>
      )
    }
  } else if (list.isError) {
    body = (
      <div className={styles.error}>
        <p role="alert">{list.error.message}</p>
        <Button variant="primary" loading={list.isFetching} onClick={() => void list.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  } else {
    // The count line and the table or cards, with placeholder rows, so nothing moves when the list lands.
    body = (
      <SkeletonGroup label={t('common.loading')} className={styles.page}>
        <Skeleton width="7em" className={styles.count} />
        <MembersSkeleton wide={wide} showCoach={owner} />
      </SkeletonGroup>
    )
  }

  return (
    <div className={styles.page}>
      <PageTitle title={t('members.title')} />
      <ChoiceGroup
        label={t('members.view')}
        hideLabel
        options={viewOptions}
        value={view}
        onChange={setView}
        className={styles.views}
      />
      <FilterBar bar={filters.bar} searchPlaceholder={t('members.search')} searchOwnLine />
      {body}
    </div>
  )
}
