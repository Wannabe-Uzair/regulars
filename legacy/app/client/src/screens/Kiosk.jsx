import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'
import { t } from '../copy.js'
import { Button, SampleTag } from '../components'
import Tape from '../components/Tape.jsx'
import Keypad, { press, formatPhone } from '../components/kiosk/Keypad.jsx'
import NameSearch from '../components/kiosk/NameSearch.jsx'
import JoinForm, { phoneHint } from '../components/kiosk/JoinForm.jsx'
import Welcome from '../components/kiosk/Welcome.jsx'
import '../components/kiosk/kiosk.css'

// Front-desk kiosk (SPEC §7 /kiosk/:token, COPY §14, DESIGN §12): full screen, no shell, no login; the token in the
// URL authorises every call. Modes: phone (keypad, the idle screen) · search (first name) · join · welcome (5 s).
// Any screen but idle goes back to idle after 30 s without input.
const IDLE_MS = 30000

/** The line for a failed phone check-in: the server's sentence as given, plus what to do next. */
function phoneProblem(err) {
  if (err.status === 404) {
    const full = t('kiosk.notFound')
    return { text: full.startsWith(err.message) ? full : `${err.message} ${t('kiosk.notFound.action', {}, 'Try your name, or tap NEW HERE? JOIN.')}` }
  }
  if (err.status === 400) return { text: err.message, hint: phoneHint() }
  return { text: err.message }
}

