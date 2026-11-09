import type { CohortRow } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Table } from '@tenure/ui'
import { useGymFormat } from '../../../shared/format/useGymFormat.ts'
import styles from './CohortTable.module.css'

const percent = (value: number | null) => (value === null ? t('common.none') : `${value}%`)

/**
 * The cohorts by join month (FR-REPORT-01): each month's members and the share still coming at day 30, 60 and 90, or
 * "—" while none of them is that far in. The month is in the gym's locale (FR-REPORT-03). On a phone the cells tighten so
 * the five columns fit side by side (FR-REPORT-04); wider than that, the table scrolls inside its own box, holding the
 * month column still.
 */
export function CohortTable({ cohorts }: { cohorts: readonly CohortRow[] }) {
  const format = useGymFormat()
  return (
    <Table label={t('reports.cohorts.title')} stickyFirstColumn className={styles.cohorts}>
      <thead>
        <tr>
          <th scope="col">{t('reports.col.month')}</th>
          <th scope="col" data-numeric="">
            {t('reports.col.members')}
          </th>
          <th scope="col" data-numeric="">
            {t('reports.col.day30')}
          </th>
          <th scope="col" data-numeric="">
            {t('reports.col.day60')}
          </th>
          <th scope="col" data-numeric="">
            {t('reports.col.day90')}
          </th>
        </tr>
      </thead>
      <tbody>
        {cohorts.map((c) => (
          <tr key={c.month}>
            <th scope="row" className={styles.month}>
              {format.month(c.month)}
            </th>
            <td data-numeric="">{c.joined}</td>
            <td data-numeric="">{percent(c.day30)}</td>
            <td data-numeric="">{percent(c.day60)}</td>
            <td data-numeric="">{percent(c.day90)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
