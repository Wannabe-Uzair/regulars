import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { HeadingLevel } from '../Panel/Panel.tsx'
import styles from './EmptyState.module.css'

export type EmptyStateProps = {
  title: ReactNode
  /** Defaults to 2. */
  headingLevel?: HeadingLevel
  body?: ReactNode
  /** Usually one Button. */
  action?: ReactNode
  /** An icon above the title, e.g. `<UserPlusIcon />`: hidden from assistive technology, since the title says it. */
  symbol?: ReactNode
  className?: string
}

/** What a list or board shows when there is nothing in it yet, and the step that fills it. */
export function EmptyState({ title, headingLevel = 2, body, action, symbol, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const

  return (
    <div className={clsx(styles.empty, className)}>
      {symbol != null && (
        <span className={styles.symbol} aria-hidden="true">
          {symbol}
        </span>
      )}
      <Heading className={styles.title}>{title}</Heading>
      {body != null && <p className={styles.body}>{body}</p>}
      {action != null && <div className={styles.action}>{action}</div>}
    </div>
  )
}
