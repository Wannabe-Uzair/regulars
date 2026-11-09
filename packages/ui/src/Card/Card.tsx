import clsx from 'clsx'
import type { ComponentProps } from 'react'
import styles from './Card.module.css'

export type CardProps = ComponentProps<'div'>

/** A surface with a line edge, a large radius and padding. */
export function Card({ className, ...rest }: CardProps) {
  return <div {...rest} className={clsx(styles.card, className)} />
}
