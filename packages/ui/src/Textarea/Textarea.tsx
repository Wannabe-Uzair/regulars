import clsx from 'clsx'
import type { ComponentProps } from 'react'
import { useFieldControl } from '../Field/field-context.ts'
import styles from './Textarea.module.css'

export type TextareaProps = ComponentProps<'textarea'>

/** A native textarea that grows vertically. Inside a Field it is labelled and described by it. */
export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea {...useFieldControl(props)} className={clsx(styles.textarea, className)} />
}
