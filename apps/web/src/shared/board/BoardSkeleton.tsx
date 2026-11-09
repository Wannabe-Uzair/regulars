import { t } from '@tenure/copy'
import { Skeleton, Tag } from '@tenure/ui'
import { BoardLegend } from './BoardLegend.tsx'
import styles from './BoardTable.module.css'
import own from './BoardSkeleton.module.css'
import { WEEKS } from './weeks.ts'

/** The names' widths, in turn, so the placeholder rows read as names of different lengths. */
const NAMES = ['4.5em', '3.5em', '5em', '4em', '4.8em', '3.8em', '4.2em', '3.6em']

export type BoardSkeletonProps = {
  /** How many placeholder rows. */
  rows: number
  /** As BoardTable's: the pace column, the legend's look and the 44 px sorting head cells. */
  pace?: boolean
  legend?: 'compact' | 'full'
  sortable?: boolean
}

/**
 * The board while it loads: BoardTable's own table, head and legend, with placeholder rows in its cells, so each row
 * is the 44 px of the real name link and the week marks' size, and nothing moves when the members arrive. Hidden from
 * assistive technology by the SkeletonGroup round it.
 */
export function BoardSkeleton({ rows, pace = false, legend = 'compact', sortable = false }: BoardSkeletonProps) {
  // A sorting head cell is its 44 px button; here the same box, with nothing to press.
  const head = (words: string) => (sortable ? <span className={styles.sort}>{words}</span> : words)
  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.board}>
          <thead>
            <tr>
              <th scope="col" className={styles.name}>
                {head(t('board.head.member'))}
              </th>
              <th scope="colgroup" colSpan={WEEKS} className={styles.weeksHead}>
                {head(t('today.board.head.weeks'))}
              </th>
              {pace && (
                <th scope="col" className={styles.paceHead}>
                  {head(t('members.col.pace'))}
                </th>
              )}
              <th scope="col" className={styles.statusHead}>
                {head(t('today.board.head.status'))}
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                <th scope="row" className={styles.name}>
                  <span className={`${styles.link} ${own.name}`}>
                    <Skeleton width={NAMES[row % NAMES.length]} />
                  </span>
                </th>
                {Array.from({ length: WEEKS }, (_, week) => (
                  <td key={week} className={styles.cell}>
                    <Skeleton shape="block" className={own.mark} />
                  </td>
                ))}
                {pace && (
                  <td className={styles.paceCell}>
                    <Skeleton width="3em" className={own.pace} />
                  </td>
                )}
                <td className={styles.statusCell}>
                  {/* A status tag's outline round a placeholder for its words, at the tag's own height. */}
                  <Tag>
                    <Skeleton width="4.8em" />
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BoardLegend look={legend} />
    </div>
  )
}
