// The free pilot (SPEC FR-BILL-01, FR-SHELL-03): its length and which day of it a gym is on. Dates are 'YYYY-MM-DD'
// in the gym's time zone; the caller passes today.
import { addDays, daysBetween } from './dates.ts'

/** The pilot is 90 days long. */
export const PILOT_DAYS = 90

/** The pilot's last day, day 90: 89 days after its start. */
export function pilotEndsOn(startedOn: string): string {
  return addDays(startedOn, PILOT_DAYS - 1)
}

/** The pilot has ended from day 91 on: today is after its day 90. (The sidebar drops its pilot line then; Billing says it ended.) */
export function pilotEnded(startedOn: string, today: string): boolean {
  return today > pilotEndsOn(startedOn)
}

/** The pilot day, 1 to PILOT_DAYS: its start is day 1, and every day from day 90 on is 90. */
export function pilotDay(startedOn: string, today: string): number {
  return Math.min(Math.max(daysBetween(startedOn, today) + 1, 1), PILOT_DAYS)
}
