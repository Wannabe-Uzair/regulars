import clsx from 'clsx'
import { useId, type ReactNode } from 'react'
import styles from './Kpi.module.css'

export type KpiProps = {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  /** `attention` for the slipping count. */
  emphasis?: 'attention'
  className?: string
}

/** One headline figure: a label, the value in tabular numbers and an optional hint, grouped under the label. */
export function Kpi({ label, value, hint, emphasis, className }: KpiProps) {
  const labelId = useId()

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className={clsx(styles.kpi, emphasis === 'attention' && styles.attention, className)}
    >
      <span className={styles.label} id={labelId}>
        {label}
      </span>
      <span className={styles.value} data-numeric="">
        {value}
      </span>
      {hint != null && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
