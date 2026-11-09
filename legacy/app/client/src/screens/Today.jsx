import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import { fmtTime, useIsPhone } from '../util.js'
import { Board, Button, Hazard, Kpi, MemberCard, MemberRow, PageTitle, Panel } from '../components'
import NudgeComposer from '../components/core/NudgeComposer.jsx'
import { useLiveReload } from '../components/core/useLiveEvents.js'
import { ErrorLine, Loading, slippingMeta } from '../components/core/bits.jsx'
import '../components/core/core.css'

const BOARD_ROWS = 12

// Today (SPEC §7 /, DESIGN §12). Owner: TODAY; coach: MY MEMBERS (the server scopes the data). Live via /api/events.
export default function Today() {
  const { role, gym } = useMe()
  const phone = useIsPhone()
  const today = useApi('/today')
  const slam = useLiveReload({ data: today.data, reload: today.reload })
  const [nudging, setNudging] = useState(null)
  const title = role === 'coach' ? t('today.coach.title') : t('today.owner.title')
  const d = today.data

  if (!d) return <><PageTitle>{title}</PageTitle>{today.error ? <ErrorLine error={today.error} /> : <Loading />}</>
  if (d.board.length === 0) return <><PageTitle>{title}</PageTitle><NoMembers owner={role === 'owner'} /></>

  const tz = gym?.timezone
  const byId = new Map(d.board.map((m) => [m.id, m]))
  const slipping = d.slipping.length > 0
  const k = d.kpis
  const kpis = (
    <div className="grid-4">
      <Kpi label={t('today.kpi.new')} value={k.newMembers} />
      <Kpi label={t('today.kpi.onLine')} value={k.onTheLinePct} suffix="%" tone="on" />
      <Kpi label={t('today.kpi.slipping')} value={k.slipping} tone="slipping" />
      <Kpi label={t('today.kpi.nudged')} value={k.nudgedThisWeek} />
    </div>
  )
  const checkins = d.checkinsToday.length === 0
    ? <p className="body core-empty-line">{t('today.checkins.empty')}</p>
    : (
      <ul className="list">
        {d.checkinsToday.map((c) => (
          <li key={`${c.memberId}-${c.at}`} className="core-checkin">
            <Link className="action-name" to={`/members/${c.memberId}`}>{c.name}</Link>
            <span className="data">{fmtTime(c.at, tz)}</span>
          </li>
        ))}
      </ul>
    )
  const board = (
    <Panel title={t('today.board.title')} action={<Button variant="quiet" to="/board">{t('today.board.open', {}, 'OPEN THE BOARD')}</Button>}>
      <Board members={d.board.slice(0, BOARD_ROWS)} slam={slam} pace={!phone} status={!phone}
        highlightId={d.slipping[0]?.id} onNudge={setNudging} />
    </Panel>
  )
  const composer = <NudgeComposer member={nudging && (byId.get(nudging.id) ?? nudging)} onClose={() => setNudging(null)} onSent={today.reload} />

  if (phone) {
    return (
      <>
        {slipping && <Hazard className="core-phone-hazard" />}
        <PageTitle>{title}</PageTitle>
        <div className="core-today">
          {kpis}
          <section className="core-sec" aria-labelledby="sec-slipping">
            <h2 className="section-title" id="sec-slipping">{t('today.slipping.title')}</h2>
            {slipping
              ? <ul className="member-cards">{d.slipping.map((m) => <MemberCard key={m.id} member={m} meta={slippingMeta(m)} onNudge={setNudging} />)}</ul>
              : <p className="body core-empty-line">{t('today.slipping.empty')}</p>}
          </section>
          <Panel title={t('today.checkins.title')}>{checkins}</Panel>
          {board}
        </div>
        {composer}
      </>
    )
  }
  return (
    <>
      <PageTitle>{title}</PageTitle>
      <div className="core-today">
        {kpis}
        <div className="core-today-cols">
          <Panel title={t('today.slipping.title')} hazard={slipping}>
            {slipping
              ? <ul className="list">{d.slipping.map((m) => <MemberRow key={m.id} member={m} meta={slippingMeta(m)} onNudge={setNudging} />)}</ul>
              : <p className="body core-empty-line">{t('today.slipping.empty')}</p>}
          </Panel>
          <Panel title={t('today.checkins.title')}>{checkins}</Panel>
        </div>
        {board}
      </div>
      {composer}
    </>
  )
}

// After sign-up: no members yet (COPY §4 empty gym). Owner gets IMPORT YOUR MEMBERS and OPEN THE KIOSK.
function NoMembers({ owner }) {
  const settings = useApi(owner ? '/settings' : null)
  let kiosk = null
  try { kiosk = settings.data?.kioskUrl ? new URL(settings.data.kioskUrl).pathname : null } catch { kiosk = null }
  return (
    <Panel>
      <div className="empty">
        <h2 className="section-title">{t('today.empty.title')}</h2>
        <p className="body">{owner ? t('today.empty.body') : t('today.empty.coach')}</p>
        {owner && (
          <div className="btn-row">
            <Button to="/settings#import">{t('today.empty.import')}</Button>
            {kiosk && <Button variant="secondary" to={kiosk}>{t('today.empty.kiosk')}</Button>}
          </div>
        )}
      </div>
    </Panel>
  )
}
