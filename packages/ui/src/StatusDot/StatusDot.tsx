import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { MemberStatus } from '../StatusTag/status.ts'
import styles from './StatusDot.module.css'

export type StatusDotProps = { status: MemberStatus; className?: string }

/**
 * The four status marks (ARCHITECTURE §9) on a 12-unit grid, each drawn in `currentColor`: a filled dot for on the line,
 * a half ring (its left half filled) for below the line, an empty ring for new, and a falling triangle for slipping.
 */
const shapes: Record<MemberStatus, ReactNode> = {
  on: <circle cx="6" cy="6" r="5" fill="currentColor" />,
  below: (
    <>
      <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1A5 5 0 0 0 6 11Z" fill="currentColor" />
    </>
  ),
  new: <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  slipping: (
    <path d="M1 1.7h10L6 10.3Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
  ),
}

/** A status's mark, hidden from assistive technology: the words beside it carry the status. */
export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <svg
      className={clsx(styles.dot, className)}
      data-status={status}
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      {shapes[status]}
    </svg>
  )
}
