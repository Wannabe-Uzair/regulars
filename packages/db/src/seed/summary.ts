// The seed's own check (legacy seed/check.mjs) as a function: what the oracle says about a day's Northside data.
import type { NorthsideData } from './northside.ts'
import { analyze, kpis, type OracleKpis, type OracleStatus } from './rules.ts'

/** The six expo-kit members, by name, in the order the summary lists them. */
export const KIT_MEMBER_NAMES = ['Maya R.', 'Jo W.', 'Dev P.', 'Chris L.', 'Hana L.', 'Sam O.'] as const

export type StatusCounts = Record<OracleStatus, number>

export interface KitMemberSummary {
  name: string
  status: OracleStatus | null
  pace: number | null
  weeks: number[]
  coachKey: string
}

export interface NorthsideSummary {
  today: string
  members: number
  checkins: number
  nudges: number
  inWindow: number
  older: number
  /** Status counts among first-90-days members, per coach key, in user order. */
  byCoach: Record<string, StatusCounts>
  kpis: OracleKpis
  kit: KitMemberSummary[]
  /** The report as text lines, as the old check script printed it. */
  lines: string[]
}

/** Summarise `data` (built for `today`) with the seed's independent rules. */
export function summarizeNorthside(data: NorthsideData, today: string): NorthsideSummary {
  const res = analyze(data, today)
  const all = [...res.values()]
  const win = all.filter((x) => x.inWindow)
  const byCoach: Record<string, StatusCounts> = {}
  for (const u of data.users) {
    const c: StatusCounts = { on: 0, below: 0, slipping: 0, new: 0 }
    for (const x of win) if (x.member.coachKey === u.key && x.status) c[x.status]++
    byCoach[u.key] = c
  }
  const k = kpis(res.values(), data.nudges, today, data.gym.timezone)
  const kit = KIT_MEMBER_NAMES.map((n): KitMemberSummary => {
    const x = all.find((r) => `${r.member.firstName} ${r.member.lastName}` === n)
    if (!x) throw new Error(`Kit member ${n} is missing`)
    return { name: n, status: x.status, pace: x.pace, weeks: x.weeks, coachKey: x.member.coachKey }
  })

  const lines = [
    `Northside seed for ${today}: ${data.members.length} members, ${data.checkins.length} check-ins, ${data.nudges.length} nudges`,
    `in window: ${win.length}, older: ${res.size - win.length}`,
    '',
    'Status by coach (first 90 days):',
    ...data.users.map((u) => `  ${u.key.padEnd(7)} ${Object.entries(byCoach[u.key]!).map(([s, v]) => `${s}=${v}`).join(' ')}`),
    '',
    `KPIs: ${JSON.stringify(k)}`,
    '',
    'Kit members:',
    ...kit.map((x) => `  ${x.name.padEnd(9)} ${String(x.status).padEnd(9)} pace=${x.pace} weeks=[${x.weeks.join(',')}] coach=${x.coachKey}`),
  ]
  return {
    today, members: data.members.length, checkins: data.checkins.length, nudges: data.nudges.length,
    inWindow: win.length, older: res.size - win.length, byCoach, kpis: k, kit, lines,
  }
}
