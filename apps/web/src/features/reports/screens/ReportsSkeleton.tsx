import { t } from '@tenure/copy'
import { Panel, Skeleton, SkeletonGroup, Table } from '@tenure/ui'
import { CHART_HEIGHT } from '../chart-layout.ts'
import cohortStyles from '../components/CohortTable.module.css'
import barStyles from '../components/NudgeBar.module.css'
import chartStyles from '../components/VisitsChart.module.css'
import styles from './Reports.module.css'
import own from './ReportsSkeleton.module.css'

/** The cohort table's placeholder rows (join months). */
const MONTHS = 4

/**
 * Reports while it loads (FR-REPORT-01 to 04): the three panels in order, each with its explaining sentence in words, a
 * placeholder where its takeaway title will be, and the figure's own frame: the nudges' capsule and legend, the chart's
 * box at its height with its caption, the cohort table's head over placeholder rows. Nothing moves when the figures land.
 */
export function ReportsSkeleton() {
  const legend = [t('reports.nudges.cameBack'), t('reports.nudges.noVisit'), t('reports.nudges.waiting')]
  return (
    <SkeletonGroup label={t('common.loading')} className={styles.page}>
      <Panel className={own.panel} heading={<Skeleton width="55%" />}>
        <div className={styles.section}>
          <p className={styles.explain}>{t('reports.nudges.explain')}</p>
          <div className={barStyles.nudgeBar}>
            <Skeleton shape="block" className={barStyles.bar} />
            <ul className={barStyles.legend}>
              {legend.map((label) => (
                <li key={label} className={barStyles.item}>
                  <Skeleton shape="block" className={barStyles.swatch} />
                  <span className={barStyles.label}>{label}</span>
                  <Skeleton width="1.2em" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>
      <Panel className={own.panel} heading={<Skeleton shape="lines" count={2} width="65%" className={own.title} />}>
        <div className={styles.section}>
          <p className={styles.explain}>{t('reports.visits.explain')}</p>
          <figure className={chartStyles.figure}>
            <div className={chartStyles.box} style={{ blockSize: CHART_HEIGHT }}>
              <Skeleton shape="block" className={own.chart} />
            </div>
            <figcaption className={chartStyles.caption}>
              <span>{t('reports.chart.axis')}</span>
              <span>{t('reports.chart.stillDef')}</span>
            </figcaption>
          </figure>
        </div>
      </Panel>
      <Panel className={own.panel} heading={<Skeleton shape="lines" count={3} width="60%" className={own.title} />}>
        <div className={styles.section}>
          <p className={styles.explain}>{t('reports.cohorts.explain')}</p>
          <Table label={t('reports.cohorts.title')} stickyFirstColumn className={cohortStyles.cohorts}>
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
              {Array.from({ length: MONTHS }, (_, row) => (
                <tr key={row}>
                  <th scope="row" className={cohortStyles.month}>
                    <Skeleton width="4.5em" />
                  </th>
                  {Array.from({ length: 4 }, (_, cell) => (
                    <td key={cell} data-numeric="">
                      <Skeleton width="2.2em" className={own.figure} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Panel>
    </SkeletonGroup>
  )
}
