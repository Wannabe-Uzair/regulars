import { t } from '@tenure/copy'
import { Card, Skeleton, Table, Tag } from '@tenure/ui'
import { WEEKS } from '../../../shared/board/weeks.ts'
import styles from './members.module.css'
import own from './MembersSkeleton.module.css'

/** The placeholder rows, the names' widths in turn. */
const NAMES = ['5.5em', '4em', '5em', '4.5em', '5.2em', '4.2em']

export type MembersSkeletonProps = {
  /** The table from 48 rem, the cards below (FR-MEM-03), as the loaded list. */
  wide: boolean
  /** Owners see each member's coach. */
  showCoach: boolean
}

/**
 * Members while the list loads, under the count line's placeholder: MemberTable's table with its header in words, or
 * MemberCards' grouped rows, with placeholders in each row's cells, at the real rows' heights (the name link's 44 px
 * block), so nothing moves when the members arrive. Inside the screen's SkeletonGroup, which hides it from assistive technology.
 */
export function MembersSkeleton({ wide, showCoach }: MembersSkeletonProps) {
  return (
    <>
      {wide ? (
        <Table label={t('members.title')} stickyFirstColumn ground="bg">
          <thead>
            <tr>
              <th scope="col">{t('members.col.name')}</th>
              <th scope="col">{t('member.status')}</th>
              {showCoach && <th scope="col">{t('member.coach')}</th>}
              <th scope="col">{t('members.col.week')}</th>
              <th scope="col">{t('members.col.pace')}</th>
              <th scope="col">{t('members.col.last')}</th>
            </tr>
          </thead>
          <tbody>
            {NAMES.map((width) => (
              <tr key={width}>
                <th scope="row">
                  <span className={styles.nameLink}>
                    <Skeleton width={width} />
                  </span>
                </th>
                <td>
                  <StatusPlaceholder />
                </td>
                {showCoach && (
                  <td>
                    <Skeleton width="4.5em" />
                  </td>
                )}
                <td>
                  <Skeleton width="3.5em" />
                </td>
                <td>
                  <Skeleton width="4em" />
                </td>
                <td>
                  <Skeleton width="5.5em" />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Card>
          <ul className={styles.rows}>
            {NAMES.map((width) => (
              <li key={width} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={`${styles.rowName} ${styles.rowLink}`}>
                    <Skeleton width={width} />
                  </span>
                  <StatusPlaceholder />
                </div>
                <Skeleton width="80%" className={styles.meta} />
                {showCoach && <Skeleton width="45%" className={styles.meta} />}
                <span className={own.weeks}>
                  {Array.from({ length: WEEKS }, (_, week) => (
                    <Skeleton key={week} shape="block" className={own.mark} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

/** A status tag's outline round a placeholder for its words, at the tag's own height. */
function StatusPlaceholder() {
  return (
    <Tag aria-hidden="true">
      <Skeleton width="4.5em" />
    </Tag>
  )
}
