import { t } from '@tenure/copy'
import { MarkLegend, type MarkLegendItem } from '@tenure/ui'
import styles from './board.module.css'

/** Today's short board: one line. */
const compact: MarkLegendItem[] = [
  { kind: 'full', label: t('board.legend.3') },
  { kind: 'some', label: t('board.legend.low') },
  { kind: 'none', label: t('board.legend.none') },
  { kind: 'some', label: t('status.slipping'), flag: true },
  { kind: 'outline', label: t('board.legend.week') },
]

/** The board's own page: every mark in full words. */
const full: MarkLegendItem[] = [
  { kind: 'full', label: t('board.legend.3') },
  { kind: 'some', label: t('board.legend.12') },
  { kind: 'none', label: t('board.legend.0') },
  { kind: 'some', label: t('status.slipping'), flag: true },
  { kind: 'outline', label: t('board.legend.now') },
  { kind: 'future', label: t('board.legend.future') },
]

export type BoardLegendProps = {
  /** `compact` under Today's short board; `full` on the board, with the line saying what counts. */
  look?: 'compact' | 'full'
  className?: string
}

/**
 * What the marks mean (FR-BOARD-01). The marks carry their own labels, so the legend itself is hidden from assistive
 * technology; the full legend's line about what counts is read.
 */
export function BoardLegend({ look = 'compact', className }: BoardLegendProps) {
  if (look === 'compact') return <MarkLegend items={compact} className={className} />
  return (
    <div className={className ? `${styles.legend} ${className}` : styles.legend}>
      <MarkLegend items={full} />
      <p className={styles.note}>{t('status.note')}</p>
    </div>
  )
}
