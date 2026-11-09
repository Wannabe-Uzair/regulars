/**
 * The icons are Phosphor 2.1.1 (MIT, its LICENSE beside them), Regular and Fill, each path copied as drawn
 * (ARCHITECTURE §9 "Icons"). Each draws in `currentColor` at 1em, so `color` and `font-size` set it, and is hidden from
 * assistive technology: the control's accessible name or the words beside it carry the meaning.
 */
export type IconProps = { className?: string }

export type IconWeight = 'regular' | 'fill'

/** For the icons that come in both weights (the tabs and the account): Regular by default. */
export type WeightedIconProps = IconProps & { weight?: IconWeight }

/** The shell every icon shares: one path on Phosphor's 256-unit grid. */
export function Icon({ className, d }: IconProps & { d: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
