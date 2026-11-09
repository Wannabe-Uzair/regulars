import clsx from 'clsx'
import type { ComponentProps, MouseEvent } from 'react'
import { CheckIcon } from '../icons/CheckIcon.tsx'
import { Spinner } from '../Spinner/Spinner.tsx'
import { buttonClass } from './button-class.ts'
import styles from './Button.module.css'

/**
 * Every variant is a capsule. `primary` is a screen's one main action (the tint fill), `secondary` the rest (an edge),
 * `quiet` low-key actions (text words, no fill), `plain` tint words with no fill (a sheet's Cancel, Show All, the kiosk's
 * Join), `tinted` the pale tint capsule for actions repeated in rows (Nudge) and the sheet's channels, `danger` a
 * destructive action on a page (red edge and words), and `destructive` an alert's destructive confirm (the red fill,
 * white words: ConfirmDialog's danger tone). `attention` is a deprecated alias of `tinted`, kept until the screens switch.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'quiet'
  | 'plain'
  | 'tinted'
  | 'danger'
  | 'destructive'
  | 'attention'
/**
 * `md` and `sm` are at least 44 px tall, for touch; `sm` has a 14 px label and less padding, for rows. `lg` is the
 * kiosk's, 64 px tall at 21 px.
 */
export type ButtonSize = 'lg' | 'md' | 'sm'

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Working: ignores clicks at once and sets aria-busy, staying focusable. For 400 ms (`--delay-busy`) it keeps its fill
   * and its words, so pass the working words ("Logging in") as its children; only if it's still busy then does the
   * spinner fade in over the label, which keeps the width and the accessible name (pick F2).
   */
  loading?: boolean
  /**
   * Done: a check springs in before the children, and the button stays enabled at its width. The caller swaps the
   * words ("Nudged") and the accessible name; pass `variant="quiet"` too if the done state should settle quietly.
   */
  done?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  done = false,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      // Also stops a submit button from submitting its form.
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      aria-disabled={loading || undefined}
      {...rest}
      type={type}
      className={clsx(buttonClass({ variant, size }), loading && styles.loading, className)}
      aria-busy={loading || undefined}
      onClick={handleClick}
    >
      <span className={styles.content}>
        {done && <CheckIcon className={styles.check} />}
        {children}
      </span>
      {loading && (
        <span className={styles.spinner}>
          <Spinner />
        </span>
      )}
    </button>
  )
}
