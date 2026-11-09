import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi, useMe } from '../api.js'
import { AuthLayout, Button, EmptyState, Field, Input } from '../components'
import { AuthAlt } from '../components/AuthLayout.jsx'
import { t } from '../copy.js'

// A coach accepts an invite link (SPEC §6 GET/POST /api/invites/:token). One use; logs in on success.
export default function InviteAccept() {
  const { token } = useParams()
  const { acceptInvite } = useMe()
  const navigate = useNavigate()
  const invite = useApi(`/invites/${encodeURIComponent(token)}`)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (invite.data?.name) setForm((f) => ({ ...f, name: f.name || invite.data.name })) }, [invite.data])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const f = { name: form.name.trim(), email: form.email.trim(), password: form.password }
    const errs = {}
    if (!f.name) errs.name = t('invite.nameRequired')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = t('err.email')
    if (f.password.length < 8) errs.password = t('err.password')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try { await acceptInvite(token, f); navigate('/', { replace: true }) }
    catch (err) { setErrors({ form: err.message }) }
    finally { setBusy(false) }
  }

  // invite.bad for a 404 (expired or used); any other failure (network, server) shows its own sentence.
  let body
  if (invite.loading) body = <p className="meta" role="status">{t('common.loading')}</p>
  else if (invite.error) body = (
    <EmptyState title={t('invite.bad.title')} action={{ label: t('invite.bad.action'), to: '/login' }}>
      {invite.error.status === 404 ? t('invite.bad') : invite.error.message}
    </EmptyState>
  )
  else {
    const gymName = invite.data.gymName.toUpperCase()
    body = (
      <>
        <h1 className="section-title">{t('invite.title', { gymName })}</h1>
        <p className="meta lead">{t('invite.lede')}</p>
        <form className="form" onSubmit={submit} noValidate>
          <Field label={t('invite.name')} error={errors.name}><Input autoComplete="name" value={form.name} onChange={set('name')} /></Field>
          <Field label={t('invite.email')} error={errors.email}><Input type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
          <Field label={t('invite.password')} hint={t('invite.passwordHelp')} error={errors.password}><Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
          {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
          <Button type="submit" block disabled={busy}>{busy ? t('invite.submitting') : t('invite.submit', { gymName })}</Button>
        </form>
        <AuthAlt text={t('invite.toLogin')} to="/login" />
      </>
    )
  }
  return <AuthLayout>{body}</AuthLayout>
}
