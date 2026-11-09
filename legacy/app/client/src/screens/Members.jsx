import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import { useIsPhone } from '../util.js'
import { EmptyState, Field, Input, MemberCard, PageTitle, Panel, StatusTag } from '../components'
import { CoachFilter, membersPath, useDebounced } from './Board.jsx'
import { countText, ErrorLine, lastVisitShort, Loading, paceLong, StatusChips, weekCell } from '../components/core/bits.jsx'
import '../components/core/core.css'

// Members list (SPEC §7 /members): search, filters, rows with status, week, pace and last visit.
export default function Members() {
  const { role } = useMe()
  const phone = useIsPhone()
  const [status, setStatus] = useState('all')
  const [coach, setCoach] = useState('')
  const [q, setQ] = useState('')
  const dq = useDebounced(q)
  const res = useApi(membersPath({ status, coach, q: dq }))
  const list = res.data
  const clear = () => { setStatus('all'); setCoach(''); setQ('') }

  return (
    <>
      <PageTitle>{t('members.title')}</PageTitle>
      <div className="core-filters">
        <Field label={t('common.search')}>
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('members.search')} />
        </Field>
        <StatusChips value={status} onChange={setStatus} />
        {role === 'owner' && <CoachFilter value={coach} onChange={setCoach} />}
      </div>
      <ErrorLine error={res.error} />
      {!list ? <Loading />
        : list.length === 0
          ? <Panel><EmptyState title={t('members.empty')} action={{ label: t('board.emptyClear'), onClick: clear }}>{t('members.emptyBody')}</EmptyState></Panel>
          : (
            <>
              <p className="meta core-count" role="status">{countText(list.length)}</p>
              {phone
                ? (
                  <ul className="member-cards">
                    {list.map((m) => <MemberCard key={m.id} member={m} meta={[weekCell(m), paceLong(m.pace), lastVisitShort(m.daysSinceLastVisit)].join(' · ')} />)}
                  </ul>
                )
                : (
                  <Panel>
                    <table className="core-table">
                      <thead>
                        <tr>
                          <th scope="col">{t('members.col.name', {}, 'NAME')}</th>
                          <th scope="col">{t('member.status')}</th>
                          {role === 'owner' && <th scope="col">{t('member.coach')}</th>}
                          <th scope="col">{t('members.col.week')}</th>
                          <th scope="col">{t('members.col.pace')}</th>
                          <th scope="col">{t('members.col.last')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((m) => (
                          <tr key={m.id} className={m.status === 'slipping' ? 'flag' : undefined}>
                            <td><Link to={`/members/${m.id}`}>{m.name}</Link></td>
                            <td><StatusTag status={m.status} /></td>
                            {role === 'owner' && <td className="meta">{m.coachName ?? t('common.none')}</td>}
                            <td className="data">{weekCell(m)}</td>
                            <td className="data">{paceLong(m.pace)}</td>
                            <td className="data">{lastVisitShort(m.daysSinceLastVisit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Panel>
                )}
            </>
          )}
    </>
  )
}
