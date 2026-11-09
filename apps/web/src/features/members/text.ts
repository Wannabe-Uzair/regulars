// What Members and the member page say about a member, from its summary.
import type { MemberSummary } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { WINDOW_DAYS } from '@tenure/domain'

/** "Sam Okafor", or a single name alone ("Leo"): Members and the member page show full names (answers.md, 7 Nov). */
export const fullName = (m: Pick<MemberSummary, 'firstName' | 'lastName'>): string =>
  m.lastName === '' ? m.firstName : `${m.firstName} ${m.lastName}`

/** From day 90 a member shows "Past 90 days" instead of a status (answers.md, 7 Nov). */
export const isPast90 = (m: Pick<MemberSummary, 'daysSinceJoin'>): boolean => m.daysSinceJoin >= WINDOW_DAYS

/** The week in progress, counted from 1: "Week 4 of 13", "4 / 13". */
export const weekNumber = (m: Pick<MemberSummary, 'week'>): number => m.week + 1

/** "1.0/wk", as the board writes it, or the empty mark before the first week ends. */
export const paceWords = (pace: number | null): string =>
  pace === null ? t('common.none') : t('member.pace', { x: pace.toFixed(1) })

/**
 * The phone row's meta line, "Week 6 of 13 · 1.8/wk · 9 days ago". Before the first week ends there is no pace, and the
 * line leaves it out ("Week 1 of 13 · Yesterday") rather than setting a dash between two dots.
 */
export function rowMeta(m: Pick<MemberSummary, 'week' | 'pace' | 'daysSinceLastVisit'>): string {
  const week = t('member.week', { n: weekNumber(m) })
  const last = lastVisitShort(m.daysSinceLastVisit)
  return m.pace === null
    ? t('members.card.metaNoPace', { week, last })
    : t('members.card.meta', { week, pace: paceWords(m.pace), last })
}

/** The list's last-visit cell: "Today", "Yesterday", "11 days ago" or "No visits yet". */
export function lastVisitShort(days: number | null): string {
  if (days === null) return t('member.lastVisit.never')
  if (days === 0) return t('members.last.today')
  if (days === 1) return t('members.last.yesterday')
  return t('members.last.days', { n: days })
}

/** The member page's head row: "Last visit 9 days ago", with the today, yesterday and no-visit forms. */
export function lastVisitLong(days: number | null): string {
  if (days === null) return t('member.lastVisit.never')
  if (days === 0) return t('member.lastVisit.today')
  if (days === 1) return t('member.lastVisit.yesterday')
  return t('member.lastVisit', { n: days })
}
