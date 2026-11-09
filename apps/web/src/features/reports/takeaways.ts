import type { CohortRow, NudgeReport, WeekVisitsRow } from '@tenure/contracts'
import { t } from '@tenure/copy'

/**
 * Each Reports section is titled by its finding (FR-REPORT-01), worked out from the figures the API already sends, so
 * a live refresh (index.ts) moves the titles with the figures.
 */

/** The nudges past their 7 days that came back, out of all past them (`reports.nudges.lead` and its forms). */
export function nudgesLead({ sent, cameBack, waiting }: NudgeReport): string {
  const total = sent - waiting
  if (sent === 0) return t('reports.nudges.leadEmpty')
  if (total === 0) return t('reports.nudges.leadNone')
  if (total === 1) return t('reports.nudges.leadOne', { n: cameBack })
  return t('reports.nudges.lead', { n: cameBack, total })
}

/** The visit average slipped members fall under, as the takeaway's words say. */
const SLIPPED_UNDER = 2

/** The first week the slipped members' average is under 2 a week, else the chart's plain title. */
export function visitsLead(rows: readonly WeekVisitsRow[]): string {
  const week = rows.find((r) => r.slipped !== null && r.slipped < SLIPPED_UNDER)
  return week ? t('reports.visits.lead', { n: week.week }) : t('reports.visits.title')
}

const DAYS = ['day90', 'day60', 'day30'] as const

/**
 * The latest join month with a day 90 share, else the latest with day 60, else day 30, else the plain title. `month`
 * formats 'YYYY-MM' in the gym's locale (useGymFormat). A share of 100% is no finding, and a share above the same
 * month's earlier one would claim more members were still coming than the day before it showed, so neither leads.
 */
export function cohortsLead(cohorts: readonly CohortRow[], month: (yyyyMm: string) => string): string {
  const latestFirst = [...cohorts].sort((a, b) => b.month.localeCompare(a.month))
  for (const [i, day] of DAYS.entries()) {
    const row = latestFirst.find((c) => headline(c, i))
    const share = row?.[day]
    if (row && share != null) {
      return t('reports.cohorts.lead', { n: share, month: month(row.month), day: Number(day.slice(3)) })
    }
  }
  return t('reports.cohorts.title')
}

/** Whether the row's share at DAYS[i] can be the title: under 100%, and no higher than its earlier days' shares. */
function headline(row: CohortRow, i: number): boolean {
  const share = row[DAYS[i]!]
  if (share === null || share >= 100) return false
  return DAYS.slice(i + 1).every((earlier) => row[earlier] === null || share <= row[earlier])
}
