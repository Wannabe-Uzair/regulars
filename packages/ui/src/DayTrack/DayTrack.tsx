import clsx from 'clsx'
import styles from './DayTrack.module.css'

export type DayTrackProps = {
  /** Today's day, from 1. */
  day: number
  /** The days in all. Defaults to the pilot's 90. */
  of?: number
  className?: string
}

/**
 * The days so far as one bar, filled to `day` of `of`. Hidden from assistive technology: the words beside it ("Pilot
 * day 24 of 90") say the day.
 */
export function DayTrack({ day, of = 90, className }: DayTrackProps) {
  const share = of > 0 ? Math.min(1, Math.max(0, day / of)) : 0
  return (
    <div className={clsx(styles.track, className)} aria-hidden="true">
      <div className={styles.fill} style={{ inlineSize: `${(share * 100).toFixed(2)}%` }} />
    </div>
  )
}
