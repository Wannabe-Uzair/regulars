// Settings sections (COPY §11): GYM, STAFF, OPEN ON A PHONE and KIOSK. IMPORT is in ImportPanel.jsx.
import { useState } from 'react'
import { Button, Dialog, Field, Input, Panel, Select, useToast } from '../index.js'
import { api, useApi, useMe } from '../../api.js'
import { t } from '../../copy.js'
import { fmtDate } from '../../util.js'
import { ConfirmDialog, LoadError, Qr, copyText, roleLabel } from './parts.jsx'

// US gyms: the six US zones, plus whatever the gym already uses if it isn't one of them.
const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']

export function GymPanel({ settings, onSaved }) {
  const { setGym } = useMe()
  const toast = useToast()
  const [name, setName] = useState(settings.gym.name)
  const [tz, setTz] = useState(settings.gym.timezone)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const zones = ZONES.includes(settings.gym.timezone) ? ZONES : [settings.gym.timezone, ...ZONES]

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setErrors({ name: t('err.required') }); return }
    setErrors({})
    setBusy(true)
    try {
      const res = await api('/settings', { method: 'PATCH', body: { name: name.trim(), timezone: tz } })
      setGym((g) => ({ ...g, ...res.gym }))
      onSaved(res)
      toast(t('settings.saved'))
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel title={t('settings.gym.title')}>
      <form className="form" onSubmit={save} noValidate>
        <Field label={t('settings.gym.name')} error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="organization" />
        </Field>
        <Field label={t('settings.gym.tz')}>
          <Select value={tz} onChange={(e) => setTz(e.target.value)} options={zones.map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))} />
        </Field>
        {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        <div><Button type="submit" disabled={busy}>{t('common.save')}</Button></div>
      </form>
    </Panel>
  )
}

const plural = (n, one, many) => (n === 1 ? one : many)

export function StaffPanel() {
  const { data, error, reload } = useApi('/coaches')
  const [inviting, setInviting] = useState(false)
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const deactivate = async () => {
    setBusy(true)
    setActionError(null)
    try {
      await api(`/coaches/${target.id}`, { method: 'PATCH', body: { active: false } })
      setTarget(null)
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={t('settings.staff.title')} action={<Button onClick={() => setInviting(true)}>{t('settings.invite')}</Button>}>
      <LoadError error={error} />
      {data && (
        <ul className="list">
          {data.map((u) => (
            <li key={u.id} className={`staff-row${u.active ? '' : ' inactive'}`}>
              <div className="who">
                <div className="label">
                  <span>{u.name}</span>
                  <span className="tag tag-new">{roleLabel(u.role)}</span>
                  {!u.active && <span className="tag tag-below">{t('settings.staff.inactive')}</span>}
                </div>
                <div className="meta">{u.email}</div>
                <div className="meta">
                  {plural(u.members, t('settings.staff.memberOne', {}, '1 member'), t('settings.staff.members', { n: u.members }, '{n} members'))}
                  {u.slipping > 0 && <>{' · '}<span className="c-red">{t('settings.staff.slipping', { n: u.slipping }, '{n} slipping')}</span></>}
                </div>
              </div>
              {u.role !== 'owner' && u.active && (
                <Button variant="secondary" onClick={() => { setActionError(null); setTarget(u) }}>{t('settings.deactivate')}</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
      <ConfirmDialog open={!!target} onClose={() => setTarget(null)} onConfirm={deactivate} busy={busy} error={actionError}
        title={t('settings.deactivateTitle', { NAME: target?.name?.toUpperCase() ?? '' })} confirm={t('settings.deactivateConfirm')}>
        {t('settings.deactivateBody', { name: target?.name ?? '' })}
      </ConfirmDialog>
    </Panel>
  )
}

function InviteDialog({ open, onClose }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [invite, setInvite] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const close = () => { onClose(); setName(''); setInvite(null); setErrors({}) }

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setErrors({ name: t('err.required') }); return }
    setErrors({})
    setBusy(true)
    try {
      setInvite(await api('/invites', { method: 'POST', body: { name: name.trim() } }))
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => { if (await copyText(invite.link)) toast(t('settings.invite.copied')) }
  const hint = invite && t('settings.invite.hint', { date: fmtDate(invite.expiresAt) })

  return (
    <Dialog open={open} onClose={close} title={t('settings.invite')}
      actions={invite
        ? <Button onClick={copy}>{t('settings.invite.copy')}</Button>
        : <Button type="submit" form="invite-form" disabled={busy}>{t('settings.invite.create')}</Button>}>
      {!invite && (
        <form id="invite-form" className="form" onSubmit={create} noValidate>
          <Field label={t('settings.invite.name', {}, 'COACH NAME')} error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
          </Field>
          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        </form>
      )}
      {invite && <>
        <p className="body">{hint}</p>
        <div className="link-box">{invite.link}</div>
      </>}
    </Dialog>
  )
}

export function PhonePanel({ urls }) {
  return (
    <Panel title={t('phone.title')}>
      <ol className="steps body">
        <li>{t('phone.step1')}</li>
        <li>{t('phone.step2')}</li>
        <li>{t('phone.step3')}</li>
      </ol>
      {urls.length === 0
        ? <p className="body">{t('phone.none')}</p>
        : (
          <div className="urls">
            {urls.map((u) => (
              <div key={u} className="url-row">
                <Qr url={u} />
                <div className="data">{u}</div>
              </div>
            ))}
          </div>
        )}
    </Panel>
  )
}

// `url` is the LAN link (SPEC §6) for the front-desk tablet: shown, copied and in the QR. OPEN THE KIOSK
// opens the same page on this computer, at the address it already uses.
export function KioskPanel({ url }) {
  const toast = useToast()
  const copy = async () => { if (await copyText(url)) toast(t('kiosk.set.copied')) }
  let here = url
  try { here = new URL(url).pathname } catch { here = url }
  return (
    <Panel title={t('kiosk.set.title')}>
      <p className="body explain">{t('kiosk.set.body')}</p>
      <div className="url-row">
        <Qr url={url} />
        <div className="data">{url}</div>
      </div>
      <div className="btn-row kiosk-actions">
        <Button href={here} target="_blank" rel="noopener">{t('kiosk.set.open')}</Button>
        <Button variant="secondary" onClick={copy}>{t('kiosk.set.copy', {}, 'COPY LINK')}</Button>
      </div>
    </Panel>
  )
}

export { LoadError }
