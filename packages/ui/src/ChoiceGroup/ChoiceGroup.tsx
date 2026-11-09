import clsx from 'clsx'
import { useId, type ReactNode } from 'react'
import { StatusDot } from '../StatusDot/StatusDot.tsx'
import type { MemberStatus } from '../StatusTag/status.ts'
import styles from './ChoiceGroup.module.css'

/**
 * `segmented` is one capsule, for two- and three-way choices (Members' views, the theme, the import's kind). `chips`
 * are separate pills that wrap, for the status filter.
 */
export type ChoiceLook = 'segmented' | 'chips'

export type ChoiceOption<V extends string> = {
  value: V
  label: ReactNode
  /** A status's dot before the label, for the status filter's chips. Hidden from assistive technology. */
  dot?: MemberStatus
}

export type ChoiceGroupProps<V extends string> = {
  /** The group's name, shown above it in Field's label style, e.g. "Status". */
  label: string
  /** Keeps the name for assistive technology but doesn't show it, where the screen's heading already says it. */
  hideLabel?: boolean
  options: readonly ChoiceOption<V>[]
  /** The chosen option. */
  value: V
  onChange: (value: V) => void
  /** Defaults to `segmented`. */
  look?: ChoiceLook
  /** `md` (the default) keeps 44 px options; `lg` is the kiosk's, 64 px options at 21 px ("Phone Number | Name"). */
  size?: 'md' | 'lg'
  /** Equal segments across the full width, rather than each as wide as its words. */
  stretch?: boolean
  className?: string
}

/**
 * One choice of a few: a radio group of native radios, so Tab reaches the chosen option and the arrow keys move the
 * choice. The chosen option takes the main-button colours.
 */
export function ChoiceGroup<V extends string>({
  label,
  hideLabel = false,
  options,
  value,
  onChange,
  look = 'segmented',
  size = 'md',
  stretch = false,
  className,
}: ChoiceGroupProps<V>) {
  const id = useId()
  const labelId = `${id}label`

  return (
    <div className={clsx(styles.group, className)} role="radiogroup" aria-labelledby={labelId}>
      <span className={clsx(styles.label, hideLabel && styles.hidden)} id={labelId}>
        {label}
      </span>
      <div
        className={clsx(styles[look], size === 'lg' && styles.lg, stretch && styles.stretch)}
        data-look={look}
        data-size={size}
        data-stretch={stretch || undefined}
      >
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              className={styles.hidden}
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.dot && <StatusDot status={option.dot} className={styles.dot} />}
            {option.label}
          </label>
        ))}
      </div>
    </div>
  )
}
