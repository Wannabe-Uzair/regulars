import { IconButton, type IconButtonProps } from '../IconButton/IconButton.tsx'
import { useTheme } from '../theme/context.ts'

export type ThemeToggleProps = Omit<IconButtonProps, 'label' | 'children' | 'onClick'> & {
  /** The accessible name while the light theme is on, e.g. "Switch to dark". */
  toDarkLabel: string
  /** The accessible name while the dark theme is on, e.g. "Switch to light". */
  toLightLabel: string
}

const sun = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

const moon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
  </svg>
)

/**
 * The header switch: flips between light and dark, leaving "same as device". It shows where it goes (the moon in
 * light, the sun in dark), and its name says so, so it is a plain button rather than a pressed toggle.
 */
export function ThemeToggle({ toDarkLabel, toLightLabel, ...rest }: ThemeToggleProps) {
  const { resolved, setChoice } = useTheme()
  const toDark = resolved === 'light'
  return (
    <IconButton
      {...rest}
      label={toDark ? toDarkLabel : toLightLabel}
      onClick={() => setChoice(toDark ? 'dark' : 'light')}
    >
      {toDark ? moon : sun}
    </IconButton>
  )
}
