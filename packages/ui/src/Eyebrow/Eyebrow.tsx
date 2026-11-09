import clsx from 'clsx'
import type { ReactNode } from 'react'
import styles from './Eyebrow.module.css'

export type EyebrowProps = {
  children: ReactNode
  /** The element to render. `p` by default. */
  as?: 'p' | 'span' | 'div'
  className?: string
}

/** The small label above a heading, a sentence-case footnote in the label tokens. */
export function Eyebrow({ children, as: Element = 'p', className }: EyebrowProps) {
  return <Element className={clsx(styles.eyebrow, className)}>{children}</Element>
}
