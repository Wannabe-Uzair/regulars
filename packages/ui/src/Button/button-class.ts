import clsx from 'clsx'
import type { ButtonSize, ButtonVariant } from './Button.tsx'
import styles from './Button.module.css'

export type ButtonClassOptions = { variant?: ButtonVariant; size?: ButtonSize }

/**
 * The Button's look for a variant and size, as a class list, so a link that stands on its own can look like a button
 * and keep the link role: `<Link className={buttonClass({ size: 'sm' })} to="/signup">`. `secondary` is the quiet
 * outlined button. Button takes its own classes from here, so the two can't drift apart. `attention`, deprecated, gives
 * `tinted`'s classes.
 */
export function buttonClass({ variant = 'secondary', size = 'md' }: ButtonClassOptions = {}): string {
  return clsx(styles.button, styles[variant === 'attention' ? 'tinted' : variant], styles[size])
}
