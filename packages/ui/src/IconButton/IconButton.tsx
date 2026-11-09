import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Button, type ButtonProps, type ButtonSize } from '../Button/Button.tsx'
import styles from './IconButton.module.css'

export type IconButtonProps = Omit<ButtonProps, 'children' | 'aria-label' | 'aria-labelledby' | 'size'> & {
  /** `md` (44 px square, for touch) or `sm`. The kiosk's `lg` is for labelled buttons only. */
  size?: Exclude<ButtonSize, 'lg'>
  /** The accessible name. The icon itself is hidden from assistive technology. */
  label: string
  /** The icon, usually an inline SVG. */
  children: ReactNode
}

/** A square button with an icon and no visible text. Same variants and sizes as Button; quiet by default. */
export function IconButton({ label, variant = 'quiet', size = 'md', className, children, ...rest }: IconButtonProps) {
  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      aria-label={label}
      className={clsx(styles.icon, styles[size], className)}
    >
      <span className={styles.glyph} aria-hidden="true">
        {children}
      </span>
    </Button>
  )
}