export default function Kiosk() {
  const { token } = useParams()
  const base = `/kiosk/${encodeURIComponent(token)}`
  const [gym, setGym] = useState(null)
  const [fatal, setFatal] = useState(null) // { message, retry }
  const [tries, setTries] = useState(0)
  const [mode, setMode] = useState('phone')
  const [phone, setPhone] = useState('')
  const [problem, setProblem] = useState(null) // { text, hint } under the phone number
  const [searchError, setSearchError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const ac = new AbortController()
    setFatal(null)
    api(base, { signal: ac.signal }).then(setGym, (e) => {
      if (e.name !== 'AbortError') setFatal({ message: e.message, retry: e.status !== 404 })
    })
    return () => ac.abort()
  }, [base, tries])

  const reset = useCallback(() => {
    setMode('phone'); setPhone(''); setProblem(null); setSearchError(null); setResult(null); setBusy(false)
  }, [])

  const checkIn = useCallback(async (body, onError) => {
    setBusy(true)
    try {
      const r = await api(`${base}/checkin`, { method: 'POST', body })
      setResult(r); setMode('welcome'); setPhone(''); setProblem(null); setSearchError(null)
    } catch (err) { onError(err) } finally { setBusy(false) }
  }, [base])

  const submitPhone = useCallback(() => {
    if (busy || !phone || phone === '+') return
    checkIn({ phone }, (err) => setProblem(phoneProblem(err)))
  }, [busy, phone, checkIn])

  const key = useCallback((k) => {
    setProblem(null)
    setPhone((v) => press(v, k))
  }, [])

  const join = useCallback(async (body) => {
    const r = await api(`${base}/join`, { method: 'POST', body })
    setResult({ ...r, joined: true }); setMode('welcome'); setPhone(''); setProblem(null)
  }, [base])

  // Hardware keyboard: digits, +, Backspace and Enter on the keypad; Escape leaves search and join; a digit on the
  // welcome starts the next check-in. Typing into a field is left alone.
  useEffect(() => {
    if (!gym) return
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = e.target?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (e.key === 'Escape' && (mode === 'search' || mode === 'join' || mode === 'welcome')) { e.preventDefault(); reset(); return }
      if (inField) return
      if (mode === 'welcome' && /^\d$/.test(e.key)) { e.preventDefault(); reset(); setPhone(e.key); return }
      if (mode !== 'phone') return
      if (/^\d$/.test(e.key) || e.key === '+') { e.preventDefault(); key(e.key) }
      else if (e.key === 'Backspace') { e.preventDefault(); key('back') }
      else if (e.key === 'Enter' && !(tag === 'BUTTON' || tag === 'A')) { e.preventDefault(); submitPhone() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gym, mode, key, submitPhone, reset])

  // Back to idle after 30 s without input (the welcome runs its own 5 s countdown).
  useEffect(() => {
    if (mode === 'welcome' || (mode === 'phone' && !phone && !problem)) return
    let id = setTimeout(reset, IDLE_MS)
    const poke = () => { clearTimeout(id); id = setTimeout(reset, IDLE_MS) }
    const events = ['pointerdown', 'keydown', 'input']
    events.forEach((ev) => window.addEventListener(ev, poke, true))
    return () => { clearTimeout(id); events.forEach((ev) => window.removeEventListener(ev, poke, true)) }
  }, [mode, phone, problem, reset])

  if (fatal) {
    return (
      <main className="kiosk kiosk-fatal">
        <p className="kiosk-fatal-text" role="alert">{fatal.message}</p>
        {fatal.retry && <Button variant="secondary" onClick={() => setTries((n) => n + 1)}>{t('kiosk.retry', {}, 'TRY AGAIN')}</Button>}
      </main>
    )
  }
  if (!gym) return <main className="kiosk"><p className="sr-only" role="status">{t('kiosk.loading', {}, 'Loading')}</p></main>

  const top = (
    <header className="kiosk-top">
      <p className="kiosk-gym">{gym.gymName}</p>
      {gym.isDemo && <SampleTag />}
    </header>
  )

  if (mode === 'welcome' && result) {
    return <main className="kiosk kiosk-is-welcome">{top}<Welcome result={result} onDone={reset} /></main>
  }

  const title = (titleText, prompt) => (
    <div className="kiosk-head">
      <h1 className="kiosk-title">{titleText}</h1>
      <Tape className="kiosk-title-tape" />
      {prompt && <p className="kiosk-prompt">{prompt}</p>}
    </div>
  )

  if (mode === 'search') {
    return (
      <main className="kiosk">
        {top}
        <div className="kiosk-single">
          {title(t('kiosk.idle.title'))}
          <NameSearch base={base} busy={busy} error={searchError}
            onPick={(h) => { setSearchError(null); checkIn({ memberId: h.memberId }, (err) => setSearchError(err.message)) }} />
          <div className="kiosk-actions">
            <Button variant="secondary" onClick={() => setMode('join')}>{t('kiosk.join')}</Button>
            <Button variant="quiet" onClick={() => { setSearchError(null); setMode('phone') }}>{t('kiosk.search.phone', {}, 'USE MY PHONE NUMBER')}</Button>
          </div>
        </div>
      </main>
    )
  }

  if (mode === 'join') {
    return (
      <main className="kiosk">
        {top}
        <div className="kiosk-single">
          {title(t('kiosk.join.title', {}, 'JOIN'), t('kiosk.join.prompt', {}, 'Your first name is enough. Add your phone to check in faster next time.'))}
          <JoinForm initialPhone={phone} onJoin={join} onCancel={() => setMode('phone')} />
        </div>
      </main>
    )
  }

  return (
    <main className="kiosk">
      {top}
      <div className="kiosk-idle">
        <div className="kiosk-left">
          {title(t('kiosk.idle.title'), t('kiosk.idle.prompt'))}
          <div className="kiosk-display" aria-label={t('kiosk.display.label', {}, 'Phone number')} role="group">
            <output className={`kiosk-number${phone ? '' : ' is-empty'}`} aria-live="polite">{formatPhone(phone)}</output>
          </div>
          <div className="kiosk-problem" aria-live="assertive">
            {problem && <p className="kiosk-error">{problem.text}</p>}
            {problem?.hint && <p className="kiosk-hint">{problem.hint}</p>}
          </div>
          <div className="kiosk-actions kiosk-actions-idle">
            <Button variant="secondary" onClick={() => setMode('join')}>{t('kiosk.join')}</Button>
            <Button variant="quiet" onClick={() => { setProblem(null); setMode('search') }}>{t('kiosk.search.toggle')}</Button>
          </div>
        </div>
        <div className="kiosk-right">
          <Keypad onKey={key} plusDisabled={phone !== ''} />
          <Button className="kiosk-go" block disabled={busy || !phone || phone === '+'} onMouseDown={(e) => e.preventDefault()} onClick={submitPhone}>
            {t('kiosk.keypad.submit', {}, 'CHECK IN')} <span className="arrow" aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </main>
  )
}
