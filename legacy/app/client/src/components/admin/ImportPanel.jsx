// IMPORT (COPY §11, SPEC §6 import): members or check-ins as CSV. Choose a file (read as text) or paste it;
// PREVIEW shows the first rows, a column picker per field and the problems; IMPORT commits and shows the summary.
import { useRef, useState } from 'react'
import { Button, Field, Panel, Select, Textarea, useToast } from '../index.js'
import { api } from '../../api.js'
import { t } from '../../copy.js'

const FIELDS = {
  members: ['external_id', 'first_name', 'last_name', 'phone', 'email', 'joined_on', 'coach_email'],
  checkins: ['external_id', 'phone', 'checked_in_at'],
}
const REQUIRED = { members: ['first_name', 'joined_on'], checkins: ['checked_in_at'] }

// Every required field has a column; check-ins also need a member ID or a phone to match on.
function mappingComplete(kind, mapping) {
  if (REQUIRED[kind].some((f) => mapping[f] == null)) return false
  if (kind === 'checkins' && mapping.external_id == null && mapping.phone == null) return false
  return true
}

export default function ImportPanel() {
  const toast = useToast()
  const fileRef = useRef(null)
  const [kind, setKind] = useState('members')
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState({})
  const [result, setResult] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const reset = () => { setPreview(null); setResult(null); setErrors({}) }
  const chooseKind = (k) => { setKind(k); reset() }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    reset()
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') { setFileName(''); setErrors({ file: t('err.csv') }); return }
    setFileName(file.name)
    setCsv(await file.text())
  }

  const runPreview = async () => {
    if (!csv.trim()) { setErrors({ csv: t('err.required') }); return }
    setErrors({})
    setResult(null)
    setBusy(true)
    try {
      const p = await api('/import/preview', { method: 'POST', body: { kind, csv } })
      setPreview(p)
      setMapping(p.mapping)
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setBusy(false)
    }
  }

  const commit = async () => {
    if (!mappingComplete(kind, mapping)) { setErrors({ mapping: t('err.mapping') }); return }
    setErrors({})
    setBusy(true)
    try {
      const r = await api('/import/commit', { method: 'POST', body: { kind, csv, mapping } })
      setResult(r)
      setPreview(null)
      toast(t('import.done'))
    } catch (err) {
      setErrors({ form: err.message })
    } finally {
      setBusy(false)
    }
  }

  const columnOptions = preview
    ? [{ value: '', label: t('import.map.pick') }, ...preview.columns.map((c, i) => ({ value: String(i), label: c || `#${i + 1}` }))]
    : []
  const commitLabel = kind === 'members' ? t('import.commit') : t('import.commitCheckins', {}, 'IMPORT CHECK-INS')

  return (
    <Panel title={t('import.title')} className="import">
      <ol className="steps body" style={{ marginBottom: 0 }}>
        <li>{t('import.step1')}</li>
        <li>{t('import.step2')}</li>
        <li>{t('import.step3')}</li>
      </ol>

      <div className="admin-sec">
        <div className="label label-sm c-steel" id="import-kind">{t('import.kind', {}, 'WHAT TO IMPORT')}</div>
        <div className="seg" role="group" aria-labelledby="import-kind">
          {['members', 'checkins'].map((k) => (
            <Button key={k} variant="secondary" aria-pressed={kind === k} onClick={() => chooseKind(k)}>
              {k === 'members' ? t('import.kind.members', {}, 'MEMBERS') : t('import.kind.checkins', {}, 'CHECK-INS')}
            </Button>
          ))}
        </div>
      </div>

      <div className="admin-sec">
        <div className="file-pick">
          <input ref={fileRef} id="import-file" type="file" accept=".csv,text/csv" onChange={onFile} />
          <label htmlFor="import-file" className="btn btn-secondary">{t('import.choose')}</label>
          {fileName && <span className="data">{fileName}</span>}
        </div>
        {errors.file && <p className="field-error" role="alert">{errors.file}</p>}
      </div>

      <Field label={t('import.paste', {}, 'OR PASTE THE CSV')} error={errors.csv}>
        <Textarea value={csv} onChange={(e) => { setCsv(e.target.value); setFileName(''); reset() }} rows={6} spellCheck={false} />
      </Field>

      <div className="btn-row">
        <Button variant={preview ? 'secondary' : 'primary'} onClick={runPreview} disabled={busy}>{t('import.preview', {}, 'PREVIEW')}</Button>
        {preview && <Button onClick={commit} disabled={busy}>{commitLabel}</Button>}
      </div>
      {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
      {errors.mapping && <p className="form-error" role="alert">{errors.mapping}</p>}

      {preview && <>
        <p className="meta">{preview.rowCount === 1 ? t('import.rowOne', {}, '1 row') : t('import.rows', { n: preview.rowCount }, '{n} rows')}</p>
        <div className="admin-sec">
          <div className="label label-sm c-steel">{t('import.map.title')}</div>
          <div className="map-grid">
            {FIELDS[kind].map((f) => (
              <Field key={f} label={<>{t(`import.field.${f}`)}{REQUIRED[kind].includes(f) && <span className="req">{t('import.map.required')}</span>}</>}>
                <Select value={mapping[f] == null ? '' : String(mapping[f])} options={columnOptions}
                  onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value === '' ? null : Number(e.target.value) }))} />
              </Field>
            ))}
          </div>
        </div>
        <Problems list={preview.problems} />
        <div className="admin-sec">
          <div className="label label-sm c-steel">{t('import.sample')}</div>
          <div className="table-wrap">
            <table className="data-table raw">
              <thead><tr>{preview.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
              <tbody>
                {preview.sample.map((row, i) => (
                  <tr key={i}>{preview.columns.map((_, j) => <td key={j}>{row[j] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {result && (
        <div className="import-result" role="status">
          <p className="label">{t('import.summary', result)}</p>
          <Problems list={result.problems} />
        </div>
      )}
    </Panel>
  )
}

// The server's problem sentences, as given (they already start with "Row n:" where a row is meant).
function Problems({ list }) {
  if (!list?.length) return null
  return (
    <div className="admin-sec">
      <div className="label label-sm c-steel">{t('import.problems', {}, 'PROBLEMS')}</div>
      <ul className="problems body">{list.map((p, i) => <li key={i}>{p}</li>)}</ul>
    </div>
  )
}
