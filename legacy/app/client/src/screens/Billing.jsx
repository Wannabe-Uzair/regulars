import { Button, PageTitle, Panel, Tape, useToast } from '../components'
import { useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import { pilotDay } from '../util.js'
import { LoadError } from '../components/admin/parts.jsx'
import '../components/admin/admin.css'

// Billing (owner, SPEC §6 /api/billing): pilot day N of 90 on the 3-segment tape, then $99 a month.
// There are no payments: the plan button only says so.
export default function Billing() {
  const { gym } = useMe()
  const { data, error } = useApi('/billing')
  const toast = useToast()
  const day = data?.pilotDay ?? pilotDay(gym)
  return (
    <div className="admin">
      <PageTitle>{t('billing.title')}</PageTitle>
      <LoadError error={error} />
      {day != null && (
        <Panel className="billing">
          <div className="admin-sec">
            <h2 className="section-title">{t('billing.pilot', { n: day })}</h2>
            <Tape filled={day / 30} />
          </div>
          {/* one line per sentence, so the price never breaks mid-phrase */}
          <p className="offer">{t('billing.offer').split(/(?<=\.)\s+/).map((s, i) => <span key={i}>{s}</span>)}</p>
          <div className="lines">
            <p className="body">{t('billing.flat')}</p>
            <p className="body">{t('billing.payback')}</p>
          </div>
          <div className="plan">
            <Button onClick={() => toast(t('billing.notLive'))}>{t('billing.plan')}</Button>
            <p className="meta">{t('billing.notLive')}</p>
          </div>
        </Panel>
      )}
    </div>
  )
}
