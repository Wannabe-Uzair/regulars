import clsx from 'clsx'
import type { ReactNode } from 'react'
import { popClass } from '../motion/pop.ts'
import styles from './Marks.module.css'

/**
 * A week's mark on the board: 3+ visits (`full`), 1–2 (`some`), none (`none`), the week in progress under 3 so far
 * (`outline`), and a week not reached yet (`future`).
 */
export type MarkKind = 'full' | 'some' | 'none' | 'outline' | 'future'

/** `sm` 0.75 rem (legends), `md` 1 rem and 0.875 rem below 768 px (the board), `lg` 1.75 rem. */
export type MarkSize = 'sm' | 'md' | 'lg'

export type MarkProps = {
  kind: MarkKind
  /** What a screen reader hears, e.g. "Week 3: 2 visits". Without one the mark is decorative and hidden. */
  label?: string
  /** One of a slipping member's last two finished weeks: an edge in the attention colour. */
  flag?: boolean
  /** A check-in just filled it: it pops once. Give it a new key to pop again. */
  fresh?: boolean
  /** Defaults to `md`. */
  size?: MarkSize
  className?: string
}

/** One week's mark, an image named by its label. */
export function Mark({ kind, label, flag = false, fresh = false, size = 'md', className }: MarkProps) {
  const named = label !== undefined
  return (
    <span
      className={clsx(styles.mark, styles[size], fresh && popClass, className)}
      data-mark={kind}
      data-flag={flag ? '' : undefined}
      {...(named ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  )
}

export type WeekMark = { kind: MarkKind; label: string; flag?: boolean; fresh?: boolean }

export type WeekMarksProps = {
  /** One member's weeks in order, usually 13. */
  cells: readonly WeekMark[]
  /** Names the row of marks as a group, e.g. "Sam O.'s 13 weeks". */
  label?: string
  size?: MarkSize
  className?: string
}

/** One member's weeks in a row, each mark labelled. */
export function WeekMarks({ cells, label, size, className }: WeekMarksProps) {
  return (
    <span
      className={clsx(styles.week, className)}
      {...(label === undefined ? {} : { role: 'group', 'aria-label': label })}
    >
      {cells.map((cell, w) => (
        <Mark key={w} kind={cell.kind} label={cell.label} flag={cell.flag} fresh={cell.fresh} size={size} />
      ))}
    </span>
  )
}

export type MarkLegendItem = { kind: MarkKind; label: ReactNode; flag?: boolean }

export type MarkLegendProps = { items: readonly MarkLegendItem[]; className?: string }

/** What the marks mean, as one wrapping line. The marks carry their own labels, so it is hidden from assistive tech. */
export function MarkLegend({ items, className }: MarkLegendProps) {
  return (
    <ul className={clsx(styles.legend, className)} aria-hidden="true">
      {items.map((item, i) => (
        <li key={i}>
          <Mark kind={item.kind} flag={item.flag} size="sm" />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** A day of the first 90: visited, a past day without a visit, or a day not reached yet. */
export type DayKind = 'visited' | 'missed' | 'ahead'

export type DaysGridProps = {
  /** Day 1 first, at most 90. */
  days: readonly DayKind[]
  /** What a screen reader hears, e.g. "12 visits in the first 40 days". */
  label: string
  /** Numbers the weeks 1 to 13 above their columns, hidden from assistive technology: the label says it all. */
  weekNumbers?: boolean
  /** The week in progress, 1 to 13: its column is ringed in the in-progress week's outline (flow-5C). */
  currentWeek?: number
  className?: string
}

const cell = 10
const gap = cell / 4
const step = cell + gap
const weeks = 13
const weekdays = 7
/** The row the week numbers sit in, above the days, and their size, in the grid's units. */
const numberRow = 9.5
const numberSize = 6.5
/** The current week's ring runs down the middle of the gaps either side of its column. */
const ring = gap / 2
/** Room around the grid for the ring, so the first and last weeks' rings aren't clipped. */
const ringRoom = ring + 1

/**
 * One member's 90 days as 13 weeks across by 7 days down, one image named by its label. In the board's marks: visited
 * is a full mark, a missed day an outline in the input-border line, and a day ahead the future mark.
 */
export function DaysGrid({ days, label, weekNumbers = false, currentWeek, className }: DaysGridProps) {
  const width = weeks * step - gap
  const height = weekdays * step - gap
  const top = weekNumbers ? numberRow : 0
  const ringed = currentWeek !== undefined && Number.isInteger(currentWeek) && currentWeek >= 1 && currentWeek <= weeks
  const pad = ringed ? ringRoom : 0
  return (
    <svg
      className={clsx(styles.days, className)}
      viewBox={`${-pad} ${-pad} ${width + 2 * pad} ${top + height + 2 * pad}`}
      role="img"
      aria-label={label}
      focusable="false"
    >
      {weekNumbers && (
        <g aria-hidden="true">
          {Array.from({ length: weeks }, (_, w) => (
            <text
              key={w}
              className={styles.weekNumber}
              x={w * step + cell / 2}
              y={numberSize}
              fontSize={numberSize}
              textAnchor="middle"
            >
              {w + 1}
            </text>
          ))}
        </g>
      )}
      {ringed && (
        <rect
          className={styles.currentWeek}
          data-current-week={currentWeek}
          x={(currentWeek - 1) * step - ring}
          y={top - ring}
          width={cell + 2 * ring}
          height={height + 2 * ring}
          rx={2}
        />
      )}
      {days.slice(0, 90).map((kind, i) => {
        const x = Math.floor(i / weekdays) * step
        const y = top + (i % weekdays) * step
        // An outline is drawn inside its square, so every day takes the same room.
        const inset = kind === 'missed' ? 0.5 : 0
        return (
          <rect
            key={i}
            className={styles.day}
            data-day={kind}
            x={x + inset}
            y={y + inset}
            width={cell - 2 * inset}
            height={cell - 2 * inset}
            rx={1}
          />
        )
      })}
    </svg>
  )
}
