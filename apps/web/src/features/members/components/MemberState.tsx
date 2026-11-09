import type { MemberSummary } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { StatusText } from '../../../shared/board/StatusText.tsx'
import { isPast90 } from '../text.ts'
import styles from './members.module.css'

/** The member's status tag, or "Past 90 days" in soft text from day 90 (answers.md, 7 Nov). */
export function MemberState({ member }: { member: Pick<MemberSummary, 'status' | 'daysSinceJoin'> }) {
  return isPast90(member) ? (
    <span className={styles.past}>{t('members.past90')}</span>
  ) : (
    <StatusText status={member.status} />
  )
}
