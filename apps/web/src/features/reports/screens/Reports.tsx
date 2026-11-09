import type { ReportsResponse } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { Button, Panel, RollingNumber } from '@tenure/ui'
import { useGymFormat } from '../../../shared/format/useGymFormat.ts'
import { PageTitle } from '../../../shared/page/PageTitle.tsx'
import { useReports } from '../api.ts'
import { CohortTable } from '../components/CohortTable.tsx'
import { NudgeBar } from '../components/NudgeBar.tsx'
import { VisitsChart } from '../components/VisitsChart.tsx'
import { cohortsLead, nudgesLead, visitsLead } from '../takeaways.ts'
import styles from './Reports.module.css'
import { ReportsSkeleton } from './ReportsSkeleton.tsx'

/**
 * /app/reports, owner only (FR-REPORT-01 to 04, COPY §9): the nudges' result over its part-to-whole bar, then the
 * visits-by-week chart, then the cohorts by join month, each section titled by its takeaway (takeaways.ts). Live events
 * refresh it (index.ts); it only reads.
 */
export default function Reports() {
  const reports = useReports()

  let body
  if (reports.data) {
    body = <Figures report={reports.data} />
  } else if (reports.isError) {
    body = (
      <div className={styles.error}>
        <p role="alert">{reports.error.message}</p>
        <Button variant="primary" loading={reports.isFetching} onClick={() => void reports.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  } else {
    body = <ReportsSkeleton />
  }

  return (
    <div className={styles.page}>
      <PageTitle title={t('reports.title')} />
      {body}
    </div>
  )
}

function Figures({ report }: { report: ReportsResponse }) {
  const format = useGymFormat()
  return (
    <>
      <Panel
        className={styles.panel}
        heading={
          <span className={styles.takeaway}>
            <RollingNumber value={nudgesLead(report.nudges)} />
          </span>
        }
      >
        <div className={styles.section}>
          <p className={styles.explain}>{t('reports.nudges.explain')}</p>
          <NudgeBar nudges={report.nudges} />
        </div>
      </Panel>
      <Panel
        className={styles.panel}
        heading={<span className={styles.takeaway}>{visitsLead(report.visitsByWeek)}</span>}
      >
        <div className={styles.section}>
          <p className={styles.explain}>{t('reports.visits.explain')}</p>
          <VisitsChart rows={report.visitsByWeek} line={report.line} />
        </div>
      </Panel>
      <Panel
        className={styles.panel}
        heading={<span className={styles.takeaway}>{cohortsLead(report.cohorts, format.month)}</span>}
      >
        <div className={styles.section}>
          <p className={styles.explain}>{t('reports.cohorts.explain')}</p>
          <CohortTable cohorts={report.cohorts} />
        </div>
      </Panel>
    </>
  )
}
