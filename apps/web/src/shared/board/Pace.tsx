import styles from './board.module.css'
import { paceText } from './pace-text.ts'

/** The board's pace column (FR-BOARD-01), in tabular figures so the column lines up. */
export function Pace({ pace }: { pace: number | null }) {
  return <span className={styles.pace}>{paceText(pace)}</span>
}
