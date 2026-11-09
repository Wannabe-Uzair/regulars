// The owner's template editor: name, body, the variables help and a live preview for a sample member
// (POST /api/templates/render with the unsaved body). Create, save, and delete with a confirmation.
import { useEffect, useState } from 'react'
import { Button, Field, Input, Textarea, useToast } from '../index.js'
import { api } from '../../api.js'
import { t } from '../../copy.js'
import { ConfirmDialog } from './parts.jsx'

const VARS = ['first', 'coach', 'gym', 'days']
// COPY §10 keeps each variable's meaning in its "Where" column, which the copy build doesn't export (it only reads
// "definition" columns), so the fallbacks carry COPY's words until the ids exist.
const VAR_HELP = {
  first: "the member's first name",
  coach: 'the first name of whoever sends the text',
  gym: "your gym's name",
  days: "days since the member's last visit",
}

export function VariablesHelp() {
  return (
    <div className="admin-sec">
      <div className="label label-sm c-steel">{t('templates.vars.title')}</div>
      <dl className="vars">
        {VARS.map((v) => (
          <div key={v} style={{ display: 'contents' }}>
            <dt>{t(`templates.var.${v}`)}</dt>
            <dd className="meta">{t(`templates.var.${v}.def`, {}, VAR_HELP[v])}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function TemplateEditor({ template, sample, onSaved, onDeleted }) {
  const toast = useToast()
  const [name, setName] = useState(template?.name ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [delError, setDelError] = useState(null)
  const preview = usePreview(body, sample?.id)

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!name.trim()) errs.name = t('err.required')
    if (!body.trim()) errs.body = t('err.required')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const saved = template?.id
        ? await api(`/templates/${template.id}`, { method: 'PATCH', body: { name: name.trim(), body } })
        : await api('/templates', { method: 'POST', body: { name: name.trim(), body } })
      toast(t('templates.saved'))
      onSaved(saved)
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setDelError(null)
    try {
      await api(`/templates/${template.id}`, { method: 'DELETE' })
      setConfirm(false)
      toast(t('templates.deleted', {}, 'Template deleted'))
      onDeleted(template.id)
    } catch (err) {
      setDelError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="tpl-editor" onSubmit={save} noValidate>
      <Field label={t('templates.field.name', {}, 'NAME')} error={errors.name}>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" />
      </Field>
      <Field label={t('templates.field.body', {}, 'MESSAGE')} error={errors.body}>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
      </Field>
      <VariablesHelp />
      <div className="admin-sec">
        <div className="label label-sm c-steel">{t('templates.preview')}</div>
        <div className="preview" aria-live="polite">
          {sample && <div className="meta">{t('templates.sample', { name: sample.name }, 'Sample member: {name}')}</div>}
          {preview.text
            ? <p className="body">{preview.text}</p>
            : <p className="body preview-empty">{preview.error || t('common.none')}</p>}
        </div>
      </div>
      {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
      <div className="btn-row">
        <Button type="submit" disabled={busy}>{t('templates.save')}</Button>
        {template?.id && <Button variant="secondary" onClick={() => { setDelError(null); setConfirm(true) }}>{t('templates.delete', {}, 'DELETE')}</Button>}
      </div>
      {template?.id && (
        <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} busy={busy} error={delError}
          title={t('templates.deleteTitle')} confirm={t('templates.deleteConfirm')}>
          {t('templates.deleteBody', { name: template.name })}
        </ConfirmDialog>
      )}
    </form>
  )
}

// The body filled for the sample member, 300 ms after typing stops.
function usePreview(body, memberId) {
  const [state, setState] = useState({ text: '', error: null })
  useEffect(() => {
    if (!memberId || !body.trim()) { setState({ text: '', error: null }); return }
    const ac = new AbortController()
    const id = setTimeout(() => {
      api('/templates/render', { method: 'POST', body: { memberId, body }, signal: ac.signal }).then(
        (r) => setState({ text: r.body, error: null }),
        (e) => { if (e.name !== 'AbortError') setState({ text: '', error: e.message }) },
      )
    }, 300)
    return () => { clearTimeout(id); ac.abort() }
  }, [body, memberId])
  return state
}
