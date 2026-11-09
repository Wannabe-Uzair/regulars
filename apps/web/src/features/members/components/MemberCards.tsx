import { t } from '@tenure/copy'
import { Card } from '@tenure/ui'
import { Link } from 'react-router'
import { WeekRow } from '../../../shared/board/WeekRow.tsx'
import { useFrom } from '../back.ts'
import { fullName, rowMeta } from '../text.ts'
import { MemberState } from './MemberState.tsx'
import type { MemberListProps } from './MemberTable.tsx'
import styles from './members.module.css'

/**
 * Members below 48 rem (FR-MEM-03): one inset grouped list, as the board's phone list, a row each and the whole row one
 * link to the member. The name is the link, a 44 px block whose `::after` covers the row; beside it the status, under
 * it a week · pace · last visit line, the coach for an owner, and the 13 week marks. Nothing else in a row can be
 * pressed.
 */
export function MemberCards({ members, showCoach }: MemberListProps) {
  const state = useFrom()
  return (
    <Card>
      <ul className={styles.rows} aria-label={t('members.title')}>
        {members.map((m) => (
          <li key={m.id} className={styles.row}>
            <div className={styles.rowHead}>
              <Link to={`/app/members/${m.id}`} state={state} className={`${styles.rowName} ${styles.rowLink}`}>
                {fullName(m)}
              </Link>
              <MemberState member={m} />
            </div>
            <p className={styles.meta}>{rowMeta(m)}</p>
            {showCoach && m.coachName !== null && (
              <p className={styles.meta}>{t('member.meta.coach', { name: m.coachName })}</p>
            )}
            <WeekRow member={m} size="sm" />
          </li>
        ))}
      </ul>
    </Card>
  )
}
