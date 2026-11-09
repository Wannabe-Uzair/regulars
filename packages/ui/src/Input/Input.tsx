import clsx from 'clsx'
import type { ComponentProps } from 'react'
import { useFieldControl } from '../Field/field-context.ts'
import styles from './Input.module.css'

export type InputProps = ComponentProps<'input'>

/** A native input. Inside a Field it is labelled and described by it; alone, give it an aria-label. */
export function Input({ className, ...props }: InputProps) {
  return <input {...useFieldControl(props)} className={clsx(styles.input, className)} />
}
