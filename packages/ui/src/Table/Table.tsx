import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './Table.module.css'

/** The ground the table sits on, which a sticky first column paints itself with so rows slide under it. */
export type TableGround = 'surface' | 'bg' | 'raised'

export type TableProps = {
  /** Names the table's scroll region, e.g. "Members". */
  label: string
  /** The table's rows: a `<thead>` of `<th scope="col">` and a `<tbody>`. Mark number cells with `data-numeric`. */
  children: ReactNode
  /** Holds the first column (the names) at the start edge while the rest scrolls sideways. */
  stickyFirstColumn?: boolean
  /** Defaults to `surface`, as in a Card or Panel. */
  ground?: TableGround
  className?: string
}

/**
 * A data table in one named scroll region, focusable so it scrolls sideways from the keyboard. Column headers are
 * sentence-case labels, rows are divided by lines, and `data-numeric` cells line up at the end in tabular figures.
 */
export function Table({ label, children, stickyFirstColumn = false, ground = 'surface', className }: TableProps) {
  return (
    <div className={clsx(styles.scroll, className)} role="region" aria-label={label} tabIndex={0} data-ground={ground}>
      <table className={clsx(styles.table, stickyFirstColumn && styles.sticky)}>{children}</table>
    </div>
  )
}
