import clsx from 'clsx'
import type { CSSProperties } from 'react'
import styles from './Spinner.module.css'

export type SpinnerProps = {
  /** What is working, for screen readers. Leave it out when the spinner sits inside something that says so. */
  label?: string
  className?: string
  /**
   * How long it waits before it shows, in ms: 400 (`--delay-busy`) by default, so a quick answer never flashes it.
   * Then it fades in over `--motion-fast`, or appears at once under reduced motion.
   */
  delay?: number
}

/**
 * A working indicator, sized to the surrounding text. With a `label` it is a status that screen readers announce;
 * without one it is decorative. It shows only after its delay (pick F2), hidden from screen readers until then too.
 * Under reduced motion it stops turning and shows a still ellipsis instead.
 */
export function Spinner({ label, className, delay }: SpinnerProps) {
  const style = delay === undefined ? undefined : ({ '--spinner-delay': `${delay}ms` } as CSSProperties)
  const graphic = (
    <svg className={styles.graphic} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g className={styles.ring}>
        <circle className={styles.track} cx="12" cy="12" r="9" />
        <path className={styles.arc} d="M12 3a9 9 0 0 1 9 9" />
      </g>
      <g className={styles.dots}>
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </g>
    </svg>
  )

  if (label === undefined) {
    return (
      <span className={clsx(styles.spinner, className)} style={style} aria-hidden="true">
        {graphic}
      </span>
    )
  }

  return (
    <span className={clsx(styles.spinner, className)} style={style} role="status">
      {graphic}
      <span className={styles.label}>{label}</span>
    </span>
  )
}
