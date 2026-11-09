import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, useApi, useMe } from '../api.js'
import { t } from '../copy.js'
import { fmtDate, fmtTime } from '../util.js'
import { Button, Cells, DaysGrid, Field, Input, PageTitle, Panel, Select, StatusTag } from '../components'
import NudgeComposer from '../components/core/NudgeComposer.jsx'
import { useLiveReload } from '../components/core/useLiveEvents.js'
import { ErrorLine, joinedText, lastVisitLong, Loading, paceLong, phoneText } from '../components/core/bits.jsx'
import '../components/core/core.css'

// One member (SPEC §7 /members/:id): name and status, coach and phone (owner can change both), joined, week N of 13,
// the 13-week row, the 13 × 7 days grid, check-ins, nudges with CAME BACK, NUDGE →.
export default function Member() {
  const { id } = useParams()
  const { role, gym } = useMe()
  const res = useApi(`/members/${id}`)
  const slam = useLiveReload({ data: res.data, reload: res.reload, match: (d) => String(d?.memberId) === String(id) })
  const [nudging, setNudging] = useState(false)
  const d = res.data
  if (!d && res.error?.status === 404) return <NotFound error={res.error} />
  if (!d) return res.error ? <ErrorLine error={res.error} /> : <Loading />
  const m = d.member
  const owner = role === 'owner'
  const tz = gym?.timezone
  const save = async (patch) => { const r = await api(`/members/${m.id}`, { method: 'PATCH', body: patch }); res.setData((x) => ({ ...x, member: { ...x.member, ...r.member } })) }

  return (
    <>
      <PageTitle>{m.name}</PageTitle>
      <div className="stack">
        <div className="core-member-head">
          <StatusTag status={m.status} />
          <span className="meta">{lastVisitLong(m.daysSinceLastVisit)}</span>
          <Button nudge aria-label={`${t('member.nudge')} ${m.name}`} onClick={() => setNudging(true)} />
        </div>

        <Panel>
          <div className="core-facts">
            <CoachFact member={m} owner={owner} onSave={save} />
            <PhoneFact member={m} owner={owner} onSave={save} />
            <div className="core-fact">
              <span className="field-label">{t('members.col.week')}</span>
              <span className="data">{t('member.week', { n: m.week + 1 })}</span>
              <span className="meta">{joinedText(m.joinedOn)}</span>
            </div>
            <div className="core-fact">
              <span className="field-label">{t('members.col.pace')}</span>
              <span className="data">{paceLong(m.pace)}</span>
            </div>
          </div>
        </Panel>

        <Panel title={t('member.weeks.title')}>
          <Cells member={m} className="weekrow core-weeks" slamKey={slam?.memberId === m.id ? slam.key : undefined} />
        </Panel>

        <div className="core-member-grid">
          <Panel title={t('member.days.title')}>
            <DaysGrid days={d.days} daysSinceJoin={m.daysSinceJoin} />
          </Panel>
          <div className="core-member-side">
            <Panel title={t('member.checkins.title')}>
              {d.checkins.length === 0 ? <p className="body core-empty-line">{t('member.checkins.empty')}</p> : (
                <ul className="list core-scroll">
                  {d.checkins.map((c) => (
                    <li key={c.at} className="core-line data"><span>{fmtDate(c.at)}</span><span className="c-steel">{fmtTime(c.at, tz)}</span></li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title={t('member.nudges.title')}>
              {d.nudges.length === 0 ? <p className="body core-empty-line">{t('member.nudges.empty')}</p> : (
                <ul className="list">
                  {d.nudges.map((n) => (
                    <li key={n.id} className="core-nudge">
                      <div className="core-nudge-top">
                        <span className="data">{fmtDate(n.at)}</span>
                        {n.by && <span className="meta">{n.by}</span>}
                        {n.cameBack && <span className="tag">{t('member.nudges.cameBack')}</span>}
                      </div>
                      <p className="body">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
      <NudgeComposer member={nudging ? m : null} onClose={() => setNudging(false)} onSent={res.reload} />
    </>
  )
}

// 404: a coach opening another coach's member, or an id that isn't there. The server's sentence, and a way back.
function NotFound({ error }) {
  return (
    <>
      <PageTitle>{t('member.notFound.title')}</PageTitle>
      <div className="empty">
        <p className="body">{error.message}</p>
        <Button to="/members">{t('member.notFound.back')}</Button>
      </div>
    </>
  )
}

function CoachFact({ member: m, owner, onSave }) {
  const [edit, setEdit] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const coaches = useApi(owner && edit ? '/coaches' : null)
  const start = () => { setValue(m.coachId == null ? '' : String(m.coachId)); setError(null); setEdit(true) }
  const submit = async (e) => {
    e.preventDefault()
    try { await onSave({ coachId: value ? Number(value) : null }); setEdit(false) } catch (err) { setError(err.message) }
  }
  if (edit) {
    const options = [{ value: '', label: t('common.none') }, ...(coaches.data ?? []).filter((c) => c.active).map((c) => ({ value: String(c.id), label: c.name }))]
    return (
      <form className="core-fact core-edit" onSubmit={submit}>
        <Field label={t('member.coach')} error={error ?? coaches.error?.message}>
          <Select value={value} onChange={(e) => setValue(e.target.value)} options={options} disabled={!coaches.data} />
        </Field>
        <div className="btn-row"><Button type="submit">{t('common.save')}</Button><Button variant="quiet" onClick={() => setEdit(false)}>{t('common.cancel')}</Button></div>
      </form>
    )
  }
  return (
    <div className="core-fact">
      <span className="field-label">{t('member.coach')}</span>
      <span className="data">{m.coachName ?? t('common.none')}</span>
      {owner && <Button variant="quiet" onClick={start} aria-label={`${t('member.edit')} ${t('member.coach')}`}>{t('member.edit')}</Button>}
    </div>
  )
}

function PhoneFact({ member: m, owner, onSave }) {
  const [edit, setEdit] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const start = () => { setValue(phoneText(m.phone)); setError(null); setEdit(true) }
  const submit = async (e) => {
    e.preventDefault()
    try { await onSave({ phone: value.trim() || null }); setEdit(false) } catch (err) { setError(err.message) }
  }
  if (edit) {
    return (
      <form className="core-fact core-edit" onSubmit={submit}>
        <Field label={t('member.phone')} error={error}>
          <Input type="tel" inputMode="tel" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="btn-row"><Button type="submit">{t('common.save')}</Button><Button variant="quiet" onClick={() => setEdit(false)}>{t('common.cancel')}</Button></div>
      </form>
    )
  }
  return (
    <div className="core-fact">
      <span className="field-label">{t('member.phone')}</span>
      {m.phone ? <a className="data" href={`tel:${m.phone}`}>{phoneText(m.phone)}</a> : <span className="meta">{t('member.phone.none')}</span>}
      {owner && <Button variant="quiet" onClick={start} aria-label={`${t('member.edit')} ${t('member.phone')}`}>{t('member.edit')}</Button>}
    </div>
  )
}
