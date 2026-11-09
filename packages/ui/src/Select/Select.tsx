import clsx from 'clsx'
import type { ComponentProps } from 'react'
import { useFieldControl } from '../Field/field-context.ts'
import styles from './Select.module.css'

export type SelectProps = ComponentProps<'select'> & {
  /** Goes on the wrapper around the select and its arrow, which sizes it, e.g. to set a width. */
  wrapperClassName?: string
}

/**
 * A native select with its arrow drawn in the text colour. Pass the options as children. Inside a Field it is
 * labelled and described by it. `className` goes on the select itself, as on Input and Textarea.
 */
export function Select({ className, wrapperClassName, children, ...props }: SelectProps) {
  return (
    <span className={clsx(styles.wrap, wrapperClassName)}>
      <select {...useFieldControl(props)} className={clsx(styles.select, className)}>
        {children}
      </select>
      <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4 6l4 4 4-4" />
      </svg>
    </span>
  )
}
