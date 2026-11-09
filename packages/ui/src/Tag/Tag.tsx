import clsx from 'clsx'
import type { ComponentProps } from 'react'
import styles from './Tag.module.css'

export type TagProps = ComponentProps<'span'>

/** A small neutral label. */
export function Tag({ className, ...rest }: TagProps) {
  return <span {...rest} className={clsx(styles.tag, className)} />
}
