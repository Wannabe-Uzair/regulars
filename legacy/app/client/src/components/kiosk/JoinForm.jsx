import { useState } from 'react'
import { t } from '../../copy.js'
import Button from '../Button.jsx'
import { Field, Input } from '../Field.jsx'

export const phoneHint = () => t('kiosk.phone.hint', {}, 'Not a US number? Start with + and the country code.')

const optional = (label) => (
  <>{label} <span className="kiosk-optional">{t('kiosk.join.optional', {}, 'OPTIONAL')}</span></>
)

// NEW HERE? JOIN: first name (required), last name and phone (both optional). onJoin(body) resolves or throws the
// API error; the server's sentence is shown as given, on the phone field when it is about the phone.
export default function JoinForm({ initialPhone = '', onJoin, onCancel }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: initialPhone })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    const firstName = form.firstName.trim()
    if (!firstName) { setErrors({ firstName: t('kiosk.join.firstRequired', {}, 'Enter your first name.') }); return }
    const phone = form.phone.trim()
    setErrors({})
    setBusy(true)
    try {
      await onJoin({ firstName, lastName: form.lastName.trim() || undefined, phone: phone || undefined })
    } catch (err) {
      // With the names checked here, a 400 or 409 on a join that carries a phone is about the phone.
      if (phone && err.status === 400) setErrors({ phone: err.message, phoneHint: true })
      else if (phone && err.status === 409) setErrors({ phone: err.message })
      else setErrors({ form: err.message })
      setBusy(false)
    }
  }

  return (
    <form className="kiosk-join form" onSubmit={submit} noValidate>
      <Field label={t('kiosk.join.first', {}, 'FIRST NAME')} error={errors.firstName}>
        <Input className="kiosk-input" autoFocus autoComplete="off" autoCapitalize="words" spellCheck={false} maxLength={40}
          value={form.firstName} onChange={set('firstName')} />
      </Field>
      <Field label={optional(t('kiosk.join.last', {}, 'LAST NAME'))}>
        <Input className="kiosk-input" autoComplete="off" autoCapitalize="words" spellCheck={false} maxLength={40}
          value={form.lastName} onChange={set('lastName')} />
      </Field>
      <Field label={optional(t('kiosk.join.phone', {}, 'PHONE'))}
        error={errors.phone && <>{errors.phone}{errors.phoneHint && <span className="kiosk-hint">{phoneHint()}</span>}</>}>
        <Input className="kiosk-input" type="tel" inputMode="tel" autoComplete="off" maxLength={20}
          value={form.phone} onChange={set('phone')} />
      </Field>
      {errors.form && <p className="kiosk-error" role="alert">{errors.form}</p>}
      <div className="kiosk-actions">
        <Button type="submit" disabled={busy}>{t('kiosk.join.submit')}</Button>
        <Button variant="quiet" onClick={onCancel}>{t('kiosk.join.cancel', {}, 'CANCEL')}</Button>
      </div>
    </form>
  )
}
