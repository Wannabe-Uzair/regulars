import { t } from '@tenure/copy'
import { buttonClass } from '@tenure/ui'
import { Link } from 'react-router'

/**
 * The small quiet "Open" at the end of a member row (FR-BOARD-02, FR-MEM-03): a link to the member page, named with
 * the member ("Open Sam O."), so its accessible name starts with the word it shows. It looks small, and ui's `sm`
 * keeps its target at 44 px wherever it is placed (NFR-USE-03).
 */
export function OpenMember({ id, name }: { id: number; name: string }) {
  return (
    <Link
      to={`/app/members/${id}`}
      className={buttonClass({ variant: 'quiet', size: 'sm' })}
      aria-label={t('a11y.openMember', { name })}
    >
      {t('common.open')}
    </Link>
  )
}
