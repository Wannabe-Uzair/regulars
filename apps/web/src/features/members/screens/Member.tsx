import { t } from '@tenure/copy'
import { Button, buttonClass, Card, Tag } from '@tenure/ui'
import { Link, useParams } from 'react-router'
import { ApiRequestError } from '../../../shared/api/client.ts'
import { NudgeButton } from '../../../shared/nudge/NudgeButton.tsx'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useSession } from '../../../shared/session/session.ts'
import { useMember } from '../api.ts'
import { ArchiveActions } from '../components/ArchiveActions.tsx'
import { BackLink } from '../components/BackLink.tsx'
import { Facts } from '../components/Facts.tsx'
import { CheckinsPanel, DaysPanel, NudgesPanel } from '../components/History.tsx'
import { MemberState } from '../components/MemberState.tsx'
import { fullName, lastVisitLong } from '../text.ts'
import styles from './Member.module.css'
import skeletonStyles from './MemberSkeleton.module.css'
import { MemberHeadSkeleton, MemberSkeleton } from './MemberSkeleton.tsx'

/** A route id the API could know: a positive integer. Anything else is not found without asking. */
const readId = (param: string | undefined): number | null => (param && /^[1-9]\d*$/.test(param) ? Number(param) : null)

/**
 * /app/members/:id (FR-MEMBER-01 to 08). The loading, error and loaded views start with the way back (FR-MEMBER-08),
 * then the h1, which is there from the start, so focus after navigating lands on it and it never moves when the data
 * arrives (FR-SHELL-06).
 */
export default function Member() {
  const id = readId(useParams().id)
  return id === null ? notFound(t('api.memberNotFound')) : <MemberPage id={id} />
}

function MemberPage({ id }: { id: number }) {
  const session = useSession().data
  const owner = session?.user.role === 'owner'
  const page = useMember(id)

  // Every state keeps the h1 in one place, so the focus the router gave it stays when the data arrives.
  if (!page.data) {
    if (page.isError && page.error instanceof ApiRequestError && page.error.status === 404) {
      return notFound(page.error.message)
    }
    return (
      <div className={styles.page}>
        <BackLink />
        <div className={page.isError ? styles.head : `${styles.head} ${skeletonStyles.loadingHead}`}>
          <PageTitle title={page.isError ? t('members.title') : t('common.loading')} />
          {!page.isError && <MemberHeadSkeleton />}
        </div>
        {page.isError ? (
          <div className={styles.error}>
            <p role="alert">{page.error.message}</p>
            <Button variant="primary" loading={page.isFetching} onClick={() => void page.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <MemberSkeleton owner={owner} />
        )}
      </div>
    )
  }

  const { member, days, checkins, nudges } = page.data
  const archived = member.archivedAt !== null
  return (
    <div className={styles.page}>
      <BackLink />
      {/* The contact card's head (flow-5C): the name, then the status and the last visit, then Nudge. */}
      <div className={styles.head}>
        <PageTitle title={fullName(member)} />
        <p className={styles.state}>
          {archived ? <Tag>{t('member.archived')}</Tag> : <MemberState member={member} />}
          <span className={styles.lastVisit}>{lastVisitLong(member.daysSinceLastVisit)}</span>
        </p>
        {!archived && (
          <div className={styles.nudge}>
            <NudgeButton member={member} />
          </div>
        )}
      </div>
      <Card>
        <Facts member={member} canEdit={owner} />
      </Card>
      <DaysPanel member={member} days={days} />
      <div className={styles.columns}>
        <CheckinsPanel checkins={checkins} />
        <NudgesPanel nudges={nudges} />
      </div>
      {/* The shared demo gym is not for archiving or deleting: its members stay put between visitors. */}
      {session?.gym.isDemo ? null : <ArchiveActions member={member} canDelete={owner} />}
    </div>
  )
}

/**
 * Another coach's member, a member of another gym, or an id that names no one: the server's sentence and a way back.
 * A plain function, not a component, so a 404 arriving after the loading view keeps its h1 (and the focus on it). It
 * looks as Page Not Found does (B2-09): the title at the top of the page, then the sentence and one tinted way back,
 * 16 px apart.
 */
function notFound(message: string) {
  return (
    <div className={styles.page}>
      {/* The back link's place, held empty so the h1 stays the same element: "Back to Members" below is the way back,
          and a back link of the same name above it would say it twice. */}
      {null}
      <div className={`${styles.head} ${styles.missing}`}>
        <PageTitle title={t('member.notFound.title')} />
        <p className={styles.notFound}>{message}</p>
        <Link to="/app/members" className={buttonClass({ variant: 'tinted' })}>
          {t('member.notFound.back')}
        </Link>
      </div>
    </div>
  )
}
