import clsx from 'clsx'
import type { CSSProperties } from 'react'
import styles from './RollingNumber.module.css'

export type RollingNumberProps = {
  /** A figure (`12`, `'25%'`) or a sentence with figures in it (`'2 of 12 new members are slipping'`). */
  value: number | string
  className?: string
}

/** A word with a digit in it ("12", "25%", "1,204"): its digits roll, the word never breaks. */
const FIGURE = /(\S*\d\S*)/

/**
 * Figures that roll to their value like a counter, digit by digit in tabular figures, on the smooth spring: from 0 when
 * they first show, then from the old value to the new one whenever it changes (a live check-in). Words around the
 * figures stay as they are. The text in the DOM is the final value only: each figure's moving digits are drawn by CSS
 * in an aria-hidden face, and its words sit beside it, visually hidden, so screen readers and tests never meet the roll.
 * Under Reduce Motion the springs are 0 ms (base.css), so the value appears at once.
 */
export function RollingNumber({ value, className }: RollingNumberProps) {
  // With its capture group, split() puts the figures at the odd indexes. Each figure is keyed by its place counted from
  // the end of the sentence, so one that changes keeps its digits' elements and rolls rather than appearing anew, and
  // the total, last in every headline form, keeps its columns when "1 of 61 …" becomes "None of the 61 …".
  const parts = String(value).split(FIGURE)
  const figures = (parts.length - 1) / 2
  return (
    <span className={clsx(styles.rolling, className)}>
      {parts.map((part, i) => (i % 2 === 1 ? <Figure key={`f${figures - (i - 1) / 2}`} text={part} /> : part))}
    </span>
  )
}

function Figure({ text }: { text: string }) {
  const chars = [...text]
  // Digits are keyed by place value from the right (ones, tens…), so 9 to 12 rolls the ones and adds the tens.
  let place = chars.filter((c) => /\d/.test(c)).length
  return (
    <span className={styles.figure}>
      <span className={styles.text}>{text}</span>
      <span aria-hidden="true">
        {chars.map((c, i) => {
          if (!/\d/.test(c)) return <span key={`c${chars.length - i}`} className={styles.char} data-char={c} />
          place -= 1
          return (
            <span
              key={`d${place}`}
              className={styles.digit}
              data-digit={c}
              style={{ '--digit': Number(c) } as CSSProperties}
            />
          )
        })}
      </span>
    </span>
  )
}
