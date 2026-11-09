import { useEffect, useState } from 'react'
import { api, useApi } from '../../api.js'
import { t } from '../../copy.js'
import { useIsPhone } from '../../util.js'
import { Button, Dialog, Field, Select, Textarea, useToast } from '../index.js'
import { phoneText } from './bits.jsx'

/* The nudge composer (SPEC §5, §7; COPY §7): a dialog on desktop, a bottom sheet on phones (Dialog does both).
 * Template picker -> POST /templates/render -> editable text. Phone: TEXT {FIRST} records the nudge and opens
 * smsUrl. Computer: the number, COPY MESSAGE and RECORD NUDGE. No phone on file: RECORD NUDGE only.
 * <NudgeComposer member={MemberSummary|null} onClose onSent /> — open while `member` is set. */
export default function NudgeComposer({ member, onClose, onSent }) {
  const open = !!member
  return (
    <Dialog open={open} onClose={onClose} title={open ? t('nudge.title', { FIRST: member.firstName.toUpperCase() }) : undefined}>
      {open && <Composer key={member.id} member={member} onClose={onClose} onSent={onSent} />}
    </Dialog>
  )
}

function Composer({ member: m, onClose, onSent }) {
  const phone = useIsPhone()
  const toast = useToast()
  const templates = useApi('/templates')
  const [tpl, setTpl] = useState(null) // template id as a string; '' = write my own
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Pick the first template once they load, so the text is ready to send.
  useEffect(() => { if (tpl == null && templates.data) setTpl(templates.data[0] ? String(templates.data[0].id) : '') }, [templates.data, tpl])
  useEffect(() => {
    if (!tpl) { if (tpl === '') setBody(''); return }
    const ac = new AbortController()
    api('/templates/render', { method: 'POST', body: { memberId: m.id, templateId: Number(tpl) }, signal: ac.signal })
      .then((r) => setBody(r.body), (e) => { if (e.name !== 'AbortError') setError(e) })
    return () => ac.abort()
  }, [tpl, m.id])

  const record = async () => {
    setBusy(true); setError(null)
    try {
      const r = await api('/nudges', { method: 'POST', body: { memberId: m.id, templateId: tpl ? Number(tpl) : null, body } })
      toast(t('toast.nudge', { first: m.firstName }))
      onSent?.(r)
      onClose()
      return r
    } catch (e) { setError(e); return null } finally { setBusy(false) }
  }
  // Show the recorded-nudge toast first, then open the text app, so the confirmation is seen before Messages takes over.
  const sendFromPhone = async () => { const r = await record(); if (r?.smsUrl) setTimeout(() => { window.location.href = r.smsUrl }, 300) }
  const copy = async () => {
    try { await navigator.clipboard.writeText(body); toast(t('nudge.copied')) } catch (e) { setError(e) }
  }

  const empty = !body.trim()
  const options = [{ value: '', label: t('nudge.templateNone') }, ...(templates.data ?? []).map((x) => ({ value: String(x.id), label: x.name }))]
  return (
    <div className="core-composer">
      <Field label={t('nudge.template')}>
        <Select value={tpl ?? ''} onChange={(e) => setTpl(e.target.value)} options={options} disabled={!templates.data} />
      </Field>
      <Field label={t('nudge.text')}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={1000} />
      </Field>
      {!m.phone && (
        <div className="core-nophone">
          <h3 className="label">{t('nudge.noPhoneTitle')}</h3>
          <p className="body">{t('nudge.noPhoneBody', { first: m.firstName })}</p>
        </div>
      )}
      {m.phone && phone && <p className="meta">{t('nudge.helpPhone', { name: m.name.replace(/\.$/, '') })}</p>}
      {m.phone && !phone && (
        <div className="core-number">
          <span className="data">{phoneText(m.phone)}</span>
          <p className="meta">{t('nudge.helpDesktop', { phone: phoneText(m.phone) })}</p>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error.message}</p>}
      <div className="dialog-actions">
        {!m.phone && <Button onClick={record} disabled={busy || empty}>{t('nudge.noPhoneAction')}</Button>}
        {m.phone && phone && <Button block onClick={sendFromPhone} disabled={busy || empty}>{t('nudge.send', { FIRST: m.firstName.toUpperCase() })}</Button>}
        {m.phone && !phone && (
          <>
            <Button onClick={copy} disabled={empty}>{t('nudge.copy')}</Button>
            <Button variant="secondary" onClick={record} disabled={busy || empty}>{t('nudge.markSent')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
