import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import styles from './Skeleton.module.css'

export type SkeletonShape = 'line' | 'lines' | 'block' | 'row'

export type SkeletonProps = {
  /**
   * `line` (the default): one line of text in the surrounding type, its line box high, so it stands exactly where the
   * words will. `lines`: `count` of them, the last one shorter. `block`: a rounded box the `className` sizes (a mark, a
   * chart, a button). `row`: a list row, a name in the surrounding type over its 14 px meta line (or `count` of them).
   */
  shape?: SkeletonShape
  /** How many lines `lines` draws (2 by default), or a row's meta lines (1 by default). */
  count?: number
  /** The inline size of a line, the lines or a row's name: any CSS length (`8em`, `60%`). Defaults to the full width. */
  width?: string
  className?: string
}

/**
 * A placeholder shape in the layout of the content it stands for, while a screen loads: the `skeleton` fill, one step
 * off the card. After `--delay-busy` it pulses slowly to `--opacity-skeleton-pulse` and back, each way over
 * `--motion-linger`, which base.css zeroes under reduced motion, so there it stays still at full fill. Always hidden
 * from assistive technology: the SkeletonGroup round it says "Loading" once.
 */
export function Skeleton({ shape = 'line', count, width, className }: SkeletonProps) {
  const style = width === undefined ? undefined : ({ '--skeleton-width': width } as CSSProperties)
  if (shape === 'lines') {
    return (
      <span aria-hidden="true" className={clsx(styles.lines, className)} style={style}>
        {Array.from({ length: count ?? 2 }, (_, i) => (
          <span key={i} className={styles.line} />
        ))}
      </span>
    )
  }
  if (shape === 'row') {
    return (
      <span aria-hidden="true" className={clsx(styles.row, className)} style={style}>
        <span className={clsx(styles.line, styles.name)} />
        {Array.from({ length: count ?? 1 }, (_, i) => (
          <span key={i} className={clsx(styles.line, styles.meta)} />
        ))}
      </span>
    )
  }
  return <span aria-hidden="true" className={clsx(styles[shape], className)} style={style} />
}

export type SkeletonGroupProps = {
  /**
   * What is loading, said once to assistive technology as a status ("Loading…"). Leave it out where the page already
   * says so, as the member page's h1 does.
   */
  label?: string
  /** The layout of the placeholder content: give it the class the loaded content's container has. */
  className?: string
  children: ReactNode
}

/**
 * A loading region: `aria-busy`, with one status naming the wait, round placeholder content that is inert and hidden (out
 * of the tab order, the accessibility tree and the pointer's way, so a placeholder row neither focuses nor highlights).
 */
export function SkeletonGroup({ label, className, children }: SkeletonGroupProps) {
  return (
    <div className={styles.group} aria-busy="true">
      {label !== undefined && (
        <span role="status" className={styles.label}>
          {label}
        </span>
      )}
      {/* Inert, and hidden outright too, for assistive technology that doesn't know inert yet. */}
      <div inert aria-hidden="true" className={className}>
        {children}
      </div>
    </div>
  )
}
