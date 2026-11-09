import type { NudgeReport } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { RollingNumber } from '@tenure/ui'
import styles from './NudgeBar.module.css'

type Part = { key: 'back' | 'none' | 'waiting'; label: string; count: number; className: string | undefined }

/**
 * The nudges sent as one part-to-whole bar (FR-REPORT-01): came back, no visit in 7 days, still waiting, in that
 * order, each part as long as its count; a part of 0 is left out, and none sent draws nothing. Colour is never the
 * only cue (NFR-USE-05): came back is solid text, no visit a lighter fill, still waiting an outline, and the legend
 * under it names each part with its count. Screen readers get the whole bar as one sentence.
 */
export function NudgeBar({ nudges }: { nudges: NudgeReport }) {
  const { sent, cameBack, waiting } = nudges
  if (sent === 0) return null
  const noVisit = sent - cameBack - waiting
  const parts: Part[] = [
    { key: 'back', label: t('reports.nudges.cameBack'), count: cameBack, className: styles.back },
    { key: 'none', label: t('reports.nudges.noVisit'), count: noVisit, className: styles.none },
    { key: 'waiting', label: t('reports.nudges.waiting'), count: waiting, className: styles.waiting },
  ]

  return (
    <div className={styles.nudgeBar}>
      <div
        className={styles.bar}
        role="img"
        aria-label={t('a11y.nudgeBar', { sent, back: cameBack, none: noVisit, waiting })}
      >
        {parts
          .filter((p) => p.count > 0)
          .map((p) => (
            <span
              key={p.key}
              className={`${styles.part} ${p.className ?? ''}`}
              style={{ flexGrow: p.count }}
              data-part={p.key}
            />
          ))}
      </div>
      <ul className={styles.legend} aria-hidden="true">
        {parts.map((p) => (
          <li key={p.key} className={styles.item}>
            <span className={`${styles.swatch} ${p.className ?? ''}`} />
            <span className={styles.label}>{p.label}</span>
            <span className={styles.count}>
              <RollingNumber value={p.count} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
