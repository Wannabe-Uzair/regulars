import { Link } from 'react-router-dom'
import { useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import { fmtDate } from '../util.js'
import { EmptyState, PageTitle, Panel } from '../components'
import { useLiveEvents } from '../components/core/useLiveEvents.js'
import { ErrorLine, Loading } from '../components/core/bits.jsx'
import '../components/core/core.css'

const WEEK_MS = 7 * 86400000

// Nudge history (SPEC §7 /nudges): the last 30 days, with CAME BACK marks. A coach sees their own.
export default function Nudges() {
  const { role } = useMe()
  const res = useApi('/nudges?days=30')
  useLiveEvents({ nudge: res.reload, checkin: res.reload })
  const list = res.data
  const sub = role === 'coach' ? t('nudges.subCoach', {}, 'Your nudges, last 30 days.') : t('nudges.sub')
  return (
    <>
      <PageTitle sub={sub}>{t('nudges.title')}</PageTitle>
      <ErrorLine error={res.error} />
      {!list ? <Loading /> : list.length === 0
        ? <Panel><EmptyState title={t('nudges.empty')}>{t('nudges.emptyBody')}</EmptyState></Panel>
        : (
          <Panel>
            <ul className="list">
              {list.map((n) => (
                <li key={n.id} className="core-nudge">
                  <div className="core-nudge-top">
                    <Link className="action-name" to={`/members/${n.memberId}`}>{n.memberName}</Link>
                    {n.cameBack
                      ? <span className="tag">{t('nudges.cameBack')}</span>
                      : <span className="meta">{Date.now() - Date.parse(n.at) < WEEK_MS ? t('nudges.waiting') : t('nudges.noVisit')}</span>}
                  </div>
                  <span className="meta">{[fmtDate(n.at), n.by].filter(Boolean).join(' · ')}</span>
                  <p className="body">{n.body}</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}
    </>
  )
}
