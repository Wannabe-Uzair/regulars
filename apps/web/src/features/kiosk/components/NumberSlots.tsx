import type { CSSProperties } from 'react'
import { numberSlots } from '../keypad.ts'
import styles from './NumberSlots.module.css'

/**
 * The widths the font size is fitted with, in em of Inter 600's tabular figures: a digit's slot (1ch and its gap) and
 * a separator at its widest ("+"). Overestimates, so the longest number, 15 digits after a "+", still fits the column.
 */
const SLOT_EM = 0.72
const MARK_EM = 0.62

/**
 * The typed number in slots (FR-KIOSK-02, kiosk-1): every character of the gym's grouping shows, each digit over its
 * own rule, separators bare; then empty slots, a rule with no text, up to the usual length. So the text inside is
 * exactly the formatted number. It shrinks to fit the column, and keeps its height, so nothing under it moves.
 */
export function NumberSlots({ value, country }: { value: string; country: string }) {
  const { filled, empty } = numberSlots(value, country)
  const width = filled.reduce((sum, slot) => sum + (slot.digit ? SLOT_EM : MARK_EM), empty * SLOT_EM)
  return (
    <span className={styles.number} style={{ '--number-em': width } as CSSProperties}>
      {filled.map((slot, i) => (
        <span key={i} className={slot.digit ? styles.slot : styles.mark}>
          {slot.char}
        </span>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`empty-${i}`} className={styles.empty} aria-hidden="true" data-slot="empty" />
      ))}
    </span>
  )
}
