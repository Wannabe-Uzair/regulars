import clsx from 'clsx'
import type { ComponentProps, ReactNode } from 'react'
import { StatusDot } from '../StatusDot/StatusDot.tsx'
import { Tag } from '../Tag/Tag.tsx'
import type { MemberStatus } from './status.ts'
import styles from './StatusTag.module.css'

export type { MemberStatus } from './status.ts'

export type StatusTagProps = Omit<ComponentProps<'span'>, 'children'> & {
  status: MemberStatus
  /** The visible label. Status is never shown by colour alone. */
  children: ReactNode
}

/** A Tag with the board's mark for the status. Slipping takes the attention mark and attention text. */
export function StatusTag({ status, className, children, ...rest }: StatusTagProps) {
  return (
    <Tag {...rest} data-status={status} className={clsx(styles.status, styles[status], className)}>
      <StatusDot status={status} />
      {children}
    </Tag>
  )
}
