// GET /api/reports (owner only): @tenure/domain's buildReports on the wire (FR-REPORT-01, FR-REPORT-03). Months,
// weeks and the nudge window are counted in the gym's time zone; the screen writes them in the gym's locale.
import { REPORTS_LINE } from '@tenure/domain'
import { z } from 'zod'

/** A whole percent, 0 to 100. */
const Percent = z.int().min(0).max(100)

/**
 * One joining month. dayN: the percent of the month's members who are N or more days in and visited in days N-7 to
 * N-1; null while none of them is N days in.
 */
export const CohortRow = z.object({
  /** 'YYYY-MM', in the gym's time zone. */
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  /** Members who joined that month, archived ones included. */
  joined: z.int().nonnegative(),
  day30: Percent.nullable(),
  day60: Percent.nullable(),
  day90: Percent.nullable(),
})
export type CohortRow = z.infer<typeof CohortRow>

/**
 * One week of the visits chart: the mean visits in week `week` (1 to 13) of the members who have
 * finished it; week 13 is days 84 to 89, six days, so its mean is scaled by 7/6 to read as a 7-day week. Split by a visit in the last 14 days (still coming) or not (slipped). One decimal; null when that group has
 * nobody in it.
 */
export const WeekVisitsRow = z.object({
  week: z.int().min(1).max(13),
  stillComing: z.number().nonnegative().nullable(),
  slipped: z.number().nonnegative().nullable(),
})
export type WeekVisitsRow = z.infer<typeof WeekVisitsRow>

/**
 * Nudges sent in the last 90 days (the gym's dates) up to now, by the nudges log's outcomes: `cameBack` (a visit within
 * 7 days), `waiting` (still inside the 7 days, no visit yet), and the rest, which had no visit.
 */
export const NudgeReport = z.object({
  sent: z.int().nonnegative(),
  cameBack: z.int().nonnegative(),
  waiting: z.int().nonnegative(),
  /** The percent of the nudges past their 7 days that came back, waiting ones left out; null when none is past. */
  rate: Percent.nullable(),
})
export type NudgeReport = z.infer<typeof NudgeReport>

export const ReportsResponse = z.object({
  /** From the gym's first month to the current one, the last four at most, oldest first. */
  cohorts: z.array(CohortRow).min(1).max(4),
  /** Weeks 1 to 13, in order. */
  visitsByWeek: z.array(WeekVisitsRow).length(13),
  /** The line drawn across the visits chart: 3 visits a week. */
  line: z.literal(REPORTS_LINE),
  nudges: NudgeReport,
})
export type ReportsResponse = z.infer<typeof ReportsResponse>
