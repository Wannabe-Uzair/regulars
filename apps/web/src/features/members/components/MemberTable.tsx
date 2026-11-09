import type { MemberSummary } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Table } from '@tenure/ui'
import { Link } from 'react-router'
import { useFrom } from '../back.ts'
import { fullName, lastVisitShort, paceWords, weekNumber } from '../text.ts'
import { MemberState } from './MemberState.tsx'
import styles from './members.module.css'

export type MemberListProps = {
  members: readonly MemberSummary[]
  /** Owners see each member's coach. */
  showCoach: boolean
}

/**
 * Members from 48 rem (FR-MEM-03): one row each, the full name the link to the member (a 44 px block), and the status
 * by its shape and word, never by a red name.
 */
export function MemberTable({ members, showCoach }: MemberListProps) {
  const state = useFrom()
  return (
    <Table label={t('members.title')} stickyFirstColumn ground="bg">
      <thead>
        <tr>
          <th scope="col">{t('members.col.name')}</th>
          <th scope="col">{t('member.status')}</th>
          {showCoach && <th scope="col">{t('member.coach')}</th>}
          <th scope="col" data-numeric>
            {t('members.col.week')}
          </th>
          <th scope="col" data-numeric>
            {t('members.col.pace')}
          </th>
          <th scope="col">{t('members.col.last')}</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.id}>
            <th scope="row">
              <Link to={`/app/members/${m.id}`} state={state} className={styles.nameLink}>
                {fullName(m)}
              </Link>
            </th>
            <td>
              <MemberState member={m} />
            </td>
            {showCoach && <td>{m.coachName ?? t('common.none')}</td>}
            <td className={styles.numbers} data-numeric>
              {t('members.weekCell', { n: weekNumber(m) })}
            </td>
            <td className={styles.numbers} data-numeric>
              {paceWords(m.pace)}
            </td>
            <td className={styles.nowrap}>{lastVisitShort(m.daysSinceLastVisit)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
