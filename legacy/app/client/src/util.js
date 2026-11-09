import { useSyncExternalStore } from 'react'
import { t } from './copy.js'

// Where to go after signing in (?next=): only a path inside this app. "//host", "/\host" and full URLs fall back to Today.
export const safeNext = (next) => (typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/')

// Breakpoints of DESIGN §12: phone < 760, tablet 760–1099, desktop ≥ 1100.
export const PHONE = '(max-width: 759px)'
export const DESKTOP = '(min-width: 1100px)'

export function useMedia(query) {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
export const useIsPhone = () => useMedia(PHONE)
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Today's date (YYYY-MM-DD) in a timezone, e.g. the gym's.
export function todayIn(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
const dayNum = (ymd) => Math.round(Date.parse(ymd + 'T00:00:00Z') / 86400000)
export const daysBetween = (fromYmd, toYmd) => dayNum(toYmd) - dayNum(fromYmd)

// Pilot day 1..90 of a gym (SPEC §6 billing uses the same count).
export function pilotDay(gym) {
  if (!gym?.pilotStartedOn) return null
  const d = daysBetween(gym.pilotStartedOn, todayIn(gym.timezone || 'America/Chicago')) + 1
  return Math.max(1, Math.min(90, d))
}

// "Nov 6" / "Nov 6, 2025" for a YYYY-MM-DD or ISO string.
export function fmtDate(s, { year = false } = {}) {
  if (!s) return ''
  const d = s.length === 10 ? new Date(s + 'T12:00:00') : new Date(s)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) })
}
export function fmtTime(iso, timeZone) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) })
}
// "today", "1 day ago", "11 days ago", or "No visits yet".
export function lastVisitText(days) {
  if (days == null) return t('member.lastVisitNone', {}, 'No visits yet')
  if (days === 0) return t('member.lastVisitToday', {}, 'Last visit today')
  if (days === 1) return t('member.lastVisitOne', {}, 'Last visit 1 day ago')
  return t('member.lastVisit', { n: days })
}
