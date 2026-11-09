import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMe } from '../api.js'
import { AuthLayout, Button, Field, Input } from '../components'
import { AuthAlt } from '../components/AuthLayout.jsx'
import { t } from '../copy.js'

// Creates the gym and its owner (SPEC §6 POST /api/auth/signup), then lands on the empty Today.
export default function Signup() {
  const { signup } = useMe()
  const navigate = useNavigate()
  const [form, setForm] = useState({ gymName: '', name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const f = { gymName: form.gymName.trim(), name: form.name.trim(), email: form.email.trim(), password: form.password }
    const errs = {}
    if (!f.gymName) errs.gymName = t('signup.gymNameRequired')
    if (!f.name) errs.name = t('signup.nameRequired')
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = t('err.email')
    if (f.password.length < 8) errs.password = t('err.password')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try { await signup(f); navigate('/', { replace: true }) }
    catch (err) { setErrors({ form: err.message }) }
    finally { setBusy(false) }
  }

  return (
    <AuthLayout>
      <h1 className="section-title">{t('signup.title')}</h1>
      <p className="meta lead">{t('signup.lede')}</p>
      <form className="form" onSubmit={submit} noValidate>
        <Field label={t('signup.gymName')} error={errors.gymName}><Input autoComplete="organization" value={form.gymName} onChange={set('gymName')} /></Field>
        <Field label={t('signup.name')} error={errors.name}><Input autoComplete="name" value={form.name} onChange={set('name')} /></Field>
        <Field label={t('signup.email')} error={errors.email}><Input type="email" autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label={t('signup.password')} hint={t('signup.passwordHelp')} error={errors.password}><Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        <Button type="submit" block disabled={busy}>{busy ? t('signup.submitting') : t('signup.submit')}</Button>
      </form>
      <AuthAlt text={t('signup.toLogin')} to="/login" />
    </AuthLayout>
  )
}
