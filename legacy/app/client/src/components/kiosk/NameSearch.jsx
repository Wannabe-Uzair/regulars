import { useEffect, useRef, useState } from 'react'
import { api } from '../../api.js'
import { t } from '../../copy.js'
import { Field, Input } from '../Field.jsx'

const DEBOUNCE_MS = 300 // the kiosk API allows 30 requests a minute, so search only once typing pauses

// FIRST NAME search: up to 6 big name buttons (first name + last initial). Enter picks the only match.
export default function NameSearch({ base, onPick, busy, error }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState({ q: '', hits: null, error: null })
  const cache = useRef(new Map())

  useEffect(() => {
    const query = q.trim()
    if (!query) { setState({ q: '', hits: null, error: null }); return }
    const key = query.toLowerCase()
    if (cache.current.has(key)) { setState({ q: query, hits: cache.current.get(key), error: null }); return }
    const ac = new AbortController()
    const id = setTimeout(() => {
      api(`${base}/search?q=${encodeURIComponent(query)}`, { signal: ac.signal }).then(
        (hits) => { cache.current.set(key, hits); setState({ q: query, hits, error: null }) },
        (e) => { if (e.name !== 'AbortError') setState({ q: query, hits: null, error: e.message }) },
      )
    }, DEBOUNCE_MS)
    return () => { clearTimeout(id); ac.abort() }
  }, [q, base])

  const hits = state.q === q.trim() ? state.hits : null
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && hits?.length === 1 && !busy) { e.preventDefault(); onPick(hits[0]) }
  }
  const message = error || state.error

  return (
    <div className="kiosk-search">
      <Field label={t('kiosk.search.label')}>
        <Input className="kiosk-input" type="text" autoFocus autoComplete="off" autoCapitalize="words" spellCheck={false}
          enterKeyHint="search" maxLength={40} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
      </Field>
      {hits && hits.length > 0 && (
        <ul className="kiosk-hits" aria-label={t('kiosk.search.results', {}, 'Matching members')}>
          {hits.map((h) => (
            <li key={h.memberId}>
              <button type="button" className="kiosk-hit" disabled={busy} onClick={() => onPick(h)}>{h.name}</button>
            </li>
          ))}
        </ul>
      )}
      {hits && hits.length === 0 && <p className="kiosk-note" role="status">{t('kiosk.search.none')}</p>}
      {message && <p className="kiosk-error" role="alert">{message}</p>}
    </div>
  )
}
