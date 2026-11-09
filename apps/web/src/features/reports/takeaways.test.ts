import type { CohortRow, WeekVisitsRow } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { describe, expect, test } from 'vitest'
import { cohortsLead, nudgesLead, visitsLead } from './takeaways.ts'

const weeks = (slipped: (number | null)[]): WeekVisitsRow[] =>
  slipped.map((s, i) => ({ week: i + 1, stillComing: 3, slipped: s }))
const cohort = (month: string, day30: number | null, day60: number | null, day90: number | null): CohortRow => ({
  month,
  joined: 10,
  day30,
  day60,
  day90,
})
const month = (yyyyMm: string) => `<${yyyyMm}>`

describe('takeaways', () => {
  test("FR-REPORT-01 the nudges' title counts those past their 7 days, in its many, one, none and empty forms", () => {
    expect(nudgesLead({ sent: 12, cameBack: 5, waiting: 2, rate: 50 })).toBe(
      t('reports.nudges.lead', { n: 5, total: 10 }),
    )
    expect(nudgesLead({ sent: 2, cameBack: 1, waiting: 1, rate: 100 })).toBe(t('reports.nudges.leadOne', { n: 1 }))
    expect(nudgesLead({ sent: 1, cameBack: 0, waiting: 1, rate: null })).toBe(t('reports.nudges.leadNone'))
    expect(nudgesLead({ sent: 0, cameBack: 0, waiting: 0, rate: null })).toBe(t('reports.nudges.leadEmpty'))
  })

  test('FR-REPORT-01 the visits title falls back to Visits by Week when no slipped week is under 2', () => {
    expect(visitsLead(weeks([null, 2.5, 1.9, 1.2]))).toBe(t('reports.visits.lead', { n: 3 }))
    expect(visitsLead(weeks([null, 2, 2.5, null]))).toBe(t('reports.visits.title'))
    expect(visitsLead(weeks([null, null]))).toBe(t('reports.visits.title'))
  })

  test('FR-REPORT-01 the cohorts title takes the latest month with a day 90 share, else 60, else 30, else Cohorts', () => {
    const lead = (n: number, m: string, day: number) => t('reports.cohorts.lead', { n, month: `<${m}>`, day })
    const all = [
      cohort('2026-07', 80, 65, 50),
      cohort('2026-08', 75, 60, 45),
      cohort('2026-09', 70, 55, null),
      cohort('2026-10', 68, null, null),
    ]
    expect(cohortsLead(all, month)).toBe(lead(45, '2026-08', 90))
    // Latest by month, whatever order the rows come in.
    expect(cohortsLead([...all].reverse(), month)).toBe(lead(45, '2026-08', 90))
    expect(cohortsLead(all.slice(2), month)).toBe(lead(55, '2026-09', 60))
    expect(cohortsLead(all.slice(3), month)).toBe(lead(68, '2026-10', 30))
    // A share of 0 is still a finding.
    expect(cohortsLead([cohort('2026-10', 0, null, null)], month)).toBe(lead(0, '2026-10', 30))
    expect(cohortsLead([cohort('2026-11', null, null, null)], month)).toBe(t('reports.cohorts.title'))
  })

  test('FR-REPORT-01 the cohorts title never leads with 100%, nor with a share that rose since the earlier day', () => {
    const lead = (n: number, m: string, day: number) => t('reports.cohorts.lead', { n, month: `<${m}>`, day })
    // The demo's table on 8 Nov: Aug's day 90 is 100% (and above its day 60), Sep's day 60 is above its day 30.
    const demo = [
      cohort('2026-08', 100, 91, 100),
      cohort('2026-09', 62, 75, null),
      cohort('2026-10', 80, null, null),
      cohort('2026-11', null, null, null),
    ]
    expect(cohortsLead(demo, month)).toBe(lead(91, '2026-08', 60))
    // A rise under 100% doesn't lead either; the next latest month that holds does.
    expect(cohortsLead([cohort('2026-07', 80, 70, 60), cohort('2026-08', 70, 60, 65)], month)).toBe(
      lead(60, '2026-07', 90),
    )
    // When nothing holds, the plain title.
    expect(cohortsLead([cohort('2026-10', 100, null, null)], month)).toBe(t('reports.cohorts.title'))
  })
})
