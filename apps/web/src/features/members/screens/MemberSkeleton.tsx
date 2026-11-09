import { t } from '@tenure/copy'
import { Card, FactList, Panel, Skeleton, SkeletonGroup } from '@tenure/ui'
import titleStyles from '../../../shared/page/PageTitle.module.css'
import factStyles from '../components/Facts.module.css'
import historyStyles from '../components/History.module.css'
import styles from './Member.module.css'
import own from './MemberSkeleton.module.css'

/** Placeholder visits and nudges, the lines' widths in turn. */
const VISITS = ['11em', '10em', '11.5em']
const NUDGES = ['90%', '75%']

/**
 * The member page's head while it loads, after its h1 (which says "Loading…" to assistive technology and is hidden from
 * sight meanwhile, see `loadingHead`): the name in the title's own type, the status and last visit line, and Nudge's
 * capsule, so the head is the loaded head's height.
 */
export function MemberHeadSkeleton() {
  return (
    <>
      <Skeleton width="8.5em" className={titleStyles.title} />
      <span className={styles.state}>
        <Skeleton width="15em" />
      </span>
      <span className={styles.nudge}>
        <Skeleton shape="block" className={own.nudge} />
      </span>
    </>
  )
}

/**
 * The rest of the member page while it loads (FR-MEMBER-01): the facts' card with their labels, the 90 days' grid as
 * one shape of its size, and the visits and nudges panels with placeholder rows, each under its real heading.
 */
export function MemberSkeleton({ owner }: { owner: boolean }) {
  // Owners have a Change button beside three facts, 44 px high: the room is kept so the card doesn't grow.
  const change = owner ? <span className={own.change} /> : undefined
  return (
    <SkeletonGroup className={styles.page}>
      <Card>
        <FactList
          className={factStyles.facts}
          items={[
            { label: t('member.name'), value: <Skeleton width="8em" />, action: change },
            { label: t('member.coach'), value: <Skeleton width="6em" />, action: change },
            { label: t('member.phone'), value: <Skeleton width="7.5em" />, action: change },
            { label: t('member.joinedOn'), value: <Skeleton width="5.5em" /> },
          ]}
        />
      </Card>
      <Panel heading={t('member.days.title')}>
        <Skeleton shape="block" className={own.days} />
      </Panel>
      <div className={styles.columns}>
        <Panel heading={t('member.checkins.title')}>
          <ul className={historyStyles.list}>
            {VISITS.map((width) => (
              <li key={width} className={historyStyles.checkin}>
                <Skeleton width={width} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel heading={t('member.nudges.title')}>
          <ul className={historyStyles.list}>
            {NUDGES.map((width) => (
              <li key={width} className={historyStyles.nudge}>
                <span className={historyStyles.nudgeHead}>
                  <Skeleton width="13em" />
                </span>
                <Skeleton width={width} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </SkeletonGroup>
  )
}
