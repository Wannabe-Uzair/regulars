import clsx from 'clsx'
import type { CSSProperties } from 'react'
import styles from './Logo.module.css'

/**
 * What names the logo: `name`, the wordmark, when it is shown; otherwise `label`, on the mark alone; otherwise nothing,
 * and it is decorative. The two can't be given together. Passed both anyway (from untyped code), `name` names it.
 */
export type LogoProps = {
  /** The mark's width and height in px. The name beside it scales with it. */
  size?: number
  className?: string
} & (
  | {
      /** The product name beside the mark, live text from `brand.name`. It is then the accessible name and the mark is hidden. */
      name: string
      label?: never
    }
  | {
      name?: never
      /** The accessible name of the mark when it stands alone. Without `name` or `label` the logo is decorative. */
      label?: string
    }
)

/**
 * The Quarter mark (ARCHITECTURE §9, "Logo"): a filled quarter circle in `text` on a 24-unit grid, with an L-shaped gap
 * holding one rounded square in `logo-dot`, the board's own week mark (90 days is a quarter). The gap is baked into the
 * quarter's path, with no SVG mask, so it shows on any ground. Decorative inside a link that has its own name; give it
 * `label` when it stands alone.
 */
export function Logo({ size = 28, name, label, className }: LogoProps) {
  const named = name === undefined && label !== undefined
  const mark = (
    <svg
      className={styles.mark}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...(named ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <path className={styles.quarter} d="M4.4 13.3V4.4A15.2 15.2 0 0 1 19.6 19.6H10.7V13.3Z" />
      <rect className={styles.square} x="4.4" y="14.6" width="5" height="5" rx="1.3" />
    </svg>
  )
  return (
    <span className={clsx(styles.logo, className)} style={{ '--logo-size': `${size}px` } as CSSProperties}>
      {mark}
      {name !== undefined && <span className={styles.wordmark}>{name}</span>}
    </span>
  )
}
