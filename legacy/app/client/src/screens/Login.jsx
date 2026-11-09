import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMe } from '../api.js'
import { AuthLayout, Button, Field, Input } from '../components'
import { AuthAlt } from '../components/AuthLayout.jsx'
import { t } from '../copy.js'
import { safeNext } from '../util.js'

export default function Login() {
  const { login } = useMe()
  const navigate = useNavigate()
  const next = new URLSearchParams(useLocation().search).get('next') || '/'
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = t('err.email')
    if (!form.password) errs.password = t('login.passwordRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try { await login(form.email.trim(), form.password); navigate(safeNext(next), { replace: true }) }
    catch (err) { setErrors({ form: err.message }) }
    finally { setBusy(false) }
  }

  return (
    <AuthLayout>
      <h1 className="section-title">{t('login.title')}</h1>
      <p className="label lead">{t('login.tagline')}</p>
      <form className="form" onSubmit={submit} noValidate>
        <Field label={t('login.email')} error={errors.email}><Input type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label={t('login.password')} error={errors.password}><Input type="password" autoComplete="current-password" value={form.password} onChange={set('password')} /></Field>
        {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        <Button type="submit" block disabled={busy}>{busy ? t('login.submitting') : t('login.submit')}</Button>
      </form>
      <AuthAlt text={t('login.toSignup')} to="/signup" />
    </AuthLayout>
  )
}
