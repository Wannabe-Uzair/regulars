import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './FactList.module.css'

export type Fact = {
  /** The fact's name, e.g. "Coach". Shown as written, in the label tokens. */
  label: ReactNode
  value: ReactNode
  /** A control beside the value, e.g. an Edit button. */
  action?: ReactNode
}

export type FactListProps = { items: readonly Fact[]; className?: string }

/** Facts as a description list: each name in the label style above its value, with an optional action at the end. */
export function FactList({ items, className }: FactListProps) {
  return (
    <dl className={clsx(styles.facts, className)}>
      {items.map((fact, i) => (
        <div key={i} className={styles.fact}>
          <dt className={styles.label}>{fact.label}</dt>
          <dd className={styles.value}>
            <span className={styles.text}>{fact.value}</span>
            {fact.action != null && <span className={styles.action}>{fact.action}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
