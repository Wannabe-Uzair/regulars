// The welcome's words (FR-KIOSK-05). The server names which headline and line to show; these pick the copy.
import type { KioskWelcome } from '@tenure/contracts'
import { t } from '@tenure/copy'

/** The countdown back to the start: "Ready for the next member in {n}.", 5 to 1. */
export const WELCOME_SECONDS = 5

/** "Welcome, {first}. Day 1 of 90.", "Welcome back, {first}. Week {n}." or, from day 90, "Welcome back, {first}." */
export function welcomeHeadline(w: KioskWelcome): string {
  const first = w.firstName
  if (w.greeting === 'first') return t('kiosk.welcome.first', { first })
  if (w.greeting === 'plain') return t('kiosk.welcome.plain', { first })
  return t('kiosk.welcome.back', { first, n: w.weekNumber })
}

/** The visits line; "On the line this week." is emphasised. */
export function welcomeLine(w: KioskWelcome): { text: string; emphasised: boolean } {
  if (w.visitsLine === 'line') return { text: t('kiosk.welcome.line'), emphasised: true }
  if (w.visitsLine === 'visit') return { text: t('kiosk.welcome.visit'), emphasised: false }
  return { text: t('kiosk.welcome.visits', { n: w.visitsThisWeek }), emphasised: false }
}
