import clsx from 'clsx'
import { useId, type ReactNode } from 'react'
import { FieldContext } from './field-context.ts'
import styles from './Field.module.css'

export type FieldProps = {
  label: ReactNode
  hint?: ReactNode
  /**
   * When set, the control is marked invalid and this line is read with it. The line is a polite live region that is
   * always there, so an error that arrives later, after an async check say, is announced.
   */
  error?: ReactNode
  /** One control: Input, Select or Textarea. It takes the Field's id, so set none on it. */
  children: ReactNode
  className?: string
}

/** A label, an optional hint, one control and an optional error, wired together for assistive technology. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  const controlId = `${id}control`
  const hintId = hint == null ? undefined : `${id}hint`
  const hasError = error != null
  const errorId = `${id}error`
  const describedBy = [hintId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className={clsx(styles.field, className)}>
      <label className={styles.label} htmlFor={controlId}>
        {label}
      </label>
      {hintId && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      <FieldContext value={{ controlId, describedBy, invalid: hasError }}>{children}</FieldContext>
      {/* Empty, it is taken out of the column so it adds no gap, but stays in the tree as a live region. */}
      <p className={clsx(styles.error, !hasError && styles.errorEmpty)} id={errorId} aria-live="polite">
        {error}
      </p>
    </div>
  )
}
