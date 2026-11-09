import type { KioskWelcome } from '@tenure/contracts'
import { t } from '@tenure/copy'
import { popClass } from '@tenure/ui'
import { classes } from '../classes.ts'
import { useEffect, useState } from 'react'
import { WELCOME_SECONDS, welcomeHeadline, welcomeLine } from '../welcome.ts'
import styles from './Welcome.module.css'

/**
 * The welcome after a check-in or a join (FR-KIOSK-05, flow-2B): a check draws itself inside this week's ring, the
 * headline under it, then the visits line, which enters with ui's pop, and a countdown from 5 back to the start. A tap
 * anywhere returns at once. Mount it with a new key for each welcome, so the check, the ring, the pop and the
 * countdown start again.
 */
export function Welcome({ welcome, onDone }: { welcome: KioskWelcome; onDone: () => void }) {
  const [left, setLeft] = useState(WELCOME_SECONDS)
  useEffect(() => {
    const id = setInterval(() => setLeft((n) => n - 1), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (left <= 0) onDone()
  }, [left, onDone])

  const line = welcomeLine(welcome)
  return (
    // A tap anywhere on the welcome is the same as waiting; the keyboard has Escape and any digit.
    <div className={styles.welcome} onClick={onDone}>
      <WeekRing visits={welcome.visitsThisWeek} />
      <div role="status" className={styles.words}>
        <h1 className={styles.headline}>{welcomeHeadline(welcome)}</h1>
        <p className={classes(styles.line, line.emphasised && styles.emphasised, popClass)}>{line.text}</p>
      </div>
      <p className={styles.reset}>{t('kiosk.reset', { n: Math.max(left, 1) })}</p>
    </div>
  )
}

/** The ring's three thirds, each 120° of the circle (the circles' pathLength is 360), from the top, clockwise. */
const THIRDS = [0, 1, 2] as const
/** The gap between thirds while the ring is open, in degrees; at 3 visits they meet and the ring closes. */
const GAP = 12

/**
 * One ring of this week's visits (FR-KIOSK-05, motion-1): a third a visit in the tint on a tint-fill track, closed at
 * 3, with the check drawn inside it. The check draws on the smooth spring; then today's third fills on the bouncy one.
 * Hidden from screen readers: the visits line says the same.
 */
export function WeekRing({ visits }: { visits: number }) {
  const filled = Math.min(Math.max(visits, 0), 3)
  const closed = filled === 3
  const gap = closed ? 0 : GAP
  return (
    <svg
      className={styles.ring}
      viewBox="0 0 176 176"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-visits={filled}
    >
      <g transform="rotate(-90 88 88)">
        {THIRDS.map((i) => (
          <circle
            key={i}
            className={classes(
              styles.third,
              i < filled && styles.filled,
              // Today's visit is the last filled third; past 3 the ring is already closed, so nothing fills.
              visits <= 3 && i === filled - 1 && styles.today,
            )}
            cx="88"
            cy="88"
            r="76"
            pathLength="360"
            strokeDasharray={`${120 - gap} ${240 + gap}`}
            strokeDashoffset={-(120 * i + gap / 2)}
            data-third={i < filled ? 'filled' : 'empty'}
          />
        ))}
      </g>
      <path className={styles.check} d="M56 90 L78 112 L122 64" pathLength="100" />
    </svg>
  )
}
