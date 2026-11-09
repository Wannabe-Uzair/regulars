// A member's 13 week marks on the board (FR-BOARD-01): which mark each week gets, and what a screen reader hears.
import type { MemberSummary } from '@tenure/contracts'
import { t } from '@tenure/copy'
import type { WeekMark } from '@tenure/ui'

export const WEEKS = 13

/** One week's mark, with a React key that changes when a check-in fills it, so the mark mounts again and pops. */
export type BoardCell = WeekMark & { key: string }

/** What the marks read from a MemberSummary. */
export type WeeksMember = Pick<MemberSummary, 'week' | 'status'> & { weeks: readonly number[] }

/**
 * The 13 marks: finished weeks are full (3+ visits), some (1–2) or none; the week in progress is full at 3 and an
 * outline below; weeks not reached yet are future. Only a slipping member's last two finished weeks are flagged.
 * `fresh` names the check-in that just filled the week in progress (FR-BOARD-03): that mark pops, and pops again for
 * the next one, since each check-in gives it a new key.
 */
export function weekCells(member: WeeksMember, fresh?: string): BoardCell[] {
  return Array.from({ length: WEEKS }, (_, w): BoardCell => {
    const n = w + 1
    const visits = member.weeks[w]
    if (w > member.week || visits === undefined) {
      return { key: String(w), kind: 'future', label: t('a11y.cell.future', { n }) }
    }
    if (w === member.week) {
      return {
        key: fresh === undefined ? String(w) : `${w}@${fresh}`,
        kind: visits >= 3 ? 'full' : 'outline',
        label: visits === 1 ? t('a11y.cell.nowOne', { n }) : t('a11y.cell.now', { n, v: visits }),
        fresh: fresh !== undefined,
      }
    }
    return {
      key: String(w),
      kind: visits >= 3 ? 'full' : visits >= 1 ? 'some' : 'none',
      label:
        visits === 0
          ? t('a11y.cell.none', { n })
          : visits === 1
            ? t('a11y.cell.one', { n })
            : t('a11y.cell.visits', { n, v: visits }),
      flag: member.status === 'slipping' && w >= member.week - 2,
    }
  })
}
