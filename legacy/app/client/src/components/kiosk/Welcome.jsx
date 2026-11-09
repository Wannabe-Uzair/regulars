import { useEffect, useState } from 'react'
import { t } from '../../copy.js'
import Tape from '../Tape.jsx'

export const WELCOME_SECONDS = 5

/** The headline: the first-visit line for a join (always day 0), otherwise WELCOME BACK with the week shown 1-based.
 *  A check-in on the join day also reads WELCOME BACK, WEEK 1. (the visitor who joins, then checks in again). */
export function welcomeLine(w) {
  return w.joined && w.day === 0
    ? t('kiosk.welcome.first', { FIRST: w.firstName })
    : t('kiosk.welcome.back', { FIRST: w.firstName, n: w.week + 1 })
}

export function welcomeSub(w) {
  const n = w.visitsThisWeek
  if (n >= 3) return t('kiosk.welcome.line')
  if (n === 1) return t('kiosk.welcome.visit', { n }, '1 visit this week.')
  return t('kiosk.welcome.visits', { n })
}

// The moment the visitor sees: a huge Anton line, the sub line, the first 90 days as floor tape, and a 5 → 1
// countdown, then back to idle. A tap anywhere goes back at once.
export default function Welcome({ result, onDone }) {
  const [n, setN] = useState(WELCOME_SECONDS)
  useEffect(() => {
    const id = setInterval(() => setN((x) => x - 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { if (n <= 0) onDone() }, [n, onDone])

  const on = result.visitsThisWeek >= 3
  const days = Math.min(90, (result.day ?? 0) + 1)
  return (
    <div className="kiosk-welcome" onClick={onDone}>
      <div role="status">
        <h1 className="kiosk-welcome-line">{welcomeLine(result)}</h1>
        <Tape className="kiosk-welcome-tape" filled={days / 30} />
        <p className={`kiosk-welcome-sub${on ? ' is-on' : ''}`}>{welcomeSub(result)}</p>
      </div>
      <p className="kiosk-reset">{t('kiosk.reset', { n: Math.max(1, n) })}</p>
    </div>
  )
}
