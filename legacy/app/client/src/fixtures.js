// Fixture data in the SPEC §6 shapes, built from the expo kit's shared sample members (TENURE.SAMPLE).
// Used by the /_kit gallery; wave 2 can use it for empty-API previews. Never shown to a signed-in gym.
import { T } from './brand.js'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d) }

// SPEC §4 status, first match wins. weeks[] includes the current (partial) week as its last entry.
export function statusOf(weeks) {
  const finished = weeks.slice(0, -1)
  const [a, b] = finished.slice(-2)
  if (finished.length >= 2 && a < 2 && b < 2) return 'slipping'
  if (finished.length < 2) return 'new'
  return finished.at(-1) >= 3 ? 'on' : 'below'
}
export function paceOf(weeks) {
  const f = weeks.slice(0, -1).slice(-3)
  return f.length ? Math.round((f.reduce((x, y) => x + y, 0) / f.length) * 10) / 10 : null
}

const COACH = { 1: 'Mike R.', 2: 'Priya S.', 3: 'Jordan T.' }
// The kit's weeks are finished weeks; each fixture adds a partial current week (visits so far, days into it).
const EXTRA = { 'Maya R.': [2, 4, 1], 'Jo W.': [1, 2, 2], 'Dev P.': [3, 5, 3], 'Chris L.': [1, 3, 1], 'Hana L.': [0, 2, 1], 'Sam O.': [0, 2, 1] }
export function member(id, name, finished, [now, into, coachId], extra = {}) {
  const weeks = [...finished, now]
  const week = finished.length
  const daysSinceJoin = week * 7 + into
  const [firstName, last] = name.split(' ')
  return {
    id, firstName, lastName: last.replace('.', ''), name, phone: `+1312555${pad(100 + id).slice(-4)}`, coachId, coachName: COACH[coachId],
    joinedOn: daysAgo(daysSinceJoin), daysSinceJoin, week, weeks, pace: paceOf(weeks), status: statusOf(weeks),
    lastVisitOn: daysAgo(extra.lastSeen ?? 1), daysSinceLastVisit: extra.lastSeen ?? 1, lastNudgeAt: null, ...extra,
  }
}
export const MEMBERS = [
  ...T.SAMPLE.map((m, i) => member(i + 1, m.name, m.weeks, EXTRA[m.name], m.lastSeen ? { lastSeen: m.lastSeen } : {})),
  member(7, 'Ana K.', [4], [1, 3, 2]),
  member(8, 'Leo M.', [], [2, 5, 3]),
]
export const SLIPPING = MEMBERS.filter((m) => m.status === 'slipping').sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
export const BOARD = [...SLIPPING, ...MEMBERS.filter((m) => m.status !== 'slipping')]

export const OWNER = { id: 1, name: 'Mike R.', email: 'mike@northside.test', role: 'owner' }
export const COACH_USER = { id: 2, name: 'Priya S.', email: 'priya@northside.test', role: 'coach' }
export const GYM = { id: 1, name: 'Northside Strength', slug: 'northside', isDemo: true, timezone: 'America/Chicago', plan: 'pilot', pilotStartedOn: daysAgo(22) }

export const TODAY = {
  kpis: { newMembers: 60, onTheLinePct: 58, slipping: 12, nudgedThisWeek: 7 },
  slipping: SLIPPING,
  checkinsToday: [{ memberId: 1, name: 'Maya R.', at: new Date().toISOString() }],
  board: BOARD,
}
// Days grids: kit.days' STAYER and SLIPPER as SPEC member-page days[].
export const toDays = (visits, daysSinceJoin = 89) => Array.from({ length: 90 }, (_, day) => ({ date: daysAgo(daysSinceJoin - day), day, visited: visits.includes(day) }))
export const STAYER_DAYS = toDays(T.STAYER)
export const SLIPPER_DAYS = toDays(T.SLIPPER, 40)

export const VISITS_BY_WEEK = Array.from({ length: 13 }, (_, i) => ({
  week: i + 1,
  stillComing: Math.round((3.6 - 0.04 * i + (i % 3 === 1 ? 0.2 : 0)) * 10) / 10,
  slipped: Math.round(Math.max(0.2, 2.9 - 0.42 * i) * 10) / 10,
}))
