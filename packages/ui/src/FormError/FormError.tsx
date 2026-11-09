import clsx from 'clsx'
import styles from './FormError.module.css'

export type FormErrorProps = {
  /** The failure, in words. Nothing shows without one. */
  message?: string
  /** Changes on every submit (a count or a time), so the same message after another try is announced again. */
  submittedAt?: number
  className?: string
}

/** The line for a failure that belongs to no one field, e.g. above a form's submit button. An alert, in danger. */
export function FormError({ message, submittedAt, className }: FormErrorProps) {
  if (message === undefined) return null
  return (
    <p key={submittedAt} className={clsx(styles.error, className)} role="alert">
      {message}
    </p>
  )
}
