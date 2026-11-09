// The member page's 90 days, visits and nudges (FR-MEMBER-01), at the gym's dates and times.
import type { MemberDetail, MemberPageCheckin, MemberPageDay, MemberPageNudge } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { WINDOW_DAYS } from '@tenure/domain'
import { DaysGrid, type DayKind, Panel, Tag } from '@tenure/ui'
import { useGymFormat } from '../../../shared/format/useGymFormat.ts'
import { isPast90, weekNumber } from '../text.ts'
import styles from './History.module.css'

/**
 * Each day as the board's legend draws it: visited, a past day missed, or a day still to come. Today counts as missed
 * only once it is over, so until a visit it is still to come.
 */
function dayKinds(days: readonly MemberPageDay[], daysSinceJoin: number): DayKind[] {
  return days.map((d) => (d.visited ? 'visited' : d.day < daysSinceJoin ? 'missed' : 'ahead'))
}

/** "12 visits in the first 40 days", today included, up to the 90. */
function daysLabel(days: readonly MemberPageDay[], daysSinceJoin: number): string {
  const n = days.filter((d) => d.visited).length
  const d = Math.max(0, Math.min(daysSinceJoin + 1, WINDOW_DAYS))
  return n === 1 ? t('a11y.days.one', { n, d }) : t('a11y.days.many', { n, d })
}

/**
 * The 90 days as 13 weeks (flow-5C): the week numbers above the columns, hidden from screen readers since the label
 * says it all, and the week in progress ringed, a shape and not a colour alone. From day 90 no week is in progress.
 */
export function DaysPanel({ member, days }: { member: MemberDetail; days: readonly MemberPageDay[] }) {
  return (
    <Panel heading={t('member.days.title')}>
      <DaysGrid
        days={dayKinds(days, member.daysSinceJoin)}
        label={daysLabel(days, member.daysSinceJoin)}
        weekNumbers
        currentWeek={isPast90(member) ? undefined : weekNumber(member)}
      />
    </Panel>
  )
}

export function CheckinsPanel({ checkins }: { checkins: readonly MemberPageCheckin[] }) {
  const format = useGymFormat()
  return (
    <Panel heading={t('member.checkins.title')}>
      {checkins.length === 0 ? (
        <p className={styles.empty}>{t('member.checkins.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {checkins.map((c, i) => (
            <li key={`${c.at}#${i}`} className={styles.checkin}>
              <time dateTime={c.at}>{format.dateTime(c.at)}</time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

const channelWords = {
  text: 'nudges.channel.text',
  whatsapp: 'nudges.channel.whatsapp',
  copy: 'nudges.channel.copy',
  'in-person': 'nudges.channel.inPerson',
} as const

export function NudgesPanel({ nudges }: { nudges: readonly MemberPageNudge[] }) {
  const format = useGymFormat()
  return (
    <Panel heading={t('member.nudges.title')}>
      {nudges.length === 0 ? (
        <p className={styles.empty}>{t('member.nudges.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {nudges.map((n) => (
            <li key={n.id} className={styles.nudge}>
              <div className={styles.nudgeHead}>
                <time dateTime={n.at} className={styles.when}>
                  {format.dateTime(n.at)}
                </time>
                {n.by !== null && <span>{n.by}</span>}
                {n.channel !== null && <span className={styles.channel}>{t(channelWords[n.channel])}</span>}
                {n.cameBack && <Tag>{t('member.nudges.cameBack')}</Tag>}
              </div>
              <p className={styles.body}>{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
