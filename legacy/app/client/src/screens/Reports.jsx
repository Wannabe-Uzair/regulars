import { Kpi, LineChart, PageTitle, Panel } from '../components'
import { useApi } from '../api.js'
import { t } from '../copy.js'
import { LoadError, Section, monthLabel } from '../components/admin/parts.jsx'
import '../components/admin/admin.css'

// Reports (owner, SPEC §6 /api/reports): cohorts, visits by week since joining, nudge results.
export default function Reports() {
  const { data, error } = useApi('/reports')
  return (
    <div className="admin">
      <PageTitle>{t('reports.title')}</PageTitle>
      <LoadError error={error} />
      {data && <>
        <Section title={t('reports.cohorts.title')} explain={t('reports.cohorts.explain')}>
          <Panel><Cohorts rows={data.cohorts} /></Panel>
        </Section>
        <Section title={t('reports.visits.title')} explain={t('reports.visits.explain')}>
          <Panel>
            <LineChart data={data.visitsByWeek} title={t('a11y.chart')} />
            <p className="meta" style={{ marginTop: 12 }}>{t('reports.chart.stillDef')}</p>
          </Panel>
        </Section>
        <Section title={t('reports.nudges.title')} explain={t('reports.nudges.explain')}>
          <div className="kpi-row">
            <Kpi label={t('reports.nudges.sent')} value={data.nudges.sent} />
            <Kpi label={t('reports.nudges.cameBack')} value={data.nudges.cameBack} />
            <Kpi label={t('reports.nudges.rate')} value={data.nudges.rate} suffix="%" />
          </div>
        </Section>
      </>}
    </div>
  )
}

function Cohorts({ rows }) {
  const pct = (v) => (v == null ? <td className="none">{t('common.none')}</td> : <td>{v}%</td>)
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{t('reports.col.month')}</th>
            <th scope="col">{t('reports.col.members')}</th>
            <th scope="col">{t('reports.col.day30')}</th>
            <th scope="col">{t('reports.col.day60')}</th>
            <th scope="col">{t('reports.col.day90')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{monthLabel(r.month)}</th>
              <td>{r.joined}</td>
              {pct(r.day30)}{pct(r.day60)}{pct(r.day90)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
